import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOPTEX_BASE = "https://api.toptex.io";

// ── Helpers ──

function ml(obj: unknown, fallback = ""): { fr: string; en: string; nl: string } {
  if (!obj) return { fr: fallback, en: "", nl: "" };
  // Handle stringified JSON like '{"fr":"...","en":"..."}'
  if (typeof obj === "string") {
    try {
      const parsed = JSON.parse(obj);
      if (parsed && typeof parsed === "object") {
        return { fr: parsed.fr || fallback, en: parsed.en || "", nl: parsed.nl || "" };
      }
    } catch { /* not JSON, use as-is */ }
    return { fr: obj || fallback, en: "", nl: "" };
  }
  if (typeof obj !== "object") return { fr: String(obj || fallback), en: "", nl: "" };
  const o = obj as Record<string, string>;
  return { fr: o.fr || fallback, en: o.en || "", nl: o.nl || "" };
}

async function toptexAuth(): Promise<string> {
  const res = await fetch(`${TOPTEX_BASE}/v3/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": Deno.env.get("TOPTEX_API_KEY")! },
    body: JSON.stringify({ username: Deno.env.get("TOPTEX_USERNAME")!, password: Deno.env.get("TOPTEX_PASSWORD")! }),
  });
  if (!res.ok) throw new Error(`TopTex auth failed [${res.status}]`);
  return (await res.json()).token;
}

function hdrs(token: string): Record<string, string> {
  return { "x-api-key": Deno.env.get("TOPTEX_API_KEY")!, "x-toptex-authorization": token };
}

// ── Main ──

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleData } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "super_admin").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: super_admin required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "sync";
    const token = await toptexAuth();

    // ── Action: list brands ──
    if (action === "brands") {
      const res = await fetch(`${TOPTEX_BASE}/v3/attributes?attributes=brand`, { headers: hdrs(token) });
      if (!res.ok) throw new Error(`Brands fetch failed [${res.status}]`);
      const data = await res.json();
      return new Response(JSON.stringify({ brands: data?.items?.[0]?.brand || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Action: sync brands ──
    const brands: string[] = body.brands;
    if (!brands?.length) {
      return new Response(JSON.stringify({ error: "brands[] required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalCreated = 0, totalUpdated = 0, totalErrors = 0;
    const now = new Date().toISOString();

    for (const brand of brands) {
      console.log(`Syncing brand: ${brand}`);

      try {
        // Paginate catalog: fetch all pages
        let page = 1;
        const PAGE_SIZE = 50;
        const allProducts: any[] = [];

        while (true) {
          const url = `${TOPTEX_BASE}/v3/products/all?brand=${encodeURIComponent(brand)}&usage_right=b2b_uniquement&page_number=${page}&page_size=${PAGE_SIZE}`;
          const res = await fetch(url, { headers: hdrs(token) });
          if (!res.ok) {
            console.error(`Catalog page ${page} failed for ${brand}: ${res.status}`);
            break;
          }
          const data = await res.json();
          const items = data?.items || (Array.isArray(data) ? data : [data]);
          if (!items.length) break;
          allProducts.push(...items);
          
          const totalCount = data?.total_count || items.length;
          if (page * PAGE_SIZE >= totalCount) break;
          page++;
        }

        console.log(`Brand ${brand}: ${allProducts.length} products fetched`);

        // Build price map from price endpoint (paginated)
        const priceMap = new Map<string, number>();
        let pricePage = 1;
        while (true) {
          const url = `${TOPTEX_BASE}/v3/products/price?brand=${encodeURIComponent(brand)}&page_number=${pricePage}&page_size=1000`;
          const res = await fetch(url, { headers: hdrs(token) });
          if (!res.ok) break;
          const data = await res.json();
          const items = Array.isArray(data) ? data : data?.items || [];
          if (!items.length) break;

          for (const p of items) {
            if (!p?.catalogReference || !p?.prices?.length) continue;
            const ref = p.catalogReference;
            // Use qty=1 price tier
            const tier = p.prices.find((t: any) => t.quantity === 1 || t.quantity === "1") || p.prices[0];
            const price = parseFloat(String(tier.price));
            if (!priceMap.has(ref) || price < priceMap.get(ref)!) {
              priceMap.set(ref, price);
            }
          }

          const totalCount = data?.total_count || items.length;
          if (pricePage * 1000 >= totalCount) break;
          pricePage++;
        }

        // Group ALL items by catalogReference to collect variant info
        const byRef = new Map<string, any[]>();
        for (const item of allProducts) {
          const ref = item.catalogReference;
          if (!ref) continue;
          if (!byRef.has(ref)) byRef.set(ref, []);
          byRef.get(ref)!.push(item);
        }

        for (const [ref, items] of byRef) {
          try {
            const product = items[0]; // Use first item for product-level info

            // ── Name (multilingual) ──
            const designation = ml(product.designation, ref);

            // ── Category: family > sub_family ──
            const family = ml(product.family);
            const subfamily = ml(product.sub_family || product.subfamily);
            const categoryParts = [family.fr, subfamily.fr].filter(Boolean);
            const category = categoryParts.join(" > ") || "Textile";

            // ── Description (multilingual) ──
            const desc = ml(product.description);

            // ── Extract variant colors and sizes from ALL SKU items ──
            const colorMap = new Map<string, { color: string; hex: string | null; image_url: string | null }>();
            const sizeSet = new Set<string>();
            let firstImage: string | null = null;

            for (const item of items) {
              // Color: TopTex uses colorLabel / color / colorCode at item level
              const colorName = item.colorLabel || item.color || item.colorCode || null;
              if (colorName && !colorMap.has(colorName)) {
                // Try to find an image for this color
                let colorImage: string | null = null;
                const packshots = item.packshots || item.images;
                if (packshots) {
                  if (Array.isArray(packshots) && packshots.length) {
                    colorImage = packshots[0].url_image || packshots[0].url || packshots[0].imageUrl || null;
                  } else if (typeof packshots === "object") {
                    const face = packshots.FACE || packshots.face || Object.values(packshots)[0] as any;
                    if (face) colorImage = face.url_packshot || face.url || face.imageUrl || null;
                  }
                }
                if (!colorImage) colorImage = item.url_image || item.imageUrl || item.image || null;

                colorMap.set(colorName, {
                  color: colorName,
                  hex: item.hexColor || item.hexa || item.hex || item.colorHex || null,
                  image_url: colorImage,
                });
              }

              // Size: TopTex uses sizeLabel / size / sizeCode at item level
              const sizeName = item.sizeLabel || item.size || item.sizeCode || null;
              if (sizeName) sizeSet.add(sizeName);

              // Capture first available image as product image
              if (!firstImage) {
                const packshots = item.packshots || item.images;
                if (packshots) {
                  if (Array.isArray(packshots) && packshots.length) {
                    firstImage = packshots[0].url_image || packshots[0].url || packshots[0].imageUrl || null;
                  } else if (typeof packshots === "object") {
                    const face = packshots.FACE || packshots.face || Object.values(packshots)[0] as any;
                    if (face) firstImage = face.url_packshot || face.url || face.imageUrl || null;
                  }
                }
                if (!firstImage) firstImage = item.url_image || item.imageUrl || item.image || null;
              }
            }

            const variantColors = Array.from(colorMap.values());
            const variantSizes = Array.from(sizeSet);

            // ── Price ──
            const price = priceMap.get(ref) || 0;

            // ── Novelty: check createdDate ──
            let isNew = false;
            const created = product.createdDate;
            if (created) {
              const sixMonthsAgo = new Date();
              sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
              isNew = new Date(created) >= sixMonthsAgo;
            }

            const toptexId = `TT-${ref}`;

            const { data: existing } = await supabase
              .from("catalog_products")
              .select("id")
              .eq("midocean_id", toptexId)
              .maybeSingle();

            const payload = {
              name: designation.fr || designation.en || ref,
              name_en: designation.en || null,
              name_nl: designation.nl || null,
              sku: ref,
              category,
              description: desc.fr || null,
              description_en: desc.en || null,
              description_nl: desc.nl || null,
              image_url: firstImage || product.imageUrl || product.image || product.url_image || null,
              base_price: price,
              stock_qty: 0,
              is_new: isNew,
              release_date: created || null,
              last_synced_at: now,
              variant_colors: variantColors,
              variant_sizes: variantSizes,
            };

            if (existing) {
              await supabase.from("catalog_products").update(payload).eq("id", existing.id);
              totalUpdated++;
            } else {
              await supabase.from("catalog_products").insert({ ...payload, midocean_id: toptexId, active: true });
              totalCreated++;
            }
          } catch (e) {
            console.error(`Error processing ${ref}:`, e);
            totalErrors++;
          }
        }
      } catch (e) {
        console.error(`Error syncing brand ${brand}:`, e);
        totalErrors++;
      }
    }

    console.log(`TopTex sync: ${totalCreated} created, ${totalUpdated} updated, ${totalErrors} errors`);

    return new Response(
      JSON.stringify({ success: true, created: totalCreated, updated: totalUpdated, errors: totalErrors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("TopTex sync error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

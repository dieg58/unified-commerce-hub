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

function normalizeText(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const candidates = [
      obj.fr, obj.en, obj.nl, obj.de,
      obj.label, obj.name, obj.value,
      obj["fr-FR"], obj["en-GB"], obj["en-US"],
    ];
    for (const c of candidates) {
      const text = normalizeText(c);
      if (text) return text;
    }
  }
  return null;
}

function normalizeHex(value: unknown): string | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    const first = value.find(Boolean);
    return normalizeHex(first);
  }
  const raw = normalizeText(value);
  if (!raw) return null;
  const cleaned = raw.replace(/^#/, "").trim();
  if (!cleaned) return null;
  return cleaned;
}

function normalizeCatalogReference(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;
  const normalized = text.replace(/^TT-/i, "").trim().toUpperCase();
  return normalized || null;
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

/** Fetch with retry (up to 3 attempts) for TopTex 504/503 errors */
async function fetchRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(url, options);
    if (res.ok || (res.status < 500 && res.status !== 429)) return res;
    console.warn(`Attempt ${attempt}/${retries} failed for ${url}: ${res.status}`);
    if (attempt < retries) await new Promise(r => setTimeout(r, 2000 * attempt));
  }
  return fetch(url, options); // final attempt, return whatever happens
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
      const res = await fetchRetry(`${TOPTEX_BASE}/v3/attributes?attributes=brand`, { headers: hdrs(token) });
      if (!res.ok) throw new Error(`Brands fetch failed [${res.status}]`);
      const data = await res.json();
      return new Response(JSON.stringify({ brands: data?.items?.[0]?.brand || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Action: fix_brands — patch brand for all TT- products with null brand ──
    if (action === "fix_brands") {
      console.log("fix_brands: starting");

      // 1. Get all TT- products with null brand from DB (paginated)
      const nullBrandProducts: Array<{ id: string; sku: string; midocean_id: string | null }> = [];
      const PAGE_SIZE_DB = 1000;
      let from = 0;
      while (true) {
        const to = from + PAGE_SIZE_DB - 1;
        const { data: batch, error: dbErr } = await supabase
          .from("catalog_products")
          .select("id, sku, midocean_id")
          .like("midocean_id", "TT-%")
          .is("brand", null)
          .range(from, to);

        if (dbErr) throw new Error(`DB query error: ${dbErr.message}`);
        if (!batch?.length) break;

        nullBrandProducts.push(...batch);
        if (batch.length < PAGE_SIZE_DB) break;
        from += PAGE_SIZE_DB;
      }

      if (!nullBrandProducts.length) {
        return new Response(JSON.stringify({ success: true, message: "No products with missing brand", fixed: 0 }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`fix_brands: ${nullBrandProducts.length} products with null brand`);

      // 2. Build map of normalized catalog reference -> product ids
      const refToIds = new Map<string, Set<string>>();
      const addRef = (ref: string | null, id: string) => {
        if (!ref) return;
        if (!refToIds.has(ref)) refToIds.set(ref, new Set<string>());
        refToIds.get(ref)!.add(id);
      };
      for (const p of nullBrandProducts) {
        addRef(normalizeCatalogReference(p.sku), p.id);
        addRef(normalizeCatalogReference(p.midocean_id), p.id);
      }

      // 3. Get all available brands
      const brandsRes = await fetchRetry(`${TOPTEX_BASE}/v3/attributes?attributes=brand`, { headers: hdrs(token) });
      if (!brandsRes.ok) throw new Error(`Brands fetch failed [${brandsRes.status}]`);
      const brandsData = await brandsRes.json();
      const allBrands: string[] = brandsData?.items?.[0]?.brand || [];
      console.log(`fix_brands: ${allBrands.length} brands to check`);

      let totalFixed = 0;
      const remainingRefs = new Set(refToIds.keys());

      for (const brandName of allBrands) {
        if (remainingRefs.size === 0) break;

        let page = 1;
        const PAGE_SIZE = 100;

        while (true) {
          const url = `${TOPTEX_BASE}/v3/products/all?brand=${encodeURIComponent(brandName)}&usage_right=b2b_uniquement&page_number=${page}&page_size=${PAGE_SIZE}`;
          const res = await fetchRetry(url, { headers: hdrs(token) });
          if (!res.ok) {
            console.warn(`fix_brands: page ${page} failed for ${brandName}: ${res.status}`);
            break;
          }
          const data = await res.json();
          const items = data?.items || (Array.isArray(data) ? data : [data]);
          if (!items.length) break;

          // Collect matching product IDs for this batch
          const idsToUpdate = new Set<string>();
          for (const item of items) {
            const ref = normalizeCatalogReference(item.catalogReference);
            if (ref && remainingRefs.has(ref)) {
              const matchedIds = refToIds.get(ref);
              if (matchedIds) {
                for (const id of matchedIds) idsToUpdate.add(id);
              }
              remainingRefs.delete(ref);
            }
          }

          // Batch update brand for matched products
          if (idsToUpdate.size > 0) {
            const ids = Array.from(idsToUpdate);
            const { error: updateErr } = await supabase
              .from("catalog_products")
              .update({ brand: brandName })
              .in("id", ids);
            if (!updateErr) {
              totalFixed += ids.length;
              console.log(`fix_brands: set brand="${brandName}" for ${ids.length} products`);
            } else {
              console.error(`fix_brands: update error for ${brandName}:`, updateErr.message);
            }
          }

          const totalCount = data?.total_count || items.length;
          if (page * PAGE_SIZE >= totalCount) break;
          page++;
        }
      }

      console.log(`fix_brands: done. Fixed ${totalFixed}, remaining ${remainingRefs.size} without brand`);

      return new Response(
        JSON.stringify({ success: true, fixed: totalFixed, remaining: remainingRefs.size }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
          const res = await fetchRetry(url, { headers: hdrs(token) });
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
          const res = await fetchRetry(url, { headers: hdrs(token) });
          if (!res.ok) break;
          const data = await res.json();
          const items = Array.isArray(data) ? data : data?.items || [];
          if (!items.length) break;

          for (const p of items) {
            if (!p?.catalogReference || !p?.prices?.length) continue;
            const ref = p.catalogReference;
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
            const product = items[0];

            // ── Name (multilingual) ──
            const designation = ml(product.designation, ref);

            // ── Category: family > sub_family ──
            const family = ml(product.family);
            const subfamily = ml(product.sub_family || product.subfamily);
            const categoryParts = [family.fr, subfamily.fr].filter(Boolean);
            const category = categoryParts.join(" > ") || "Textile";

            // ── Description (multilingual) ──
            const desc = ml(product.description);

            // ── Brand: prefer product data, fallback to loop variable ──
            const productBrand = normalizeText(product.brand) || brand;

            // ── Extract variant colors and sizes ──
            const colorMap = new Map<string, { color: string; hex: string | null; image_url: string | null }>();
            const sizeSet = new Set<string>();
            let firstImage: string | null = null;

            // 1) Try nested colors[] from first product
            const productColors = product.colors || [];
            for (const colorEntry of productColors) {
              const dominantColor = Array.isArray(colorEntry.colorsDominant)
                ? normalizeText(colorEntry.colorsDominant[0])
                : normalizeText(colorEntry.colorsDominant);
              const colorName =
                dominantColor
                || normalizeText(colorEntry.colors)
                || normalizeText(colorEntry.colorLabel)
                || normalizeText(colorEntry.color)
                || normalizeText(colorEntry.name);
              if (!colorName) continue;

              const hex = normalizeHex(colorEntry.colorsHexa) || normalizeHex(colorEntry.colorHexa) || normalizeHex(colorEntry.hex);

              let colorImage: string | null = null;
              const packshots = colorEntry.packshots;
              if (packshots) {
                const face = packshots.FACE || packshots.face;
                if (face) colorImage = face.url_packshot || face.url || null;
                if (!colorImage) {
                  const firstShot = Object.values(packshots)[0] as any;
                  if (firstShot) colorImage = firstShot.url_packshot || firstShot.url || null;
                }
              }

              if (!firstImage && colorImage) firstImage = colorImage;
              colorMap.set(colorName, { color: colorName, hex, image_url: colorImage });

              const sizes = colorEntry.sizes;
              if (Array.isArray(sizes)) {
                for (const s of sizes) {
                  const sizeName = normalizeText(s.sizeLabel) || normalizeText(s.size) || normalizeText(s.sizeCode);
                  if (sizeName) sizeSet.add(sizeName);
                }
              }
            }

            // 2) If no colors found from nested structure, aggregate from individual items
            if (colorMap.size === 0) {
              for (const item of items) {
                const colorName =
                  normalizeText(item.colorLabel)
                  || normalizeText(item.color)
                  || normalizeText(item.colour)
                  || normalizeText(item.colorName)
                  || normalizeText(item.color_name)
                  || normalizeText(item.colors)
                  || normalizeText(item.colorsLabel)
                  || normalizeText(item.colorDescription)
                  || normalizeText(item.attributes?.color);

                if (colorName && !colorMap.has(colorName)) {
                  const hex =
                    normalizeHex(item.colorHexa)
                    || normalizeHex(item.colorsHexa)
                    || normalizeHex(item.hexColor)
                    || normalizeHex(item.colorHex)
                    || normalizeHex(item.hex)
                    || normalizeHex(item.attributes?.colorHex);

                  let img: string | null = null;
                  if (item.packshots) {
                    const face = item.packshots.FACE || item.packshots.face;
                    if (face) img = face.url_packshot || face.url || null;
                    if (!img) {
                      const firstShot = Object.values(item.packshots)[0] as any;
                      if (firstShot) img = firstShot.url_packshot || firstShot.url || null;
                    }
                  }
                  if (!img && Array.isArray(item.images) && item.images.length) {
                    const firstImg = item.images[0] as any;
                    img = firstImg?.url_image || firstImg?.url || null;
                  }
                  if (!img) img = item.imageUrl || item.image || item.url_image || null;
                  if (!firstImage && img) firstImage = img;
                  colorMap.set(colorName, { color: colorName, hex, image_url: img });
                }

                const sizeName =
                  normalizeText(item.sizeLabel)
                  || normalizeText(item.size)
                  || normalizeText(item.taille)
                  || normalizeText(item.sizeCode)
                  || normalizeText(item.attributes?.size);
                if (sizeName) sizeSet.add(sizeName);
              }
            }

            // 3) Fallback image
            if (!firstImage) {
              const imgs = product.images;
              if (Array.isArray(imgs) && imgs.length) {
                firstImage = (imgs[0] as any)?.url_image || (imgs[0] as any)?.url || null;
              }
            }

            // 4) Ensure at least one color variant
            if (colorMap.size === 0) {
              const fallbackImage = firstImage || product.imageUrl || product.image || product.url_image || null;
              colorMap.set("Standard", { color: "Standard", hex: null, image_url: fallbackImage });
            }

            const variantColors = Array.from(colorMap.values());
            const variantSizes = Array.from(sizeSet);

            // ── Price ──
            const price = priceMap.get(ref) || 0;

            // ── Novelty ──
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
              brand: productBrand,
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

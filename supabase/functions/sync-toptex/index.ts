import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOPTEX_BASE = "https://api.toptex.io";

async function toptexAuth(): Promise<string> {
  const apiKey = Deno.env.get("TOPTEX_API_KEY")!;
  const username = Deno.env.get("TOPTEX_USERNAME")!;
  const password = Deno.env.get("TOPTEX_PASSWORD")!;

  const res = await fetch(`${TOPTEX_BASE}/v3/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TopTex auth failed [${res.status}]: ${body.substring(0, 200)}`);
  }

  const data = await res.json();
  return data.token;
}

function toptexHeaders(token: string): Record<string, string> {
  return {
    "x-api-key": Deno.env.get("TOPTEX_API_KEY")!,
    "x-toptex-authorization": token,
    "Accept": "application/json",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const action = body.action || "sync";

    // Authenticate with TopTex
    const token = await toptexAuth();

    // Action: list brands
    if (action === "brands") {
      const res = await fetch(`${TOPTEX_BASE}/v3/attributes?attributes=brand`, {
        headers: toptexHeaders(token),
      });
      if (!res.ok) throw new Error(`Brands fetch failed [${res.status}]`);
      const data = await res.json();
      const brands = data?.items?.[0]?.brand || [];
      return new Response(JSON.stringify({ brands }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: sync specific brands
    const brands: string[] = body.brands;
    if (!brands || !Array.isArray(brands) || brands.length === 0) {
      return new Response(JSON.stringify({ error: "brands[] required for sync" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalCreated = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    const now = new Date().toISOString();

    for (const brand of brands) {
      console.log(`Syncing brand: ${brand}`);

      // Fetch catalog + prices for this brand
      const [catalogRes, priceRes] = await Promise.all([
        fetch(`${TOPTEX_BASE}/v3/products/all?brand=${encodeURIComponent(brand)}&usage_right=b2b_uniquement`, {
          headers: toptexHeaders(token),
        }),
        fetch(`${TOPTEX_BASE}/v3/products/price?brand=${encodeURIComponent(brand)}`, {
          headers: toptexHeaders(token),
        }),
      ]);

      if (!catalogRes.ok) {
        console.error(`Catalog fetch failed for brand ${brand}: ${catalogRes.status}`);
        totalErrors++;
        continue;
      }

      const catalogData = await catalogRes.json();
      const products = Array.isArray(catalogData) ? catalogData : catalogData?.items || [catalogData];

      // Build price map
      const priceMap = new Map<string, number>();
      if (priceRes.ok) {
        const priceData = await priceRes.json();
        const priceList = Array.isArray(priceData) ? priceData : priceData?.items || [priceData];
        for (const p of priceList) {
          if (p?.catalogReference && p?.prices?.length) {
            // Use first tier price (qty 1)
            const firstPrice = p.prices.find((pr: any) => pr.quantity === "1") || p.prices[0];
            if (firstPrice) {
              const ref = p.catalogReference;
              const existing = priceMap.get(ref);
              if (!existing || firstPrice.price < existing) {
                priceMap.set(ref, firstPrice.price);
              }
            }
          }
        }
      }

      // Group by catalogReference to aggregate at product level
      const productsByRef = new Map<string, any>();
      for (const item of products) {
        if (!item?.catalogReference) continue;
        const ref = item.catalogReference;
        if (!productsByRef.has(ref)) {
          productsByRef.set(ref, {
            catalogReference: ref,
            designation: item.designation || ref,
            brand: item.brand || brand,
            family: item.family || "",
            subfamily: item.subfamily || "",
            description: item.description || item.composition || null,
            image: item.mainImage || item.imageUrl || null,
            variants: [],
          });
        }
        productsByRef.get(ref)!.variants.push(item);
      }

      console.log(`Brand ${brand}: ${productsByRef.size} unique products`);

      for (const [ref, product] of productsByRef) {
        try {
          const category = [product.family, product.subfamily].filter(Boolean).join(" > ") || "Textile";
          const name = product.designation || ref;
          const imageUrl = product.image || product.variants[0]?.mainImage || null;
          const price = priceMap.get(ref) || 0;

          // Description from first variant with a description
          let description: string | null = null;
          for (const v of product.variants) {
            const d = v.description?.fr || v.description?.en || v.composition?.fr || v.composition?.en;
            if (d) { description = typeof d === "string" ? d : JSON.stringify(d); break; }
          }

          const toptexId = `TT-${ref}`;

          const { data: existing } = await supabase
            .from("catalog_products")
            .select("id")
            .eq("midocean_id", toptexId)
            .maybeSingle();

          const payload = {
            name,
            sku: ref,
            category,
            description,
            image_url: imageUrl,
            base_price: price,
            stock_qty: 0, // Stock fetched separately if needed
            is_new: false,
            last_synced_at: now,
          };

          if (existing) {
            await supabase.from("catalog_products").update(payload).eq("id", existing.id);
            totalUpdated++;
          } else {
            await supabase.from("catalog_products").insert({
              ...payload,
              midocean_id: toptexId,
              active: true,
            });
            totalCreated++;
          }
        } catch (e) {
          console.error(`Error processing ${ref}:`, e);
          totalErrors++;
        }
      }
    }

    console.log(`TopTex sync complete: ${totalCreated} created, ${totalUpdated} updated, ${totalErrors} errors`);

    return new Response(
      JSON.stringify({ success: true, created: totalCreated, updated: totalUpdated, errors: totalErrors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("TopTex sync error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

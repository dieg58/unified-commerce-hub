import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MIDOCEAN_BASE = "https://api.midocean.com/gateway";
const PRICE_MULTIPLIER = 1.81;

function parseEuroPrice(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") return parseFloat(val.replace(",", ".")) || 0;
  return 0;
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: super_admin required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const MIDOCEAN_API_KEY = Deno.env.get("MIDOCEAN_API_KEY");
    if (!MIDOCEAN_API_KEY) {
      return new Response(JSON.stringify({ error: "MIDOCEAN_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers: Record<string, string> = {
      "x-Gateway-APIKey": MIDOCEAN_API_KEY,
      "Accept": "application/json",
    };

    // Fetch products, stock, and prices in parallel
    console.log("Fetching Midocean data...");
    const [productsRes, stockRes, pricesRes] = await Promise.all([
      fetch(`${MIDOCEAN_BASE}/products/2.0?language=en`, { headers }),
      fetch(`${MIDOCEAN_BASE}/stock/2.0`, { headers }),
      fetch(`${MIDOCEAN_BASE}/pricelist/2.0`, { headers }),
    ]);

    if (!productsRes.ok) throw new Error(`Products API failed [${productsRes.status}]`);
    if (!stockRes.ok) throw new Error(`Stock API failed [${stockRes.status}]`);
    if (!pricesRes.ok) throw new Error(`Pricelist API failed [${pricesRes.status}]`);

    const productsData = await productsRes.json();
    const stockData = await stockRes.json();
    const pricesData = await pricesRes.json();

    // Build stock map: variant sku -> qty
    const stockMap = new Map<string, number>();
    const stockList = Array.isArray(stockData) ? stockData : stockData?.stock || [];
    for (const s of stockList) {
      const sku = s.sku || s.master_id;
      if (!sku) continue;
      stockMap.set(sku, (stockMap.get(sku) || 0) + Number(s.qty ?? s.quantity ?? 0));
    }

    // Build price map: variant sku -> price (parsed from comma format)
    const priceMap = new Map<string, number>();
    const priceList = Array.isArray(pricesData) ? pricesData : pricesData?.price || pricesData?.prices || [];
    for (const p of priceList) {
      const sku = p.sku || p.master_id;
      if (!sku) continue;
      priceMap.set(sku, parseEuroPrice(p.price));
    }

    // Process products
    const products = Array.isArray(productsData) ? productsData : productsData?.products || [];
    console.log(`Processing ${products.length} products...`);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    const now = new Date().toISOString();

    // Helper: find the best image URL from digital_assets (skip PDFs/docs)
    function findImageUrl(product: any): string | null {
      const imageExts = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
      const isImage = (url: string) => {
        const lower = url.toLowerCase();
        return imageExts.some((ext) => lower.includes(ext)) && lower.includes("/image/");
      };

      // Search across all variants for the best image
      if (product.variants) {
        for (const v of product.variants) {
          if (v.digital_assets) {
            for (const a of v.digital_assets) {
              if (a.url && isImage(a.url)) return a.url;
            }
          }
          // Also check variant-level image fields
          if (v.main_picture && isImage(v.main_picture)) return v.main_picture;
        }
      }
      // Check product-level fields
      if (product.main_picture && imageExts.some((e) => product.main_picture.toLowerCase().includes(e))) {
        return product.main_picture;
      }
      return null;
    }

    for (const product of products) {
      try {
        const masterCode = product.master_code;
        if (!masterCode) continue;

        // Skip non-product items: master codes starting with "4001" are typically catalogs/docs
        // Also skip if no variants at all
        if (!product.variants || product.variants.length === 0) {
          skipped++;
          continue;
        }

        const name = product.product_name || product.short_description || masterCode;
        const sku = masterCode;

        // Extract category from first variant — only use human-readable categories
        const firstVariant = product.variants[0];
        const catParts = [
          firstVariant?.category_level1,
          firstVariant?.category_level2,
          firstVariant?.category_level3,
        ].filter(Boolean);
        // If category looks like a numeric HS code (e.g. "8215 2010"), skip or use "general"
        const rawCategory = catParts.join(" > ") || "general";
        const category = /^\d/.test(rawCategory) ? "general" : rawCategory;

        // Find a real image URL (not PDF/document)
        const imageUrl = findImageUrl(product);

        // Aggregate stock across all variant SKUs
        let totalStock = 0;
        const variantSkus: string[] = [];
        if (product.variants) {
          for (const v of product.variants) {
            if (v.sku) {
              variantSkus.push(v.sku);
              totalStock += stockMap.get(v.sku) || 0;
            }
          }
        }

        // Best price across variants (lowest) * multiplier
        let bestPrice = 0;
        for (const vSku of variantSkus) {
          const p = priceMap.get(vSku);
          if (p !== undefined && (bestPrice === 0 || p < bestPrice)) {
            bestPrice = p;
          }
        }
        const finalPrice = Math.round(bestPrice * PRICE_MULTIPLIER * 100) / 100;

        const description = product.long_description || product.description || null;

        // Release date & novelty detection
        const releaseDate = product.release_date || firstVariant?.release_date || null;
        let isNew = false;
        if (releaseDate) {
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          isNew = new Date(releaseDate) >= sixMonthsAgo;
        }

        // Upsert by midocean_id
        const { data: existing } = await supabase
          .from("catalog_products")
          .select("id")
          .eq("midocean_id", masterCode)
          .maybeSingle();

        const payload = {
          name,
          sku,
          category,
          description,
          image_url: imageUrl,
          stock_qty: totalStock,
          base_price: finalPrice,
          is_new: isNew,
          release_date: releaseDate,
          last_synced_at: now,
        };

        if (existing) {
          await supabase.from("catalog_products").update(payload).eq("id", existing.id);
          updated++;
        } else {
          await supabase.from("catalog_products").insert({
            ...payload,
            midocean_id: masterCode,
            active: true,
          });
          created++;
        }
      } catch (e) {
        console.error("Error processing product:", e);
        errors++;
      }
    }

    console.log(`Sync complete: ${created} created, ${updated} updated, ${skipped} skipped, ${errors} errors`);

    return new Response(
      JSON.stringify({ success: true, total: products.length, created, updated, skipped, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Sync error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

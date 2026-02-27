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

const imageExts = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const isImageUrl = (url: string) => {
  const lower = url.toLowerCase();
  return imageExts.some((ext) => lower.includes(ext)) && lower.includes("/image/");
};

function findImageUrl(product: any): string | null {
  if (product.variants) {
    for (const v of product.variants) {
      if (v.digital_assets) {
        for (const a of v.digital_assets) {
          if (a.url && isImageUrl(a.url)) return a.url;
        }
      }
      if (v.main_picture && isImageUrl(v.main_picture)) return v.main_picture;
    }
  }
  if (product.main_picture && imageExts.some((e) => product.main_picture.toLowerCase().includes(e))) {
    return product.main_picture;
  }
  return null;
}

function extractVariantInfo(product: any): { colors: any[]; sizes: string[] } {
  const colorMap = new Map<string, { color: string; hex: string | null; image_url: string | null }>();
  const sizeSet = new Set<string>();
  if (!product.variants) return { colors: [], sizes: [] };
  for (const v of product.variants) {
    const colorName = v.color_group || v.color_description || v.color || null;
    if (colorName && !colorMap.has(colorName)) {
      let variantImage: string | null = null;
      if (v.digital_assets) {
        for (const a of v.digital_assets) {
          if (a.url && isImageUrl(a.url)) { variantImage = a.url; break; }
        }
      }
      if (!variantImage && v.main_picture && isImageUrl(v.main_picture)) variantImage = v.main_picture;
      colorMap.set(colorName, { color: colorName, hex: v.color_hex || v.color_code || null, image_url: variantImage });
    }
    const size = v.size || v.size_description || null;
    if (size) sizeSet.add(size);
  }
  return { colors: Array.from(colorMap.values()), sizes: Array.from(sizeSet) };
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

    // Parse optional batch params (must read body before it's consumed)
    let body: any = {};
    try { body = await req.json(); } catch (_) { /* no body */ }
    const BATCH_SIZE = body.batch_size || 500;
    const offset = body.offset || 0;

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

    const stockMap = new Map<string, number>();
    const stockList = Array.isArray(stockData) ? stockData : stockData?.stock || [];
    for (const s of stockList) {
      const sku = s.sku || s.master_id;
      if (!sku) continue;
      stockMap.set(sku, (stockMap.get(sku) || 0) + Number(s.qty ?? s.quantity ?? 0));
    }

    const priceMap = new Map<string, number>();
    const priceList = Array.isArray(pricesData) ? pricesData : pricesData?.price || pricesData?.prices || [];
    for (const p of priceList) {
      const sku = p.sku || p.master_id;
      if (!sku) continue;
      priceMap.set(sku, parseEuroPrice(p.price));
    }

    const products = Array.isArray(productsData) ? productsData : productsData?.products || [];

    const slice = products.slice(offset, offset + BATCH_SIZE);
    const hasMore = offset + BATCH_SIZE < products.length;

    console.log(`Processing batch ${offset}–${offset + slice.length} of ${products.length} products...`);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    const now = new Date().toISOString();

    // Pre-fetch existing midocean_ids for this batch to avoid N+1 queries
    const batchMasterCodes = slice
      .map((p: any) => p.master_code)
      .filter(Boolean);

    const existingMap = new Map<string, string>();
    // Fetch in chunks of 200 to avoid query limits
    for (let i = 0; i < batchMasterCodes.length; i += 200) {
      const chunk = batchMasterCodes.slice(i, i + 200);
      const { data: existingRows } = await supabase
        .from("catalog_products")
        .select("id, midocean_id")
        .in("midocean_id", chunk);
      if (existingRows) {
        for (const row of existingRows) {
          if (row.midocean_id) existingMap.set(row.midocean_id, row.id);
        }
      }
    }

    // Build upsert payloads
    const upsertRows: any[] = [];

    for (const product of slice) {
      try {
        const masterCode = product.master_code;
        if (!masterCode) continue;

        if (!product.variants || product.variants.length === 0) {
          skipped++;
          continue;
        }

        const name = product.product_name || product.short_description || masterCode;
        const sku = masterCode;

        const firstVariant = product.variants[0];
        const catParts = [
          firstVariant?.category_level1,
          firstVariant?.category_level2,
          firstVariant?.category_level3,
        ].filter(Boolean);
        const rawCategory = catParts.join(" > ") || "general";
        const category = /^\d/.test(rawCategory) ? "general" : rawCategory;

        const imageUrl = findImageUrl(product);
        const { colors, sizes } = extractVariantInfo(product);

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

        let bestPrice = 0;
        for (const vSku of variantSkus) {
          const p = priceMap.get(vSku);
          if (p !== undefined && (bestPrice === 0 || p < bestPrice)) {
            bestPrice = p;
          }
        }
        const finalPrice = Math.round(bestPrice * PRICE_MULTIPLIER * 100) / 100;

        const description = product.long_description || product.description || null;

        const releaseDate = product.release_date || firstVariant?.release_date || null;
        let isNew = false;
        if (releaseDate) {
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          isNew = new Date(releaseDate) >= sixMonthsAgo;
        }

        const existingId = existingMap.get(masterCode);
        const payload: any = {
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
          variant_colors: colors,
          variant_sizes: sizes,
          midocean_id: masterCode,
        };

        if (existingId) {
          payload.id = existingId;
          updated++;
        } else {
          payload.active = true;
          created++;
        }

        upsertRows.push(payload);
      } catch (e) {
        console.error("Error processing product:", e);
        errors++;
      }
    }

    // Upsert in chunks of 200
    for (let i = 0; i < upsertRows.length; i += 200) {
      const chunk = upsertRows.slice(i, i + 200);
      const { error: upsertError } = await supabase
        .from("catalog_products")
        .upsert(chunk, { onConflict: "midocean_id" });
      if (upsertError) {
        console.error(`Upsert error batch ${i}:`, upsertError.message);
        errors += chunk.length;
      }
    }

    console.log(`Batch done: ${created} created, ${updated} updated, ${skipped} skipped, ${errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        total: products.length,
        batch_offset: offset,
        batch_size: slice.length,
        has_more: hasMore,
        next_offset: hasMore ? offset + BATCH_SIZE : null,
        created,
        updated,
        skipped,
        errors,
      }),
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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SS_BASE = "https://api.stanleystella.com/webrequest";
const PRICE_MULTIPLIER = 1.81;

function buildPayload(user: string, password: string, extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    jsonrpc: "2.0",
    method: "call",
    params: {
      db_name: "production_api",
      user,
      password,
      ...extra,
    },
  });
}

async function ssApiCall(url: string, user: string, password: string, extra: Record<string, unknown> = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: buildPayload(user, password, extra),
  });
  if (!res.ok) throw new Error(`SS API failed [${res.status}] ${url}`);
  return res.json();
}

function parseResult(data: { result?: string; error?: unknown }): unknown[] {
  if (data.error) {
    throw new Error(`SS API error: ${JSON.stringify(data.error)}`);
  }
  const result = data.result;
  if (!result) return [];
  if (typeof result === "string") {
    try { return JSON.parse(result); } catch { return []; }
  }
  if (Array.isArray(result)) return result;
  return [];
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

    const ssUser = Deno.env.get("STANLEYSTELLA_USER");
    const ssPassword = Deno.env.get("STANLEYSTELLA_PASSWORD");
    if (!ssUser || !ssPassword) {
      return new Response(JSON.stringify({ error: "Stanley/Stella credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Fetching Stanley/Stella data...");

    // Fetch products, stock, and prices in parallel
    const [productsData, stockData, pricesData, imagesData] = await Promise.all([
      ssApiCall(`${SS_BASE}/productsV2/get_json`, ssUser, ssPassword, {
        LanguageCode: "fr_FR",
        Published: true,
      }),
      ssApiCall(`${SS_BASE}/v2/stock/get_json`, ssUser, ssPassword, {
        Is_Inventory: true,
      }),
      ssApiCall(`${SS_BASE}/products/get_prices`, ssUser, ssPassword, {}),
      ssApiCall(`${SS_BASE}/products_imagesV2/get_json`, ssUser, ssPassword, {
        LanguageCode: "fr_FR",
        PhotoTypeCode: "Studio",
        PhotoStyle: "Front",
      }),
    ]);

    const products = parseResult(productsData);
    const stocks = parseResult(stockData);
    const prices = parseResult(pricesData);
    const images = parseResult(imagesData);

    console.log(`Fetched: ${products.length} products, ${stocks.length} stock entries, ${prices.length} prices, ${images.length} images`);

    // Build stock map: SKU -> qty
    const stockMap = new Map<string, number>();
    for (const s of stocks as Array<{ SKU?: string; sku?: string; qty?: number; Quantity?: number }>) {
      const sku = s.SKU || s.sku;
      if (!sku) continue;
      stockMap.set(sku, (stockMap.get(sku) || 0) + Number(s.qty ?? s.Quantity ?? 0));
    }

    // Build price map: SKU -> price
    const priceMap = new Map<string, number>();
    for (const p of prices as Array<{ B2BSKUREF?: string; SKU?: string; PurchasePrice?: number; SalePrice?: number }>) {
      const sku = p.B2BSKUREF || p.SKU;
      if (!sku) continue;
      const price = Number(p.PurchasePrice ?? p.SalePrice ?? 0);
      if (price > 0) priceMap.set(sku, price);
    }

    // Build image map: StyleCode -> first image URL
    const imageMap = new Map<string, string>();
    for (const img of images as Array<{ StyleCode?: string; URL?: string; url?: string }>) {
      const style = img.StyleCode;
      const url = img.URL || img.url;
      if (style && url && !imageMap.has(style)) {
        imageMap.set(style, url);
      }
    }

    // Process products - productsV2 groups variants by style
    let created = 0;
    let updated = 0;
    let errors = 0;
    const now = new Date().toISOString();

    for (const product of products as Array<Record<string, unknown>>) {
      try {
        const styleCode = product.StyleCode as string || product.Code as string;
        if (!styleCode) continue;

        const name = product.Name as string || product.StyleName as string || styleCode;
        const description = product.Description as string || product.LongDescription as string || null;
        const category = product.CategoryName as string || product.MainSegment as string || "textile";

        // Image from images API
        const imageUrl = imageMap.get(styleCode) || null;

        // Aggregate stock and find best price across variants
        let totalStock = 0;
        let bestPrice = 0;
        const variants = product.Variants as Array<Record<string, unknown>> || product.variants as Array<Record<string, unknown>> || [];

        if (variants.length > 0) {
          for (const v of variants) {
            const vSku = v.SKU as string || v.B2BSKUREF as string;
            if (!vSku) continue;
            totalStock += stockMap.get(vSku) || 0;
            const p = priceMap.get(vSku);
            if (p !== undefined && (bestPrice === 0 || p < bestPrice)) {
              bestPrice = p;
            }
          }
        } else {
          // Flat product with single SKU
          const pSku = product.SKU as string || product.B2BSKUREF as string;
          if (pSku) {
            totalStock = stockMap.get(pSku) || 0;
            bestPrice = priceMap.get(pSku) || 0;
          }
        }

        const finalPrice = Math.round(bestPrice * PRICE_MULTIPLIER * 100) / 100;

        // Use midocean_id field to store SS identifier with prefix
        const sourceId = `SS-${styleCode}`;

        const { data: existing } = await supabase
          .from("catalog_products")
          .select("id")
          .eq("midocean_id", sourceId)
          .maybeSingle();

        const payload = {
          name,
          sku: styleCode,
          category,
          description,
          image_url: imageUrl,
          stock_qty: totalStock,
          base_price: finalPrice,
          last_synced_at: now,
        };

        if (existing) {
          await supabase.from("catalog_products").update(payload).eq("id", existing.id);
          updated++;
        } else {
          await supabase.from("catalog_products").insert({
            ...payload,
            midocean_id: sourceId,
            active: true,
          });
          created++;
        }
      } catch (e) {
        console.error("Error processing SS product:", e);
        errors++;
      }
    }

    console.log(`Stanley/Stella sync complete: ${created} created, ${updated} updated, ${errors} errors`);

    return new Response(
      JSON.stringify({ success: true, total: products.length, created, updated, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Stanley/Stella sync error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

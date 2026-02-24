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
  if (data.error) throw new Error(`SS API error: ${JSON.stringify(data.error)}`);
  const result = data.result;
  if (!result) return [];
  if (typeof result === "string") {
    try { return JSON.parse(result); } catch { return []; }
  }
  if (Array.isArray(result)) return result;
  return [];
}

interface SSVariant {
  B2BSKUREF: string;
  Color: string;
  ColorCode: string;
  SizeCode: string;
  Stock: number;
  Weight: number;
  CompositionList: string;
  Published: number;
  SKU_Start_Date: string | null;
  NewItem: number;
  NewColor: number;
  NewSize: number;
  [key: string]: unknown;
}

interface SSProduct {
  StyleCode: string;
  StyleName: string;
  Type: string;
  Category: string;
  Gender: string;
  Fit: string;
  Neckline: string;
  Sleeve: string;
  ShortDescription: string;
  LongDescription: string;
  CountryOfOrigin: string;
  StyleMainsSegments: string;
  Segment: string;
  MainPicture: Array<{ HTMLPath: string; ColorCode: string }>;
  Variants: SSVariant[];
  NewProduct: number;
  NewStyle: number;
  StylePublishedNewCollection: number;
  [key: string]: unknown;
}

interface SSPrice {
  B2BSKUREF: string;
  PurchasePrice: number;
  [key: string]: unknown;
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

    const ssUser = Deno.env.get("STANLEYSTELLA_USER");
    const ssPassword = Deno.env.get("STANLEYSTELLA_PASSWORD");
    if (!ssUser || !ssPassword) {
      return new Response(JSON.stringify({ error: "Stanley/Stella credentials not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Fetching Stanley/Stella data...");

    // Fetch all data in parallel
    const [productsData, pricesData] = await Promise.all([
      ssApiCall(`${SS_BASE}/productsV2/get_json`, ssUser, ssPassword, {
        LanguageCode: "fr_FR",
        Published: true,
      }),
      ssApiCall(`${SS_BASE}/products/get_prices`, ssUser, ssPassword, {}),
    ]);

    const products = parseResult(productsData) as SSProduct[];
    const prices = parseResult(pricesData) as SSPrice[];

    console.log(`Fetched ${products.length} products, ${prices.length} prices`);

    // Build price map: B2BSKUREF -> PurchasePrice
    const priceMap = new Map<string, number>();
    for (const p of prices) {
      if (p.PurchasePrice && p.PurchasePrice > 0) {
        priceMap.set(p.B2BSKUREF, p.PurchasePrice);
      }
    }

    let upserted = 0;
    let errors = 0;

    for (const product of products) {
      try {
        const styleCode = product.StyleCode;
        const variants = product.Variants || [];

        // Aggregate stock from all variants
        const totalStock = variants.reduce((sum, v) => sum + (v.Stock || 0), 0);

        // Find best (lowest) purchase price across variants using price API
        let bestPrice = Infinity;
        for (const v of variants) {
          const pp = priceMap.get(v.B2BSKUREF);
          if (pp && pp > 0 && pp < bestPrice) {
            bestPrice = pp;
          }
        }
        if (bestPrice === Infinity) bestPrice = 0;

        const finalPrice = Math.round(bestPrice * PRICE_MULTIPLIER * 100) / 100;

        // Image: use MainPicture[0].HTMLPath
        const imageUrl = product.MainPicture?.[0]?.HTMLPath || null;

        // Category: combine Category + Type (e.g. "Tees > T-shirts")
        const category = [product.Category, product.Type].filter(Boolean).join(" > ");

        // Description: combine short + long + metadata
        const descParts = [
          product.ShortDescription,
          product.LongDescription,
        ].filter(Boolean);
        
        // Add metadata to description
        const meta: string[] = [];
        if (product.Gender) meta.push(`Genre: ${product.Gender}`);
        if (product.Fit) meta.push(`Coupe: ${product.Fit}`);
        if (product.Neckline) meta.push(`Col: ${product.Neckline}`);
        if (product.Sleeve) meta.push(`Manche: ${product.Sleeve}`);
        if (product.CountryOfOrigin) meta.push(`Origine: ${product.CountryOfOrigin}`);
        if (product.StyleMainsSegments) meta.push(`Segment: ${product.StyleMainsSegments}`);
        
        // Get composition from first variant
        const firstVariant = variants[0];
        if (firstVariant?.CompositionList) meta.push(`Composition: ${firstVariant.CompositionList}`);
        if (firstVariant?.Weight) meta.push(`Grammage: ${firstVariant.Weight}g/m²`);

        const description = descParts.join("\n\n") + (meta.length ? "\n\n" + meta.join(" | ") : "");

        // Novelty: use NewProduct or NewStyle flags, and SKU_Start_Date from first variant
        const isNew = !!(product.NewProduct || product.NewStyle || (product as Record<string, unknown>).StylePublishedNewCollection);
        const firstVariantStartDate = variants[0]?.SKU_Start_Date || null;

        const { error: upsertError } = await supabase
          .from("catalog_products")
          .upsert({
            sku: styleCode,
            midocean_id: `SS-${styleCode}`,
            name: `${product.StyleName} (${styleCode})`,
            name_en: product.StyleName,
            name_nl: product.StyleName,
            description,
            description_en: product.ShortDescription || product.StyleName,
            description_nl: product.ShortDescription || product.StyleName,
            category,
            base_price: finalPrice,
            stock_qty: totalStock,
            image_url: imageUrl,
            active: true,
            is_new: isNew,
            release_date: firstVariantStartDate,
            last_synced_at: new Date().toISOString(),
          }, { onConflict: "sku" });

        if (upsertError) {
          console.error(`Error upserting ${styleCode}:`, upsertError.message);
          errors++;
        } else {
          upserted++;
        }
      } catch (err) {
        console.error(`Error processing product:`, err);
        errors++;
      }
    }

    console.log(`Sync complete: ${upserted} upserted, ${errors} errors`);

    return new Response(
      JSON.stringify({ success: true, upserted, errors, total: products.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Stanley/Stella sync error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

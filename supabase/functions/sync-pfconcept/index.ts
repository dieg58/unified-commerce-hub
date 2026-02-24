import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Configuration ──
// Data feed base URL (requires activation by PF Concept)
const FEED_BASE = "https://www.pfconcept.com/portal/datafeed";
// Belgium feed (CBE1), French language – adjust if needed
const PRODUCT_FEED = `${FEED_BASE}/productfeed_fr_v3.json`;
const PRICE_FEED   = `${FEED_BASE}/pricefeed_cbe1_v3.json`;
const STOCK_FEED   = `${FEED_BASE}/stockfeed_cbe1_v3.json`;
// Image CDN
const IMAGE_BASE = "https://images.pfconcept.com/ProductImages_All/JPG/500x500";
// Price multiplier (margin)
const PRICE_MULTIPLIER = 1.65;

// ── Types ──
interface FeedModel {
  model?: {
    modelCode: string;
    description?: string;
    extDesc?: string;
    items?: Array<{
      numberOfItems?: number;
      item?: Array<{
        itemCode: string;
        color?: string;
        colorDesc?: string;
        baseColor?: string;
        images?: { image?: string[] };
        mainImage?: string;
      }>;
    }>;
  };
  // Alternative flat structure
  modelCode?: string;
  description?: string;
  extDesc?: string;
  items?: Array<any>;
}

interface PriceModel {
  modelcode?: string;
  items?: Array<{
    numberOfItems?: number;
    item?: Array<{
      itemcode?: string;
      currency?: string;
      scales?: Array<{
        priceBar?: string | number;
        nettPrice?: string | number;
        type?: string;
      }>;
    }>;
  }>;
}

interface StockModel {
  modelCode?: string;
  items?: Array<{
    item?: Array<{
      itemCode?: string;
      stockDirect?: number;
      stockNextPo?: number;
    }>;
  }>;
}

/**
 * Fetch a JSON data feed, optionally with basic auth
 */
async function fetchFeed(url: string, email?: string, password?: string): Promise<any> {
  const headers: Record<string, string> = {
    "Accept": "application/json",
    "User-Agent": "InkooBot/2.0",
  };

  if (email && password) {
    headers["Authorization"] = "Basic " + btoa(`${email}:${password}`);
  }

  console.log(`Fetching feed: ${url}`);
  const res = await fetch(url, { headers });

  if (!res.ok) {
    throw new Error(`Feed fetch failed: ${res.status} ${res.statusText} for ${url}`);
  }

  return res.json();
}

/**
 * Extract the first product image name from a model/item
 */
function extractImageName(model: any, item: any): string | null {
  // Try item-level images first
  if (item?.images?.image) {
    const imgs = Array.isArray(item.images.image) ? item.images.image : [item.images.image];
    for (const img of imgs) {
      if (typeof img === "string" && img.endsWith(".jpg")) return img;
    }
  }
  if (item?.mainImage && typeof item.mainImage === "string") return item.mainImage;

  // Try model-level
  if (model?.images?.image) {
    const imgs = Array.isArray(model.images.image) ? model.images.image : [model.images.image];
    for (const img of imgs) {
      if (typeof img === "string" && img.endsWith(".jpg")) return img;
    }
  }
  if (model?.mainImage && typeof model.mainImage === "string") return model.mainImage;

  // Construct from itemCode: PF Concept uses {itemCode}_1.jpg as main image
  const code = item?.itemCode || item?.itemcode;
  if (code) return `${code}_1.jpg`;

  return null;
}

/**
 * Map PF Concept group descriptions to clean categories
 */
function mapCategory(model: any): string {
  const groupDesc = model?.groupDesc || model?.model?.groupDesc || "";
  const catDesc = model?.categoryDesc || model?.model?.categoryDesc || "";
  const desc = (groupDesc || catDesc || "").toLowerCase();

  if (!desc || desc === "undefined") return "General";

  // Clean up and capitalize
  const cleaned = (groupDesc || catDesc || "General").trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
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

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
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

    // Credentials for data feed access
    const pfEmail = Deno.env.get("PF_CONCEPT_EMAIL");
    const pfPassword = Deno.env.get("PF_CONCEPT_PASSWORD");

    // ── 1. Fetch product feed ──
    console.log("Fetching PF Concept product feed...");
    let productData: any;
    try {
      productData = await fetchFeed(PRODUCT_FEED, pfEmail || undefined, pfPassword || undefined);
    } catch (err) {
      console.error("Product feed error:", err);
      return new Response(JSON.stringify({
        error: `Could not fetch product feed. Make sure your PF Concept data feeds are activated. Error: ${err}`,
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Fetch price feed (optional, non-blocking) ──
    let priceMap = new Map<string, number>(); // itemCode -> nettPrice
    try {
      console.log("Fetching PF Concept price feed...");
      const priceData = await fetchFeed(PRICE_FEED, pfEmail || undefined, pfPassword || undefined);

      // Parse price feed – structure: priceInfo[0].models[0].model[]
      const priceRoot = priceData?.priceInfo?.[0] || priceData?.pfcPricefeed?.priceInfo || priceData;
      const priceModels = priceRoot?.models?.[0]?.model || priceRoot?.models || [];

      for (const pm of priceModels) {
        const items = pm?.items?.[0]?.item || pm?.items || [];
        for (const item of items) {
          const code = item?.itemcode || item?.itemCode;
          // Take the lowest quantity nettPrice (unit price)
          const scales = item?.scales || [];
          if (scales.length > 0 && code) {
            const unitScale = scales[0];
            const price = parseFloat(String(unitScale?.nettPrice || "0"));
            if (price > 0) priceMap.set(code, price);
          }
        }
      }
      console.log(`Parsed ${priceMap.size} item prices`);
    } catch (err) {
      console.warn("Price feed unavailable, using base prices:", err);
    }

    // ── 3. Fetch stock feed (optional, non-blocking) ──
    let stockMap = new Map<string, number>(); // itemCode -> stockDirect
    try {
      console.log("Fetching PF Concept stock feed...");
      const stockData = await fetchFeed(STOCK_FEED, pfEmail || undefined, pfPassword || undefined);

      const stockRoot = stockData?.stockFeed?.[0] || stockData?.pfcStockfeed?.stockFeed || stockData;
      const stockModels = stockRoot?.models?.[0]?.model || stockRoot?.models || [];

      for (const sm of stockModels) {
        const items = sm?.items?.[0]?.item || sm?.items || [];
        for (const item of items) {
          const code = item?.itemCode || item?.itemcode;
          if (code) {
            stockMap.set(code, Number(item?.stockDirect) || 0);
          }
        }
      }
      console.log(`Parsed ${stockMap.size} item stocks`);
    } catch (err) {
      console.warn("Stock feed unavailable:", err);
    }

    // ── 4. Parse product feed and upsert ──
    // Structure: pfcProductfeed.productfeed.models[].model
    const feedRoot = productData?.pfcProductfeed?.productfeed || productData?.productfeed || productData;
    const models: any[] = feedRoot?.models || [];

    console.log(`Product feed contains ${models.length} models`);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    const now = new Date().toISOString();

    for (const modelEntry of models) {
      try {
        // Handle both { model: { modelCode, ... } } and flat { modelCode, ... }
        const model = modelEntry?.model || modelEntry;
        const modelCode = model?.modelCode;
        if (!modelCode) { skipped++; continue; }

        const name = model?.description || modelCode;
        const description = model?.extDesc || null;
        const category = mapCategory(model);

        // Process items (SKUs/colors)
        const itemsArr = model?.items || [];
        const items = itemsArr?.[0]?.item || itemsArr;

        if (!items || items.length === 0) {
          // Insert as model-level product
          const pfcId = `PFC-${modelCode}`;
          const imageName = extractImageName(model, null);
          const imageUrl = imageName ? `${IMAGE_BASE}/${imageName}` : null;

          const { data: existing } = await supabase
            .from("catalog_products")
            .select("id")
            .eq("midocean_id", pfcId)
            .maybeSingle();

          const payload = {
            name,
            sku: modelCode,
            category,
            description,
            image_url: imageUrl,
            stock_qty: 0,
            base_price: 0,
            is_new: false,
            last_synced_at: now,
          };

          if (existing) {
            await supabase.from("catalog_products").update(payload).eq("id", existing.id);
            updated++;
          } else {
            await supabase.from("catalog_products").insert({ ...payload, midocean_id: pfcId, active: true });
            created++;
          }
          continue;
        }

        // Use first item as main product entry (model level)
        const firstItem = items[0];
        const itemCode = firstItem?.itemCode || firstItem?.itemcode || modelCode;
        const pfcId = `PFC-${modelCode}`;

        const imageName = extractImageName(model, firstItem);
        const imageUrl = imageName ? `${IMAGE_BASE}/${imageName}` : null;

        // Get price from price feed, or 0
        const price = priceMap.get(itemCode) || 0;
        const stock = stockMap.get(itemCode) || 0;

        const { data: existing } = await supabase
          .from("catalog_products")
          .select("id")
          .eq("midocean_id", pfcId)
          .maybeSingle();

        const payload = {
          name,
          sku: itemCode,
          category,
          description,
          image_url: imageUrl,
          stock_qty: stock,
          base_price: Math.round(price * PRICE_MULTIPLIER * 100) / 100,
          is_new: false,
          last_synced_at: now,
        };

        if (existing) {
          await supabase.from("catalog_products").update(payload).eq("id", existing.id);
          updated++;
        } else {
          await supabase.from("catalog_products").insert({ ...payload, midocean_id: pfcId, active: true });
          created++;
        }
      } catch (e) {
        console.error("Error processing model:", e);
        errors++;
      }
    }

    console.log(
      `PF Concept sync complete: ${created} created, ${updated} updated, ${skipped} skipped, ${errors} errors`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        total: models.length,
        created,
        updated,
        skipped,
        errors,
        pricesLoaded: priceMap.size,
        stocksLoaded: stockMap.size,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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

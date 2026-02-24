import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FEED_BASE = "https://www.pfconcept.com/portal/datafeed";
const IMAGE_BASE = "https://images.pfconcept.com/ProductImages_All/JPG/500x500";
const PRICE_MULTIPLIER = 1.65;
const BATCH_SIZE = 50;

// Try multiple country codes for price/stock feeds
const COUNTRY_CODES = ["cbe1", "cnl1", "cfr1", "cde1"];

function cleanCategory(raw: string): string {
  if (!raw || raw === "undefined") return "General";
  return raw.trim().charAt(0).toUpperCase() + raw.trim().slice(1);
}

async function tryFetchJson(urls: string[], email?: string, password?: string): Promise<any> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "InkooBot/2.0",
  };
  if (email && password) {
    headers["Authorization"] = "Basic " + btoa(`${email}:${password}`);
  }
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) {
        console.log(`OK: ${url}`);
        return await res.json();
      }
      console.log(`${res.status} for ${url}`);
    } catch {
      // try next
    }
  }
  return null;
}

/**
 * Fetch product feed as text and extract models using fast string splitting.
 * Much faster than char-by-char streaming.
 */
async function fetchProductModels(url: string, email?: string, password?: string): Promise<any[]> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "InkooBot/2.0",
  };
  if (email && password) {
    headers["Authorization"] = "Basic " + btoa(`${email}:${password}`);
  }

  console.log(`Fetching product feed as text: ${url}`);
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Feed ${res.status} for ${url}`);

  // Read as text - avoids double memory from JSON.parse on full object
  const text = await res.text();
  console.log(`Product feed size: ${(text.length / 1024 / 1024).toFixed(1)} MB`);

  // Fast extraction: find the models array and parse it
  // The structure is: {"pfcProductfeed":{"productfeed":{"models":[...]}}}
  // or similar nesting. Find "models" and extract the array content.
  
  // Find the models array start
  const modelsIdx = text.indexOf('"models"');
  if (modelsIdx === -1) {
    console.error("Could not find 'models' key in product feed");
    return [];
  }

  // Find the opening bracket of the array
  const arrayStart = text.indexOf('[', modelsIdx);
  if (arrayStart === -1) return [];

  // Find the matching closing bracket by counting
  let depth = 0;
  let arrayEnd = -1;
  for (let i = arrayStart; i < text.length; i++) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']') {
      depth--;
      if (depth === 0) {
        arrayEnd = i;
        break;
      }
    }
  }

  if (arrayEnd === -1) return [];

  // Parse just the models array
  const modelsJson = text.substring(arrayStart, arrayEnd + 1);
  
  // Free the full text from memory
  // Parse the array
  try {
    return JSON.parse(modelsJson);
  } catch (e) {
    console.error("Failed to parse models array:", e);
    return [];
  }
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
      authHeader.replace("Bearer ", "")
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
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pfEmail = Deno.env.get("PF_CONCEPT_EMAIL");
    const pfPassword = Deno.env.get("PF_CONCEPT_PASSWORD");

    // ── 1. Fetch price feed (try multiple country codes) ──
    const priceMap = new Map<string, number>();
    const priceUrls = COUNTRY_CODES.map((c) => `${FEED_BASE}/pricefeed_${c}_v3.json`);
    try {
      const priceData = await tryFetchJson(priceUrls, pfEmail || undefined, pfPassword || undefined);
      if (priceData) {
        const priceRoot = priceData?.priceInfo?.[0] || priceData?.pfcPricefeed?.priceInfo?.[0] || priceData;
        const priceModels = priceRoot?.models?.[0]?.model || priceRoot?.models || [];
        for (const pm of priceModels) {
          const items = pm?.items?.[0]?.item || pm?.items || [];
          for (const item of items) {
            const code = item?.itemcode || item?.itemCode;
            const scales = item?.scales || [];
            if (scales.length > 0 && code) {
              const price = parseFloat(String(scales[0]?.nettPrice || "0"));
              if (price > 0) priceMap.set(code, price);
            }
          }
        }
      }
      console.log(`Prices loaded: ${priceMap.size}`);
    } catch (err) {
      console.warn("Price feed error:", err);
    }

    // ── 2. Fetch stock feed (try multiple country codes) ──
    const stockMap = new Map<string, number>();
    const stockUrls = COUNTRY_CODES.map((c) => `${FEED_BASE}/stockfeed_${c}_v3.json`);
    try {
      const stockData = await tryFetchJson(stockUrls, pfEmail || undefined, pfPassword || undefined);
      if (stockData) {
        const stockRoot = stockData?.stockFeed?.[0] || stockData?.pfcStockfeed?.stockFeed?.[0] || stockData;
        const stockModels = stockRoot?.models?.[0]?.model || stockRoot?.models || [];
        for (const sm of stockModels) {
          const items = sm?.items?.[0]?.item || sm?.items || [];
          for (const item of items) {
            const code = item?.itemCode || item?.itemcode;
            if (code) stockMap.set(code, Number(item?.stockDirect) || 0);
          }
        }
      }
      console.log(`Stocks loaded: ${stockMap.size}`);
    } catch (err) {
      console.warn("Stock feed error:", err);
    }

    // ── 3. Fetch and process product feed ──
    const PRODUCT_FEED = `${FEED_BASE}/productfeed_fr_v3.json`;
    let models: any[];
    try {
      models = await fetchProductModels(PRODUCT_FEED, pfEmail || undefined, pfPassword || undefined);
    } catch (err) {
      return new Response(
        JSON.stringify({ error: `Product feed error: ${err}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${models.length} models`);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    const now = new Date().toISOString();

    // Process in batches
    for (let i = 0; i < models.length; i += BATCH_SIZE) {
      const chunk = models.slice(i, i + BATCH_SIZE);
      const batch: Array<{ pfcId: string; payload: Record<string, any> }> = [];

      for (const modelEntry of chunk) {
        try {
          const model = modelEntry?.model || modelEntry;
          const modelCode = model?.modelCode;
          if (!modelCode) { skipped++; continue; }

          const name = model?.description || modelCode;
          const description = model?.extDesc || null;
          const category = cleanCategory(model?.groupDesc || model?.categoryDesc || "");

          const itemsArr = model?.items || [];
          const items = itemsArr?.[0]?.item || itemsArr;
          const firstItem = Array.isArray(items) && items.length > 0 ? items[0] : null;
          const itemCode = firstItem?.itemCode || firstItem?.itemcode || modelCode;

          batch.push({
            pfcId: `PFC-${modelCode}`,
            payload: {
              name,
              sku: itemCode,
              category,
              description,
              image_url: `${IMAGE_BASE}/${itemCode}_1.jpg`,
              stock_qty: stockMap.get(itemCode) || 0,
              base_price: Math.round((priceMap.get(itemCode) || 0) * PRICE_MULTIPLIER * 100) / 100,
              is_new: false,
              last_synced_at: now,
            },
          });
        } catch {
          errors++;
        }
      }

      if (batch.length === 0) continue;

      // Check existing
      const pfcIds = batch.map((b) => b.pfcId);
      const { data: existing } = await supabase
        .from("catalog_products")
        .select("id, midocean_id")
        .in("midocean_id", pfcIds);

      const existingMap = new Map<string, string>();
      for (const e of existing || []) {
        if (e.midocean_id) existingMap.set(e.midocean_id, e.id);
      }

      const toInsert: any[] = [];
      const toUpdate: Array<{ id: string; payload: Record<string, any> }> = [];

      for (const b of batch) {
        const existingId = existingMap.get(b.pfcId);
        if (existingId) {
          toUpdate.push({ id: existingId, payload: b.payload });
        } else {
          toInsert.push({ ...b.payload, midocean_id: b.pfcId, active: true });
        }
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from("catalog_products").insert(toInsert);
        if (error) { errors += toInsert.length; console.error("Insert err:", error.message); }
        else created += toInsert.length;
      }

      // Batch update using upsert pattern
      for (const u of toUpdate) {
        await supabase.from("catalog_products").update(u.payload).eq("id", u.id);
        updated++;
      }
    }

    console.log(`Done: ${created} created, ${updated} updated, ${skipped} skipped, ${errors} errors`);

    return new Response(
      JSON.stringify({ success: true, total: models.length, created, updated, skipped, errors, pricesLoaded: priceMap.size, stocksLoaded: stockMap.size }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Sync error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

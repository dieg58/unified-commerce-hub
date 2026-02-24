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
 * Stream the product feed and yield product models from the nested
 * structure: ..."models":[{"model":[{...},{...}]}]
 */
async function* streamModels(
  url: string,
  email?: string,
  password?: string,
  limit?: number
): AsyncGenerator<any> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "InkooBot/2.0",
  };
  if (email && password) {
    headers["Authorization"] = "Basic " + btoa(`${email}:${password}`);
  }

  console.log(`Streaming product feed: ${url}`);
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Feed ${res.status}`);
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let yielded = 0;

  let phase: "findModels" | "findModelArray" | "readModelObjects" = "findModels";
  let modelDepth = 0;
  let modelObjectStart = -1;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    let i = 0;

    while (i < buffer.length) {
      if (phase === "findModels") {
        const modelsIdx = buffer.indexOf('"models"', i);
        if (modelsIdx === -1) {
          if (buffer.length > 32) buffer = buffer.slice(-32);
          break;
        }

        const modelsArrStart = buffer.indexOf("[", modelsIdx);
        if (modelsArrStart === -1) {
          i = modelsIdx + 8;
          continue;
        }

        phase = "findModelArray";
        i = modelsArrStart + 1;
        continue;
      }

      if (phase === "findModelArray") {
        const modelKeyIdx = buffer.indexOf('"model"', i);
        if (modelKeyIdx === -1) {
          if (buffer.length > 4096) buffer = buffer.slice(-4096);
          break;
        }

        const modelArrStart = buffer.indexOf("[", modelKeyIdx);
        if (modelArrStart === -1) {
          i = modelKeyIdx + 7;
          continue;
        }

        phase = "readModelObjects";
        i = modelArrStart + 1;
        modelDepth = 0;
        modelObjectStart = -1;
        continue;
      }

      // phase === "readModelObjects"
      const ch = buffer[i];
      if (ch === "{") {
        if (modelDepth === 0) modelObjectStart = i;
        modelDepth++;
      } else if (ch === "}") {
        modelDepth--;

        if (modelDepth === 0 && modelObjectStart !== -1) {
          const objStr = buffer.substring(modelObjectStart, i + 1);
          modelObjectStart = -1;

          try {
            const parsed = JSON.parse(objStr);
            yield parsed;
            yielded++;

            if (limit && yielded >= limit) {
              await reader.cancel();
              return;
            }
          } catch {
            // Ignore malformed object and continue
          }

          buffer = buffer.substring(i + 1);
          i = 0;
          continue;
        }
      } else if (ch === "]" && modelDepth === 0) {
        await reader.cancel();
        return;
      }

      i++;
    }

    if (phase === "readModelObjects" && modelObjectStart > 0) {
      buffer = buffer.substring(modelObjectStart);
      modelObjectStart = 0;
    }
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

    // Optional limit parameter for testing
    let limit: number | undefined;
    try {
      const body = await req.json();
      limit = body?.limit;
    } catch { /* no body */ }

    const pfEmail = Deno.env.get("PF_CONCEPT_EMAIL");
    const pfPassword = Deno.env.get("PF_CONCEPT_PASSWORD");

    // ── 1. Fetch price feed (small, fits in memory) ──
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

    // ── 2. Fetch stock feed (small, fits in memory) ──
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

    // Note: price/stock feeds may be unavailable but product feed can still work
    if (priceMap.size === 0 && stockMap.size === 0) {
      console.warn("Price and stock feeds returned no data — products will sync with price=0, stock=0");
    }

    // ── 3. Stream and process product feed ──
    const PRODUCT_FEED = `${FEED_BASE}/productfeed_fr_v3.json`;

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    let total = 0;
    const now = new Date().toISOString();

    // Accumulate batch items
    let batch: Array<{ pfcId: string; payload: Record<string, any> }> = [];

    async function flushBatch() {
      if (batch.length === 0) return;

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

      for (const u of toUpdate) {
        await supabase.from("catalog_products").update(u.payload).eq("id", u.id);
        updated++;
      }

      batch = [];
    }

    try {
      for await (const modelEntry of streamModels(PRODUCT_FEED, pfEmail || undefined, pfPassword || undefined, limit)) {
        total++;
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

          // Extract colors and sizes from items
          const colorMap = new Map<string, { color: string; hex: string | null; image_url: string | null }>();
          const sizeSet = new Set<string>();
          const allItems = Array.isArray(items) ? items : [];
          for (const item of allItems) {
            const colorName = item?.colorDesc || item?.color || null;
            if (colorName && !colorMap.has(colorName)) {
              const ic = item?.itemCode || item?.itemcode;
              colorMap.set(colorName, {
                color: colorName,
                hex: item?.colorHex || null,
                image_url: ic ? `${IMAGE_BASE}/${ic}_1.jpg` : null,
              });
            }
            const size = item?.sizeDesc || item?.size || null;
            if (size) sizeSet.add(size);
          }

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
              variant_colors: Array.from(colorMap.values()),
              variant_sizes: Array.from(sizeSet),
            },
          });

          if (batch.length >= BATCH_SIZE) {
            await flushBatch();
          }
        } catch {
          errors++;
        }

        // Log progress every 500
        if (total % 500 === 0) console.log(`Progress: ${total} models processed`);
      }
    } catch (err) {
      console.error("Stream error:", err);
      // Still flush what we have
    }

    // Flush remaining
    await flushBatch();

    console.log(`Done: ${created} created, ${updated} updated, ${skipped} skipped, ${errors} errors`);

    return new Response(
      JSON.stringify({ success: true, total, created, updated, skipped, errors, pricesLoaded: priceMap.size, stocksLoaded: stockMap.size }),
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

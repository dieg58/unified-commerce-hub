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

function cleanCategory(groupDesc: string, catDesc: string): string {
  // Use catDesc if available, fallback to groupDesc
  const raw = catDesc || groupDesc;
  if (!raw || raw === "undefined") return "General";
  return raw.trim().charAt(0).toUpperCase() + raw.trim().slice(1);
}

/**
 * Stream the product feed and yield model objects from the
 * structure: pfcProductfeed.productfeed.models = [{model: {...}}, ...]
 *
 * Each element of the "models" array is an object with a "model" key.
 */
async function* streamModels(
  url: string,
  limit?: number
): AsyncGenerator<any> {
  console.log(`Streaming product feed: ${url}`);
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "InkooBot/2.0" },
  });
  if (!res.ok) throw new Error(`Feed ${res.status}`);
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let yielded = 0;

  // State machine: find the "models" array, then read top-level objects from it
  let phase: "findModelsArray" | "readObjects" = "findModelsArray";
  let depth = 0;
  let objectStart = -1;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let i = 0;
    while (i < buffer.length) {
      if (phase === "findModelsArray") {
        // Look for "models" followed by ":"  then "["
        const idx = buffer.indexOf('"models"', i);
        if (idx === -1) {
          // Keep a tail to avoid missing a split keyword
          if (buffer.length > 32) buffer = buffer.slice(-32);
          break;
        }
        // Find the opening bracket of the array
        const arrStart = buffer.indexOf("[", idx + 8);
        if (arrStart === -1) {
          i = idx + 8;
          continue;
        }
        phase = "readObjects";
        i = arrStart + 1;
        depth = 0;
        objectStart = -1;
        continue;
      }

      // phase === "readObjects"
      const ch = buffer[i];
      if (ch === "{") {
        if (depth === 0) objectStart = i;
        depth++;
      } else if (ch === "}") {
        depth--;
        if (depth === 0 && objectStart !== -1) {
          const objStr = buffer.substring(objectStart, i + 1);
          objectStart = -1;
          try {
            const parsed = JSON.parse(objStr);
            yield parsed;
            yielded++;
            if (limit && yielded >= limit) {
              await reader.cancel();
              return;
            }
          } catch {
            // malformed, skip
          }
          buffer = buffer.substring(i + 1);
          i = 0;
          continue;
        }
      } else if (ch === "]" && depth === 0) {
        // End of models array
        await reader.cancel();
        return;
      }
      i++;
    }

    if (phase === "readObjects" && objectStart > 0) {
      buffer = buffer.substring(objectStart);
      objectStart = 0;
    }
  }
}

/**
 * Fetch a JSON feed with optional Basic Auth.
 */
async function fetchJson(url: string, email?: string, password?: string): Promise<any> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "InkooBot/2.0",
  };
  if (email && password) {
    headers["Authorization"] = "Basic " + btoa(`${email}:${password}`);
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    console.log(`${res.status} for ${url}`);
    return null;
  }
  console.log(`OK: ${url}`);
  return await res.json();
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

    // Default limit to avoid CPU timeout — caller can override
    let limit = 500;
    let offset = 0;
    try {
      const body = await req.json();
      if (body?.limit) limit = Math.min(body.limit, 1000);
      if (body?.offset) offset = body.offset;
    } catch { /* no body */ }

    const pfEmail = Deno.env.get("PF_CONCEPT_EMAIL");
    const pfPassword = Deno.env.get("PF_CONCEPT_PASSWORD");
    // Distributor-specific unique codes for price and stock feeds
    const pfPriceCode = Deno.env.get("PF_CONCEPT_PRICE_CODE");
    const pfStockCode = Deno.env.get("PF_CONCEPT_STOCK_CODE");

    // ── 1. Fetch price feed ──
    const priceMap = new Map<string, number>();
    if (pfPriceCode) {
      try {
        const priceUrl = `${FEED_BASE}/pricefeed_${pfPriceCode}_v3.json`;
        const priceData = await fetchJson(priceUrl, pfEmail || undefined, pfPassword || undefined);
        if (priceData) {
          // Structure: { priceInfo: [{ models: [{ model: [{itemcode, scales, ...}] }] }] }
          // OR: { pfcPricefeed: { priceInfo: { models: ... } } }
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
    } else {
      console.warn("PF_CONCEPT_PRICE_CODE not set — skipping price feed");
    }

    // ── 2. Fetch stock feed ──
    const stockMap = new Map<string, number>();
    if (pfStockCode) {
      try {
        const stockUrl = `${FEED_BASE}/stockfeed_${pfStockCode}_v3.json`;
        const stockData = await fetchJson(stockUrl, pfEmail || undefined, pfPassword || undefined);
        if (stockData) {
          // Structure: { stockFeed: [{ models: [{ model: [{ itemCode, stockDirect }] }] }] }
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
    } else {
      console.warn("PF_CONCEPT_STOCK_CODE not set — skipping stock feed");
    }

    // ── 3. Stream and process product feed ──
    // Product feed is public, use French language
    const PRODUCT_FEED = `${FEED_BASE}/productfeed_fr_v3.json`;

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    let total = 0;
    const now = new Date().toISOString();

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
      let skippedForOffset = 0;
      for await (const modelEntry of streamModels(PRODUCT_FEED, offset + limit)) {
        // Skip models before the offset
        if (skippedForOffset < offset) {
          skippedForOffset++;
          continue;
        }
        total++;
        try {
          // Structure: { model: { modelCode, description, items: [{item: {...}}, ...], ... } }
          const model = modelEntry?.model || modelEntry;
          const modelCode = model?.modelCode;
          if (!modelCode) {
            skipped++;
            // Log first few skips for debugging
            if (skipped <= 3) {
              console.log(`Skipped model (no modelCode). Keys: ${Object.keys(modelEntry || {}).join(", ")}`);
            }
            continue;
          }

          const name = model?.description || modelCode;
          const description = model?.extDesc || null;

          // Category: from categoryData or category fields
          const catData = model?.categoryData || model;
          const groupDesc = catData?.groupDesc || model?.groupDesc || "";
          const catDesc = catData?.catDesc || model?.catDesc || "";
          const category = cleanCategory(groupDesc, catDesc);

          // Items: structure is items: [{item: {...}}, ...] or items: [{item: [{...}, ...]}]
          const itemsArr = model?.items || [];
          // Get all items flattened
          const allItems: any[] = [];
          for (const itemWrapper of itemsArr) {
            if (itemWrapper?.item) {
              if (Array.isArray(itemWrapper.item)) {
                allItems.push(...itemWrapper.item);
              } else {
                allItems.push(itemWrapper.item);
              }
            } else {
              allItems.push(itemWrapper);
            }
          }

          const firstItem = allItems.length > 0 ? allItems[0] : null;
          const itemCode = firstItem?.itemCode || firstItem?.itemcode || modelCode;

          // Extract colors from the color data within each item
          const colorMap = new Map<string, { color: string; hex: string | null; image_url: string | null }>();
          const sizeSet = new Set<string>();

          for (const item of allItems) {
            // Colors: item.colors.color (array or object)
            const colorsData = item?.colors?.color || item?.colors || [];
            const colorArr = Array.isArray(colorsData) ? colorsData : [colorsData];
            for (const c of colorArr) {
              const colorName = c?.colorDesc || c?.color || null;
              if (colorName && !colorMap.has(colorName)) {
                const ic = item?.itemCode || item?.itemcode;
                // Image from imageData or construct from itemCode
                const imageMain = item?.imageData?.imageMain;
                const imgUrl = imageMain
                  ? `${IMAGE_BASE}/${imageMain}`
                  : ic ? `${IMAGE_BASE}/${ic}.jpg` : null;
                colorMap.set(colorName, {
                  color: colorName,
                  hex: c?.hexColor || null,
                  image_url: imgUrl,
                });
              }
            }

            // Sizes
            const size = item?.size || null;
            if (size) sizeSet.add(size);
          }

          // Main image: first item's imageMain or fallback
          const mainImage = firstItem?.imageData?.imageMain;
          const imageUrl = mainImage
            ? `${IMAGE_BASE}/${mainImage}`
            : `${IMAGE_BASE}/${itemCode}.jpg`;

          batch.push({
            pfcId: `PFC-${modelCode}`,
            payload: {
              name,
              sku: itemCode,
              category,
              description,
              image_url: imageUrl,
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

        if (total % 500 === 0) console.log(`Progress: ${total} models processed`);
      }
    } catch (err) {
      console.error("Stream error:", err);
    }

    await flushBatch();

    const hasMore = total >= limit;
    console.log(`Done: ${created} created, ${updated} updated, ${skipped} skipped, ${errors} errors (offset=${offset}, limit=${limit})`);

    return new Response(
      JSON.stringify({ success: true, total, created, updated, skipped, errors, pricesLoaded: priceMap.size, stocksLoaded: stockMap.size, offset, limit, hasMore, nextOffset: hasMore ? offset + limit : null }),
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

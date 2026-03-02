import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FEED_BASE = "https://www.pfconcept.com/portal/datafeed";
const IMAGE_BASE = "https://images.pfconcept.com/ProductImages_All/JPG/500x500";
const PRICE_MULTIPLIER = 1.65;
const BATCH_SIZE = 20;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 150;
const MAX_CPU_MS = 4500;

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
 * Robust against chunk boundaries around the "models": [ marker.
 */
async function* streamModels(
  url: string,
  limit?: number,
  deadlineAt?: number,
): AsyncGenerator<any> {
  console.log(`Streaming product feed: ${url}`);

  const controller = new AbortController();
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "InkooBot/2.0" },
    signal: controller.signal,
  });

  if (!res.ok) throw new Error(`Feed ${res.status}`);
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let yielded = 0;
  let inModelsArray = false;
  const isTimedOut = () => deadlineAt !== undefined && performance.now() > deadlineAt;

  // Object parser state (when inside models array)
  let depth = 0;
  let objectStart = -1;
  let inString = false;
  let escaped = false;

  try {
    while (true) {
      if (isTimedOut()) throw new Error("TIMEBOX_REACHED");

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      if (!inModelsArray) {
        const modelsIdx = buffer.indexOf('"models"');
        if (modelsIdx === -1) {
          // Keep enough tail to preserve a split marker between chunks
          if (buffer.length > 2048) buffer = buffer.slice(-2048);
          continue;
        }

        // Find the first array start after "models" (supports models: { model: [...] } as well)
        const arrStart = buffer.indexOf("[", modelsIdx);
        if (arrStart === -1) {
          // Keep from models token onward so we can complete on next chunk
          buffer = buffer.slice(modelsIdx);
          continue;
        }

        inModelsArray = true;
        buffer = buffer.slice(arrStart + 1);
      }

      let i = 0;
      while (i < buffer.length) {
        if ((i & 1023) === 0 && isTimedOut()) throw new Error("TIMEBOX_REACHED");

        const ch = buffer[i];

        if (inString) {
          if (escaped) escaped = false;
          else if (ch === "\\") escaped = true;
          else if (ch === '"') inString = false;
          i++;
          continue;
        }

        if (ch === '"') {
          inString = true;
          i++;
          continue;
        }

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
              if (limit && yielded >= limit) return;
            } catch {
              // skip malformed object
            }

            buffer = buffer.substring(i + 1);
            i = 0;
            continue;
          }
        } else if (ch === "]" && depth === 0) {
          return;
        }

        i++;
      }

      if (objectStart > 0) {
        buffer = buffer.substring(objectStart);
        objectStart = 0;
      } else if (objectStart === -1 && buffer.length > 4096) {
        // Prevent growth when parser is between objects
        buffer = buffer.slice(-1024);
      }
    }
  } finally {
    controller.abort();
    try {
      reader.releaseLock();
    } catch {
      // ignore
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

    // Conservative defaults to stay below worker CPU limits
    let limit = DEFAULT_LIMIT;
    let offset = 0;
    try {
      const body = await req.json();
      if (Number.isFinite(body?.limit)) {
        limit = Math.max(1, Math.min(Math.floor(body.limit), MAX_LIMIT));
      }
      if (Number.isFinite(body?.offset)) {
        offset = Math.max(0, Math.floor(body.offset));
      }
    } catch { /* no body */ }

    const pfEmail = Deno.env.get("PF_CONCEPT_EMAIL");
    const pfPassword = Deno.env.get("PF_CONCEPT_PASSWORD");
    // Distributor-specific unique codes for price and stock feeds
    const pfPriceCode = Deno.env.get("PF_CONCEPT_PRICE_CODE");
    const pfStockCode = Deno.env.get("PF_CONCEPT_STOCK_CODE");

    if (!pfPriceCode || !pfStockCode) {
      return new Response(
        JSON.stringify({
          error: "Missing PF Concept configuration",
          missing: {
            PF_CONCEPT_PRICE_CODE: !pfPriceCode,
            PF_CONCEPT_STOCK_CODE: !pfStockCode,
          },
          message: "Configure PF_CONCEPT_PRICE_CODE and PF_CONCEPT_STOCK_CODE before running PF Concept sync.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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

    let timedOut = false;
    let hasMore = false;
    const deadlineAt = performance.now() + MAX_CPU_MS;

    // Stream product feed to avoid loading the full JSON in memory
    // We request one extra model to detect whether more data exists.
    const streamLimit = offset + limit + 1;

    try {
      let seen = 0;

      for await (const modelEntry of streamModels(PRODUCT_FEED, streamLimit, deadlineAt)) {
        if (seen < offset) {
          seen++;
          continue;
        }

        // one extra item indicates next page exists
        if (total >= limit) {
          hasMore = true;
          break;
        }

        if (performance.now() > deadlineAt) {
          timedOut = true;
          hasMore = true;
          break;
        }

        total++;
        seen++;

        try {
          // Structure: { model: { modelCode, description, items: [{item: {...}}, ...], ... } }
          const model = modelEntry?.model || modelEntry;
          const modelCode = model?.modelCode;
          if (!modelCode) {
            skipped++;
            if (skipped <= 3) {
              console.log(`Skipped model (no modelCode). Keys: ${Object.keys(modelEntry || {}).join(", ")}`);
            }
            continue;
          }

          const name = model?.description || modelCode;
          const description = model?.extDesc || null;

          const catData = model?.categoryData || model;
          const groupDesc = catData?.groupDesc || model?.groupDesc || "";
          const catDesc = catData?.catDesc || model?.catDesc || "";
          const category = cleanCategory(groupDesc, catDesc);

          const itemsArr = model?.items || [];
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

          const colorMap = new Map<string, { color: string; hex: string | null; image_url: string | null }>();
          const sizeSet = new Set<string>();

          for (const item of allItems) {
            const colorsData = item?.colors?.color || item?.colors || [];
            const colorArr = Array.isArray(colorsData) ? colorsData : [colorsData];
            for (const c of colorArr) {
              const colorName = c?.colorDesc || c?.color || null;
              if (colorName && !colorMap.has(colorName)) {
                const ic = item?.itemCode || item?.itemcode;
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

            const size = item?.size || null;
            if (size) sizeSet.add(size);
          }

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
      }
    } catch (err) {
      if (err instanceof Error && err.message === "TIMEBOX_REACHED") {
        timedOut = true;
        hasMore = true;
      } else {
        throw err;
      }
    }

    await flushBatch();

    if (timedOut) hasMore = true;
    const nextOffset = hasMore ? offset + total : null;
    console.log(`Done: ${created} created, ${updated} updated, ${skipped} skipped, ${errors} errors (offset=${offset}, limit=${limit}, timedOut=${timedOut}, hasMore=${hasMore})`);

    return new Response(
      JSON.stringify({ success: true, total, created, updated, skipped, errors, pricesLoaded: priceMap.size, stocksLoaded: stockMap.size, offset, limit, hasMore, nextOffset, timedOut }),
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

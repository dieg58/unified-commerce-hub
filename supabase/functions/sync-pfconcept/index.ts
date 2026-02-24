import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Configuration ──
const FEED_BASE = "https://www.pfconcept.com/portal/datafeed";
const PRICE_FEED = `${FEED_BASE}/pricefeed_cbe1_v3.json`;
const STOCK_FEED = `${FEED_BASE}/stockfeed_cbe1_v3.json`;
const IMAGE_BASE = "https://images.pfconcept.com/ProductImages_All/JPG/500x500";
const PRICE_MULTIPLIER = 1.65;
const BATCH_SIZE = 50;

// ── Helpers ──

function extractImageUrl(itemCode: string): string {
  return `${IMAGE_BASE}/${itemCode}_1.jpg`;
}

function cleanCategory(raw: string): string {
  if (!raw || raw === "undefined") return "General";
  const cleaned = raw.trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

async function fetchJson(url: string, email?: string, password?: string): Promise<any> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "InkooBot/2.0",
  };
  if (email && password) {
    headers["Authorization"] = "Basic " + btoa(`${email}:${password}`);
  }
  console.log(`Fetching: ${url}`);
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Feed ${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

/**
 * Stream-parse the product feed JSON and yield individual model objects.
 * This avoids loading the entire ~50-100MB JSON into memory at once.
 * Strategy: read response as text in chunks, use bracket counting to extract
 * individual model objects from the "models" array.
 */
async function* streamProductModels(
  url: string,
  email?: string,
  password?: string
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
  if (!res.ok) throw new Error(`Feed ${res.status} for ${url}`);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let inModels = false;
  let depth = 0;
  let objectStart = -1;
  let yieldCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let i = 0;
    while (i < buffer.length) {
      const ch = buffer[i];

      // Skip strings to avoid counting brackets inside them
      if (ch === '"') {
        i++;
        while (i < buffer.length && buffer[i] !== '"') {
          if (buffer[i] === "\\") i++; // skip escaped char
          i++;
        }
        i++; // skip closing quote
        continue;
      }

      if (!inModels) {
        // Look for "models" key - once found, wait for the opening [
        if (ch === "[" && buffer.lastIndexOf('"models"', i) > Math.max(0, i - 50)) {
          inModels = true;
          depth = 0;
        }
        i++;
        continue;
      }

      // We're inside the models array
      if (ch === "{") {
        if (depth === 0) {
          objectStart = i;
        }
        depth++;
      } else if (ch === "}") {
        depth--;
        if (depth === 0 && objectStart >= 0) {
          const objectStr = buffer.substring(objectStart, i + 1);
          try {
            const model = JSON.parse(objectStr);
            yieldCount++;
            yield model;
          } catch {
            // malformed object, skip
          }
          objectStart = -1;
          // Trim processed buffer to free memory
          buffer = buffer.substring(i + 1);
          i = 0;
          continue;
        }
      } else if (ch === "]" && depth === 0) {
        // End of models array
        buffer = "";
        break;
      }

      i++;
    }

    // Keep only unprocessed part of buffer (from current object start)
    if (inModels && objectStart > 0) {
      buffer = buffer.substring(objectStart);
      objectStart = 0;
    }
  }

  console.log(`Streamed ${yieldCount} models from product feed`);
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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
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

    const pfEmail = Deno.env.get("PF_CONCEPT_EMAIL");
    const pfPassword = Deno.env.get("PF_CONCEPT_PASSWORD");

    // ── 1. Fetch price feed (small) ──
    const priceMap = new Map<string, number>();
    try {
      const priceData = await fetchJson(PRICE_FEED, pfEmail || undefined, pfPassword || undefined);
      const priceRoot = priceData?.priceInfo?.[0] || priceData?.pfcPricefeed?.priceInfo || priceData;
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
      console.log(`Parsed ${priceMap.size} item prices`);
    } catch (err) {
      console.warn("Price feed unavailable:", err);
    }

    // ── 2. Fetch stock feed (small) ──
    const stockMap = new Map<string, number>();
    try {
      const stockData = await fetchJson(STOCK_FEED, pfEmail || undefined, pfPassword || undefined);
      const stockRoot = stockData?.stockFeed?.[0] || stockData?.pfcStockfeed?.stockFeed || stockData;
      const stockModels = stockRoot?.models?.[0]?.model || stockRoot?.models || [];
      for (const sm of stockModels) {
        const items = sm?.items?.[0]?.item || sm?.items || [];
        for (const item of items) {
          const code = item?.itemCode || item?.itemcode;
          if (code) stockMap.set(code, Number(item?.stockDirect) || 0);
        }
      }
      console.log(`Parsed ${stockMap.size} item stocks`);
    } catch (err) {
      console.warn("Stock feed unavailable:", err);
    }

    // ── 3. Stream product feed and upsert in batches ──
    const PRODUCT_FEED = `${FEED_BASE}/productfeed_fr_v3.json`;
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    let total = 0;
    const now = new Date().toISOString();

    let batch: Array<{
      pfcId: string;
      payload: Record<string, any>;
    }> = [];

    async function flushBatch() {
      if (batch.length === 0) return;

      // Check which ones already exist
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
        if (error) {
          console.error("Insert error:", error.message);
          errors += toInsert.length;
        } else {
          created += toInsert.length;
        }
      }

      for (const u of toUpdate) {
        const { error } = await supabase
          .from("catalog_products")
          .update(u.payload)
          .eq("id", u.id);
        if (error) {
          errors++;
        } else {
          updated++;
        }
      }

      batch = [];
    }

    try {
      for await (const modelEntry of streamProductModels(
        PRODUCT_FEED,
        pfEmail || undefined,
        pfPassword || undefined
      )) {
        total++;
        try {
          const model = modelEntry?.model || modelEntry;
          const modelCode = model?.modelCode;
          if (!modelCode) {
            skipped++;
            continue;
          }

          const name = model?.description || modelCode;
          const description = model?.extDesc || null;
          const category = cleanCategory(model?.groupDesc || model?.categoryDesc || "");

          // Get first item for SKU, image, price, stock
          const itemsArr = model?.items || [];
          const items = itemsArr?.[0]?.item || itemsArr;
          const firstItem = Array.isArray(items) && items.length > 0 ? items[0] : null;
          const itemCode = firstItem?.itemCode || firstItem?.itemcode || modelCode;

          const pfcId = `PFC-${modelCode}`;
          const imageUrl = extractImageUrl(itemCode);
          const price = priceMap.get(itemCode) || 0;
          const stock = stockMap.get(itemCode) || 0;

          batch.push({
            pfcId,
            payload: {
              name,
              sku: itemCode,
              category,
              description,
              image_url: imageUrl,
              stock_qty: stock,
              base_price: Math.round(price * PRICE_MULTIPLIER * 100) / 100,
              is_new: false,
              last_synced_at: now,
            },
          });

          if (batch.length >= BATCH_SIZE) {
            await flushBatch();
          }
        } catch (e) {
          errors++;
        }
      }

      // Flush remaining
      await flushBatch();
    } catch (err) {
      console.error("Product feed streaming error:", err);
      // Still return partial results
    }

    console.log(
      `PF Concept sync: ${created} created, ${updated} updated, ${skipped} skipped, ${errors} errors (total models: ${total})`
    );

    return new Response(
      JSON.stringify({
        success: true,
        total,
        created,
        updated,
        skipped,
        errors,
        pricesLoaded: priceMap.size,
        stocksLoaded: stockMap.size,
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

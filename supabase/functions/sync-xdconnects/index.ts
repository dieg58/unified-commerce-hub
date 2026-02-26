import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PREFIX = "XDC-";
const PRICE_MULTIPLIER = 1.65;
const FEED_URL_FR =
  "https://feeds.xindao.com/Feeds/Download/2575-Qfx-ZzmKKT2PHe7omMwPBxIOQlkIIblERsDBefwhTzMTaoPx1lxuY7cr2YRNHH-36Mf1sNFGtOupSEVZsg2Dwc4n/Xindao.V6.AllData-fr-fr-C38465.json";

const MAX_CPU_MS = 25_000;
const BATCH_SIZE = 150;

// ── field accessor (try multiple casing/naming variants) ─────
function f(p: any, ...keys: string[]): any {
  for (const k of keys) if (p[k] !== undefined) return p[k];
  return undefined;
}

// ── helpers ──────────────────────────────────────────────

function findMainImage(p: any): string | null {
  const images = f(p, "Images", "images");
  if (images && Array.isArray(images)) {
    for (const img of images) {
      const url = f(img, "Url", "url", "URL");
      const type = f(img, "Type", "type");
      if (url && (type === "MainImage" || type === "Image" || type === "main")) return url;
    }
    const firstUrl = f(images[0], "Url", "url", "URL");
    if (firstUrl) return firstUrl;
  }
  const main = f(p, "MainImage", "mainImage", "ImageUrl", "imageUrl", "image_url");
  if (main) return main;
  const variants = f(p, "Variants", "variants") || [];
  for (const v of variants) {
    const vm = f(v, "MainImage", "mainImage", "ImageUrl", "imageUrl");
    if (vm) return vm;
    const vimgs = f(v, "Images", "images");
    if (vimgs?.[0]) {
      const u = f(vimgs[0], "Url", "url", "URL");
      if (u) return u;
    }
  }
  return null;
}

function extractVariants(p: any): { colors: any[]; sizes: string[] } {
  const cMap = new Map<string, any>();
  const sSet = new Set<string>();
  const variants = f(p, "Variants", "variants") || [];
  for (const v of variants) {
    const c = f(v, "ColorDescription", "colorDescription", "Color", "color");
    if (c && !cMap.has(c)) {
      cMap.set(c, {
        color: c,
        hex: f(v, "ColorHex", "colorHex", "ColorCode", "colorCode") || null,
        image_url: f(v, "MainImage", "mainImage", "ImageUrl", "imageUrl") || null,
      });
    }
    const s = f(v, "SizeDescription", "sizeDescription", "Size", "size");
    if (s) sSet.add(s);
  }
  return { colors: [...cMap.values()], sizes: [...sSet] };
}

function buildCategory(p: any): string {
  const parts = [
    f(p, "CategoryLevel1", "categoryLevel1", "Category1", "category1"),
    f(p, "CategoryLevel2", "categoryLevel2", "Category2", "category2"),
    f(p, "CategoryLevel3", "categoryLevel3", "Category3", "category3"),
  ].filter(Boolean);
  return parts.join(" > ") || "general";
}

function getPrice(p: any): number {
  const net = Number(f(p, "NetPrice", "netPrice", "Price", "price") || 0);
  if (net > 0) return Math.round(net * PRICE_MULTIPLIER * 100) / 100;
  const gross = Number(f(p, "GrossPrice", "grossPrice") || 0);
  return gross > 0 ? Math.round(gross * 100) / 100 : 0;
}

function getStock(p: any): number {
  let s = Number(f(p, "QuantityOnStock", "quantityOnStock", "Stock", "stock") || 0);
  if (s > 0) return s;
  const variants = f(p, "Variants", "variants") || [];
  for (const v of variants) s += Number(f(v, "QuantityOnStock", "quantityOnStock", "Stock", "stock") || 0);
  return s;
}

function getItemNumber(p: any): string | null {
  return f(p, "ItemNumber", "itemNumber", "ItemCode", "itemCode", "SKU", "sku", "ProductCode", "productCode", "Code", "code") || null;
}

// ── main handler ─────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      .from("user_roles").select("role")
      .eq("user_id", user.id).eq("role", "super_admin").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const offset = Number(body.offset) || 0;

    console.log(`XDC: Fetching FR feed, offset=${offset}…`);
    const feedRes = await fetch(FEED_URL_FR);
    if (!feedRes.ok) throw new Error(`Feed HTTP ${feedRes.status}`);
    const feedText = await feedRes.text();
    const feedData = JSON.parse(feedText);

    const allProducts: any[] = Array.isArray(feedData)
      ? feedData
      : feedData?.Products || feedData?.products || feedData?.Items || feedData?.items || [];

    const total = allProducts.length;

    // Debug: log structure on first call
    if (offset === 0 && total > 0) {
      const sample = allProducts[0];
      const keys = Object.keys(sample);
      console.log("XDC first product keys:", JSON.stringify(keys));
      console.log("XDC sample item number:", getItemNumber(sample));
      console.log("XDC sample snippet:", JSON.stringify(sample).substring(0, 800));
    }

    const slice = allProducts.slice(offset, offset + BATCH_SIZE);
    console.log(`XDC: Total=${total}, processing ${offset}..${offset + slice.length}`);

    if (slice.length === 0) {
      return new Response(
        JSON.stringify({ success: true, created: 0, updated: 0, errors: 0, hasMore: false, total }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();
    const rows: any[] = [];
    const startMs = Date.now();

    for (const p of slice) {
      if (Date.now() - startMs > MAX_CPU_MS) break;
      const itemNumber = getItemNumber(p);
      if (!itemNumber) continue;
      const { colors, sizes } = extractVariants(p);
      rows.push({
        name: f(p, "ItemDescription", "itemDescription", "Name", "name", "Description", "description") || itemNumber,
        sku: itemNumber,
        category: buildCategory(p),
        description: f(p, "ItemDescriptionLong", "itemDescriptionLong", "LongDescription", "longDescription") || null,
        image_url: findMainImage(p),
        stock_qty: getStock(p),
        base_price: getPrice(p),
        is_new: !!(f(p, "ItemIsNew", "itemIsNew", "IsNew", "isNew")),
        last_synced_at: now,
        variant_colors: colors,
        variant_sizes: sizes,
        midocean_id: PREFIX + itemNumber,
        brand: f(p, "ItemBrand", "itemBrand", "Brand", "brand", "BrandName", "brandName") || "XD Collection",
        active: true,
      });
    }

    // Log how many rows were built vs slice size
    console.log(`XDC: Built ${rows.length} rows from ${slice.length} products`);

    // Lookup existing
    const mids = rows.map((r) => r.midocean_id);
    const existingMap = new Map<string, string>();
    for (let i = 0; i < mids.length; i += 200) {
      const chunk = mids.slice(i, i + 200);
      const { data: existing } = await supabase
        .from("catalog_products").select("id, midocean_id").in("midocean_id", chunk);
      if (existing) for (const r of existing) if (r.midocean_id) existingMap.set(r.midocean_id, r.id);
    }

    let created = 0, updated = 0, errors = 0;
    for (const row of rows) {
      const eid = existingMap.get(row.midocean_id);
      if (eid) { row.id = eid; updated++; } else { created++; }
    }

    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { error: upsertError } = await supabase
        .from("catalog_products").upsert(chunk, { onConflict: "midocean_id" });
      if (upsertError) {
        console.error("Upsert error:", upsertError.message);
        errors += chunk.length;
      }
    }

    const nextOffset = offset + slice.length;
    const hasMore = nextOffset < total;
    console.log(`XDC batch done: ${created} created, ${updated} updated, ${errors} errors, hasMore=${hasMore}`);

    return new Response(
      JSON.stringify({ success: true, created, updated, errors, hasMore, nextOffset, total }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Sync error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

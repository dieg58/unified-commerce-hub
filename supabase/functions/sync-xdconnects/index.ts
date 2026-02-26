import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// XD Connects (Xindao) V6 combined feeds
const FEEDS = {
  fr: "https://feeds.xindao.com/Feeds/Download/2575-Qfx-ZzmKKT2PHe7omMwPBxIOQlkIIblERsDBefwhTzMTaoPx1lxuY7cr2YRNHH-36Mf1sNFGtOupSEVZsg2Dwc4n/Xindao.V6.AllData-fr-fr-C38465.json",
  en: "https://feeds.xindao.com/Feeds/Download/2575-o7D-r5ukzcJsYhRCuBlnFWKTR9C1Ho21hii7pITjkWbhUJGmHFE1BPGIk6H3OP-ax6kdj0EpRAba4stUrkoL_3BH/Xindao.V6.AllData-en-gb-C38465.json",
  nl: "https://feeds.xindao.com/Feeds/Download/2575-pvNgUCIzJlXJaJqWnt0mNvjvTJybNnM46vX7qtfYM1KaeDpReBu9Qx1Zl6SbKQElIjNUmqOiwpWRwar2oiVzsrO-/Xindao.V6.AllData-nl-nl-C38465.json",
};

const PRICE_MULTIPLIER = 1.65;
const MAX_CPU_MS = 8000;
const PREFIX = "XDC-";

interface XDProduct {
  ItemNumber?: string;
  ItemDescription?: string;
  ItemDescriptionLong?: string;
  ItemBrand?: string;
  CategoryLevel1?: string;
  CategoryLevel2?: string;
  CategoryLevel3?: string;
  MainImage?: string;
  NetPrice?: number;
  GrossPrice?: number;
  RRP?: number;
  QuantityOnStock?: number;
  ItemIsNew?: boolean;
  Variants?: XDVariant[];
  Images?: { Url?: string; Type?: string }[];
}

interface XDVariant {
  VariantItemNumber?: string;
  ColorDescription?: string;
  ColorHex?: string;
  SizeDescription?: string;
  QuantityOnStock?: number;
  MainImage?: string;
  Images?: { Url?: string; Type?: string }[];
}

async function fetchFeed(url: string): Promise<any> {
  console.log(`Fetching feed: ${url.slice(0, 80)}...`);
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "InkooBot/2.0" },
  });
  if (!res.ok) throw new Error(`Feed HTTP ${res.status}`);
  return res.json();
}

function findMainImage(product: any): string | null {
  // Try product-level Images array first
  if (product.Images && Array.isArray(product.Images)) {
    for (const img of product.Images) {
      if (img.Url && (img.Type === "MainImage" || img.Type === "Image")) return img.Url;
    }
    if (product.Images[0]?.Url) return product.Images[0].Url;
  }
  if (product.MainImage) return product.MainImage;
  // Fall back to first variant image
  if (product.Variants) {
    for (const v of product.Variants) {
      if (v.MainImage) return v.MainImage;
      if (v.Images?.[0]?.Url) return v.Images[0].Url;
    }
  }
  return null;
}

function extractVariants(product: any): { colors: any[]; sizes: string[] } {
  const colorMap = new Map<string, { color: string; hex: string | null; image_url: string | null }>();
  const sizeSet = new Set<string>();

  const variants = product.Variants || product.variants || [];
  for (const v of variants) {
    const colorName = v.ColorDescription || v.colorDescription || null;
    if (colorName && !colorMap.has(colorName)) {
      let img: string | null = v.MainImage || v.mainImage || null;
      if (!img && v.Images?.[0]?.Url) img = v.Images[0].Url;
      colorMap.set(colorName, {
        color: colorName,
        hex: v.ColorHex || v.colorHex || null,
        image_url: img,
      });
    }
    const size = v.SizeDescription || v.sizeDescription || null;
    if (size) sizeSet.add(size);
  }

  return { colors: Array.from(colorMap.values()), sizes: Array.from(sizeSet) };
}

function buildCategory(product: any): string {
  const parts = [
    product.CategoryLevel1 || product.categoryLevel1,
    product.CategoryLevel2 || product.categoryLevel2,
    product.CategoryLevel3 || product.categoryLevel3,
  ].filter(Boolean);
  return parts.join(" > ") || "general";
}

function getPrice(product: any): number {
  // Use NetPrice (purchase price) with markup, or GrossPrice
  const net = Number(product.NetPrice || product.netPrice || 0);
  if (net > 0) return Math.round(net * PRICE_MULTIPLIER * 100) / 100;
  const gross = Number(product.GrossPrice || product.grossPrice || 0);
  if (gross > 0) return Math.round(gross * 100) / 100;
  return 0;
}

function getStock(product: any): number {
  // Product-level stock
  let stock = Number(product.QuantityOnStock || product.quantityOnStock || 0);
  if (stock > 0) return stock;
  // Sum variant stocks
  const variants = product.Variants || product.variants || [];
  for (const v of variants) {
    stock += Number(v.QuantityOnStock || v.quantityOnStock || 0);
  }
  return stock;
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

    // Parse body
    let body: any = {};
    try { body = await req.json(); } catch (_) { /* no body */ }
    const offset = body.offset || 0;
    const BATCH_SIZE = body.batch_size || 150;

    const startCpu = performance.now();
    const deadline = startCpu + MAX_CPU_MS;

    // Fetch FR feed only (primary) to avoid memory limit
    console.log("Fetching XD Connects FR feed...");
    const frData = await fetchFeed(FEEDS.fr);

    // The V6 feed structure: root object with Products array, or root is the array
    const frProducts: any[] = Array.isArray(frData)
      ? frData
      : frData?.Products || frData?.products || frData?.Items || frData?.items || [];

    if (frProducts.length === 0) {
      return new Response(
        JSON.stringify({ error: "No products found in XD Connects feed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`XD Connects: ${frProducts.length} total products`);

    // Slice for batching
    const slice = frProducts.slice(offset, offset + BATCH_SIZE);
    const hasMore = offset + BATCH_SIZE < frProducts.length;

    // Build set of item numbers we need translations for
    const batchItemNumbers = new Set<string>();
    for (const p of slice) {
      const n = p.ItemNumber || p.itemNumber;
      if (n) batchItemNumbers.add(n);
    }

    // Fetch EN and NL feeds, but only keep items in current batch to save memory
    let enMap = new Map<string, any>();
    let nlMap = new Map<string, any>();
    try {
      const [enData, nlData] = await Promise.all([fetchFeed(FEEDS.en), fetchFeed(FEEDS.nl)]);
      const extractMap = (data: any): Map<string, any> => {
        const arr: any[] = Array.isArray(data)
          ? data
          : data?.Products || data?.products || data?.Items || data?.items || [];
        const m = new Map<string, any>();
        for (const p of arr) {
          const sku = p.ItemNumber || p.itemNumber;
          if (sku && batchItemNumbers.has(sku)) {
            m.set(sku, { name: p.ItemDescription || p.itemDescription, desc: p.ItemDescriptionLong || p.itemDescriptionLong });
          }
        }
        return m;
      };
      enMap = extractMap(enData);
      nlMap = extractMap(nlData);
      console.log(`Translation maps: EN=${enMap.size}, NL=${nlMap.size}`);
    } catch (e) {
      console.warn("Failed to load translation feeds:", e);
    }

    console.log(`Processing batch ${offset}–${offset + slice.length} of ${frProducts.length}...`);

    // Pre-fetch existing XDC- products
    const batchSkus = slice
      .map((p: any) => PREFIX + (p.ItemNumber || p.itemNumber || ""))
      .filter((s: string) => s !== PREFIX);

    const existingMap = new Map<string, string>();
    for (let i = 0; i < batchSkus.length; i += 200) {
      const chunk = batchSkus.slice(i, i + 200);
      const { data: rows } = await supabase
        .from("catalog_products")
        .select("id, midocean_id")
        .in("midocean_id", chunk);
      if (rows) {
        for (const r of rows) {
          if (r.midocean_id) existingMap.set(r.midocean_id, r.id);
        }
      }
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    const now = new Date().toISOString();
    const upsertRows: any[] = [];

    for (const product of slice) {
      try {
        if (performance.now() > deadline) {
          console.log("CPU time-box reached, stopping early");
          break;
        }

        const itemNumber = product.ItemNumber || product.itemNumber;
        if (!itemNumber) { skipped++; continue; }

        const midoceanId = PREFIX + itemNumber;
        const name = product.ItemDescription || product.itemDescription || itemNumber;
        const description = product.ItemDescriptionLong || product.itemDescriptionLong || null;
        const brand = product.ItemBrand || product.itemBrand || "XD Collection";
        const category = buildCategory(product);
        const imageUrl = findMainImage(product);
        const { colors, sizes } = extractVariants(product);
        const price = getPrice(product);
        const stock = getStock(product);
        const isNew = !!(product.ItemIsNew || product.itemIsNew);

        // Translations
        const enT = enMap.get(itemNumber);
        const nlT = nlMap.get(itemNumber);
        const nameEn = enT?.name || null;
        const nameNl = nlT?.name || null;
        const descEn = enT?.desc || null;
        const descNl = nlT?.desc || null;

        const existingId = existingMap.get(midoceanId);
        const payload: any = {
          name,
          name_en: nameEn,
          name_nl: nameNl,
          sku: itemNumber,
          category,
          description,
          description_en: descEn,
          description_nl: descNl,
          image_url: imageUrl,
          stock_qty: stock,
          base_price: price,
          is_new: isNew,
          last_synced_at: now,
          variant_colors: colors,
          variant_sizes: sizes,
          midocean_id: midoceanId,
          brand,
          active: true,
        };

        if (existingId) {
          payload.id = existingId;
          updated++;
        } else {
          created++;
        }

        upsertRows.push(payload);
      } catch (e) {
        console.error("Error processing XD product:", e);
        errors++;
      }
    }

    // Upsert in chunks
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
        total: frProducts.length,
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

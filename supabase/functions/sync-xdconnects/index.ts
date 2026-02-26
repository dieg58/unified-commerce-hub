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

const MAX_CPU_MS = 25_000; // stop before timeout
const BATCH_SIZE = 150;

// ── helpers ──────────────────────────────────────────────

function findMainImage(p: any): string | null {
  if (p.Images && Array.isArray(p.Images)) {
    for (const img of p.Images) {
      if (img.Url && (img.Type === "MainImage" || img.Type === "Image")) return img.Url;
    }
    if (p.Images[0]?.Url) return p.Images[0].Url;
  }
  if (p.MainImage) return p.MainImage;
  for (const v of p.Variants || []) {
    if (v.MainImage) return v.MainImage;
    if (v.Images?.[0]?.Url) return v.Images[0].Url;
  }
  return null;
}

function extractVariants(p: any): { colors: any[]; sizes: string[] } {
  const cMap = new Map<string, any>();
  const sSet = new Set<string>();
  for (const v of p.Variants || []) {
    const c = v.ColorDescription;
    if (c && !cMap.has(c)) {
      cMap.set(c, { color: c, hex: v.ColorHex || null, image_url: v.MainImage || v.Images?.[0]?.Url || null });
    }
    if (v.SizeDescription) sSet.add(v.SizeDescription);
  }
  return { colors: [...cMap.values()], sizes: [...sSet] };
}

function buildCategory(p: any): string {
  return [p.CategoryLevel1, p.CategoryLevel2, p.CategoryLevel3].filter(Boolean).join(" > ") || "general";
}

function getPrice(p: any): number {
  const net = Number(p.NetPrice || 0);
  if (net > 0) return Math.round(net * PRICE_MULTIPLIER * 100) / 100;
  const gross = Number(p.GrossPrice || 0);
  return gross > 0 ? Math.round(gross * 100) / 100 : 0;
}

function getStock(p: any): number {
  let s = Number(p.QuantityOnStock || 0);
  if (s > 0) return s;
  for (const v of p.Variants || []) s += Number(v.QuantityOnStock || 0);
  return s;
}

// ── main handler ─────────────────────────────────────────
// Accepts { offset?: number }
// Downloads FR feed, processes a slice starting at offset, returns hasMore flag.

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
      .from("user_roles").select("role")
      .eq("user_id", user.id).eq("role", "super_admin").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const offset = Number(body.offset) || 0;

    // Download the FR feed
    console.log(`XDC: Fetching FR feed, offset=${offset}…`);
    const feedRes = await fetch(FEED_URL_FR);
    if (!feedRes.ok) throw new Error(`Feed HTTP ${feedRes.status}`);
    const feedText = await feedRes.text();

    // Parse only the slice we need to minimise memory pressure
    const feedData = JSON.parse(feedText);
    // Free raw text immediately
    const allProducts: any[] = Array.isArray(feedData)
      ? feedData
      : feedData?.Products || feedData?.products || feedData?.Items || feedData?.items || [];

    const total = allProducts.length;
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
      const itemNumber = p.ItemNumber;
      if (!itemNumber) continue;
      const { colors, sizes } = extractVariants(p);
      rows.push({
        name: p.ItemDescription || itemNumber,
        sku: itemNumber,
        category: buildCategory(p),
        description: p.ItemDescriptionLong || null,
        image_url: findMainImage(p),
        stock_qty: getStock(p),
        base_price: getPrice(p),
        is_new: !!p.ItemIsNew,
        last_synced_at: now,
        variant_colors: colors,
        variant_sizes: sizes,
        midocean_id: PREFIX + itemNumber,
        brand: p.ItemBrand || "XD Collection",
        active: true,
      });
    }

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

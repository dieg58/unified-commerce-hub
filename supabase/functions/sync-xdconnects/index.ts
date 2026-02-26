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

// ── XD Connects V6 feed has FLAT structure per variant ──
// Each row = one variant (ItemCode = "ModelCode.Color.Size" or just "ModelCode")
// We group by ModelCode to build product-level records.

interface XDCItem {
  ModelCode?: string;
  ItemCode?: string;
  ItemName?: string;
  LongDescription?: string;
  Brand?: string;
  MainCategory?: string;
  SubCategory?: string;
  MainImage?: string;
  Color?: string;
  HexColor1?: string;
  CurrentStock?: string | number;
  ItemPriceNet_Qty1?: string | number;
  IntroDate?: string;
  [key: string]: any;
}

interface GroupedProduct {
  modelCode: string;
  name: string;
  description: string | null;
  brand: string;
  category: string;
  image_url: string | null;
  price: number;
  stock: number;
  is_new: boolean;
  colors: Map<string, { color: string; hex: string | null; image_url: string | null }>;
}

function groupByModel(items: XDCItem[]): Map<string, GroupedProduct> {
  const map = new Map<string, GroupedProduct>();

  for (const item of items) {
    const rawCode = item.ModelCode || item.ItemCode || "";
    if (!rawCode) continue;

    // Vinga products: ModelCode includes color suffix (e.g. V850111 = V85011 + color 1)
    // Group by V + 5 digits for Vinga, otherwise use full ModelCode
    const modelCode = /^V\d{5,}/.test(rawCode) ? rawCode.slice(0, 6) : rawCode;

    let group = map.get(modelCode);
    if (!group) {
      const net = Number(item.ItemPriceNet_Qty1 || 0);
      const price = net > 0 ? Math.round(net * PRICE_MULTIPLIER * 100) / 100 : 0;

      const catParts = [item.MainCategory, item.SubCategory].filter(Boolean);

      // Check if intro date is recent (within last 6 months)
      let isNew = false;
      if (item.IntroDate) {
        const intro = new Date(item.IntroDate);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        isNew = intro > sixMonthsAgo;
      }

      group = {
        modelCode,
        name: item.ItemName || modelCode,
        description: item.LongDescription || null,
        brand: item.Brand || "XD Collection",
        category: catParts.join(" > ") || "general",
        image_url: item.MainImage || null,
        price,
        stock: Number(item.CurrentStock || 0),
        is_new: isNew,
        colors: new Map(),
      };
      map.set(modelCode, group);
    } else {
      // Accumulate stock across variants
      group.stock += Number(item.CurrentStock || 0);
    }

    // Add color variant
    const color = item.Color;
    if (color && !group.colors.has(color)) {
      group.colors.set(color, {
        color,
        hex: item.HexColor1 || null,
        image_url: item.MainImage || null,
      });
    }
  }

  return map;
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

    // Feed is a flat array of variant-level items
    const allItems: XDCItem[] = Array.isArray(feedData)
      ? feedData
      : feedData?.Products || feedData?.products || feedData?.Items || feedData?.items || [];

    const total = allItems.length;

    // Debug on first call
    if (offset === 0 && total > 0) {
      const sample = allItems[0];
      console.log("XDC sample:", JSON.stringify({
        ModelCode: sample.ModelCode,
        ItemCode: sample.ItemCode,
        ItemName: sample.ItemName,
        Brand: sample.Brand,
        MainCategory: sample.MainCategory,
        Color: sample.Color,
      }));
    }

    // Slice the flat items
    const slice = allItems.slice(offset, offset + BATCH_SIZE);
    console.log(`XDC: Total items=${total}, processing ${offset}..${offset + slice.length}`);

    if (slice.length === 0) {
      return new Response(
        JSON.stringify({ success: true, created: 0, updated: 0, errors: 0, hasMore: false, total }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group variants by ModelCode
    const grouped = groupByModel(slice);
    const now = new Date().toISOString();
    const rows: any[] = [];

    for (const [modelCode, g] of grouped) {
      rows.push({
        name: g.name,
        sku: modelCode,
        category: g.category,
        description: g.description,
        image_url: g.image_url,
        stock_qty: g.stock,
        base_price: g.price,
        is_new: g.is_new,
        last_synced_at: now,
        variant_colors: [...g.colors.values()],
        variant_sizes: [], // sizes not clearly separated in V6 flat feed
        midocean_id: PREFIX + modelCode,
        brand: g.brand,
        active: true,
      });
    }

    console.log(`XDC: Grouped ${slice.length} items into ${rows.length} products`);

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

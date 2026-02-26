import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PREFIX = "XDC-";
const PRICE_MULTIPLIER = 1.65;

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
// Expects body: { products: XDProduct[] }
// The CLIENT downloads the feed and sends products in small batches.

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

    const body = await req.json();
    const rawProducts: any[] = body.products || [];

    if (rawProducts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, created: 0, updated: 0, errors: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();
    const rows: any[] = [];

    for (const p of rawProducts) {
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

    // Look up existing
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

    console.log(`XDC batch: ${created} created, ${updated} updated, ${errors} errors`);

    return new Response(
      JSON.stringify({ success: true, created, updated, errors }),
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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Expect JSON body with pre-parsed products from client
    const { products, brand } = await req.json() as {
      products: Array<{
        sku: string;
        name: string;
        name_en: string | null;
        name_nl: string | null;
        description: string | null;
        description_en: string | null;
        description_nl: string | null;
        category: string;
        image_url: string | null;
        base_price: number;
        variant_colors: Array<{ color: string; hex: string | null; image_url: string | null }>;
        variant_sizes: string[];
        is_new: boolean;
      }>;
      brand: string;
    };

    if (!products || !Array.isArray(products) || products.length === 0) {
      return new Response(JSON.stringify({ error: "No products provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[sync-newwave] Received ${products.length} pre-parsed products, brand=${brand}`);

    let created = 0, updated = 0, errors = 0;
    const BATCH = 50;

    for (let i = 0; i < products.length; i += BATCH) {
      const batch = products.slice(i, i + BATCH);
      const upsertRows = batch.map((p) => ({
        sku: p.sku,
        midocean_id: p.sku,
        name: p.name,
        name_en: p.name_en,
        name_nl: p.name_nl,
        description: p.description,
        description_en: p.description_en,
        description_nl: p.description_nl,
        category: p.category || "general",
        image_url: p.image_url,
        base_price: p.base_price,
        brand,
        variant_colors: p.variant_colors,
        variant_sizes: p.variant_sizes,
        is_new: p.is_new,
        last_synced_at: new Date().toISOString(),
      }));

      const skus = upsertRows.map((r) => r.sku);
      const { data: existing } = await admin
        .from("catalog_products")
        .select("sku")
        .in("sku", skus);

      const existingSkus = new Set((existing || []).map((e: any) => e.sku));

      const toInsert = upsertRows.filter((r) => !existingSkus.has(r.sku));
      const toUpdate = upsertRows.filter((r) => existingSkus.has(r.sku));

      if (toInsert.length > 0) {
        const { error: insertErr } = await admin
          .from("catalog_products")
          .insert(toInsert.map((r) => ({ ...r, active: true })));
        if (insertErr) {
          console.error(`[sync-newwave] Insert error:`, insertErr.message);
          errors += toInsert.length;
        } else {
          created += toInsert.length;
        }
      }

      for (const row of toUpdate) {
        const { sku, ...updateData } = row;
        const { error: updateErr } = await admin
          .from("catalog_products")
          .update(updateData)
          .eq("sku", sku);
        if (updateErr) {
          console.error(`[sync-newwave] Update error for ${sku}:`, updateErr.message);
          errors++;
        } else {
          updated++;
        }
      }
    }

    console.log(`[sync-newwave] Done: created=${created}, updated=${updated}, errors=${errors}`);

    return new Response(
      JSON.stringify({ created, updated, errors, total: products.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[sync-newwave] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

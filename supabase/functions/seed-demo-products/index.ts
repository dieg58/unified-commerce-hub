import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await callerClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { tenant_id, entity_id } = body;

    if (!tenant_id || !entity_id) {
      return new Response(JSON.stringify({ error: "tenant_id and entity_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Read templates with joined catalog product data
    const { data: templates, error: tplErr } = await supabase
      .from("demo_product_templates")
      .select("*, catalog_products(*)")
      .eq("active", true)
      .order("sort_order");

    if (tplErr) throw tplErr;
    if (!templates || templates.length === 0) {
      return new Response(JSON.stringify({ error: "No demo templates found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let created = 0;
    for (const tpl of templates) {
      const catalogProduct = (tpl as any).catalog_products;
      if (!catalogProduct) continue;

      const logoPlacement = {
        x: Number(tpl.logo_x),
        y: Number(tpl.logo_y),
        width: Number(tpl.logo_width),
        rotation: Number(tpl.logo_rotation),
        blend: tpl.logo_blend,
        opacity: Number(tpl.logo_opacity),
        mode: tpl.logo_mode,
      };

      const { data: prod, error: prodErr } = await supabase
        .from("products")
        .insert({
          tenant_id,
          name: catalogProduct.name,
          sku: catalogProduct.sku,
          category: catalogProduct.category || "general",
          image_url: catalogProduct.image_url,
          logo_placement: logoPlacement,
          active: true,
          active_bulk: true,
          active_staff: true,
          stock_qty: 100,
          stock_type: "in_stock",
        })
        .select("id")
        .single();

      if (prodErr) {
        console.error(`Insert error for ${catalogProduct.sku}:`, prodErr);
        continue;
      }

      const price = Number(catalogProduct.base_price) || 10;
      await supabase.from("product_prices").insert([
        { product_id: prod.id, tenant_id, store_type: "bulk" as const, price },
        { product_id: prod.id, tenant_id, store_type: "staff" as const, price: Math.round(price * 0.8 * 100) / 100 },
      ]);

      created++;
    }

    console.log(`✓ ${created} demo products created from catalog templates`);

    return new Response(JSON.stringify({ created }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("seed-demo-products error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

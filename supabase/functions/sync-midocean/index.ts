import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MIDOCEAN_BASE = "https://api.midocean.com/gateway";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Check super_admin role
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

    const MIDOCEAN_API_KEY = Deno.env.get("MIDOCEAN_API_KEY");
    if (!MIDOCEAN_API_KEY) {
      return new Response(JSON.stringify({ error: "MIDOCEAN_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers = { "x-Gateway-APIKey": MIDOCEAN_API_KEY };

    // Fetch products, stock, and prices in parallel
    console.log("Fetching Midocean data...");
    const [productsRes, stockRes, pricesRes] = await Promise.all([
      fetch(`${MIDOCEAN_BASE}/products/2.0`, { headers }),
      fetch(`${MIDOCEAN_BASE}/stock/2.0`, { headers }),
      fetch(`${MIDOCEAN_BASE}/pricelist/2.0`, { headers }),
    ]);

    if (!productsRes.ok) {
      const body = await productsRes.text();
      throw new Error(`Midocean products API failed [${productsRes.status}]: ${body}`);
    }
    if (!stockRes.ok) {
      const body = await stockRes.text();
      throw new Error(`Midocean stock API failed [${stockRes.status}]: ${body}`);
    }
    if (!pricesRes.ok) {
      const body = await pricesRes.text();
      throw new Error(`Midocean pricelist API failed [${pricesRes.status}]: ${body}`);
    }

    const productsData = await productsRes.json();
    const stockData = await stockRes.json();
    const pricesData = await pricesRes.json();

    // Build stock map: sku -> qty
    const stockMap = new Map<string, number>();
    if (Array.isArray(stockData?.stock)) {
      for (const s of stockData.stock) {
        const sku = s.sku || s.master_id;
        const qty = s.qty ?? s.quantity ?? s.stock ?? 0;
        stockMap.set(sku, (stockMap.get(sku) || 0) + Number(qty));
      }
    } else if (Array.isArray(stockData)) {
      for (const s of stockData) {
        const sku = s.sku || s.master_id;
        const qty = s.qty ?? s.quantity ?? s.stock ?? 0;
        stockMap.set(sku, (stockMap.get(sku) || 0) + Number(qty));
      }
    }

    // Build price map: master_id -> price
    const priceMap = new Map<string, number>();
    if (Array.isArray(pricesData?.prices)) {
      for (const p of pricesData.prices) {
        const id = p.master_id || p.sku;
        const price = p.price ?? p.unit_price ?? 0;
        priceMap.set(id, Number(price));
      }
    } else if (Array.isArray(pricesData)) {
      for (const p of pricesData) {
        const id = p.master_id || p.sku;
        const price = p.price ?? p.unit_price ?? 0;
        priceMap.set(id, Number(price));
      }
    }

    // Process products
    const products = Array.isArray(productsData) ? productsData : productsData?.products || [];
    console.log(`Processing ${products.length} products...`);

    let created = 0;
    let updated = 0;
    let errors = 0;
    const now = new Date().toISOString();

    for (const product of products) {
      try {
        const masterId = product.master_id || product.sku || product.item_number;
        if (!masterId) continue;

        const name = product.short_description || product.description || product.master_id || "Unknown";
        const sku = product.master_id || product.sku || "";
        const category = product.commodity_code || product.category || product.product_class || "general";
        const description = product.long_description || product.description || null;
        const imageUrl = product.master_image?.url || product.digital_assets?.[0]?.url || product.image_url || null;
        const stockQty = stockMap.get(sku) ?? stockMap.get(masterId) ?? 0;
        const basePrice = priceMap.get(masterId) ?? priceMap.get(sku) ?? 0;

        // Upsert by midocean_id
        const { data: existing } = await supabase
          .from("catalog_products")
          .select("id")
          .eq("midocean_id", masterId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("catalog_products")
            .update({
              name,
              sku,
              category,
              description,
              image_url: imageUrl,
              stock_qty: stockQty,
              base_price: basePrice,
              last_synced_at: now,
            })
            .eq("id", existing.id);
          updated++;
        } else {
          await supabase.from("catalog_products").insert({
            midocean_id: masterId,
            name,
            sku,
            category,
            description,
            image_url: imageUrl,
            stock_qty: stockQty,
            base_price: basePrice,
            active: true,
            last_synced_at: now,
          });
          created++;
        }
      } catch (e) {
        console.error("Error processing product:", e);
        errors++;
      }
    }

    console.log(`Sync complete: ${created} created, ${updated} updated, ${errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        total: products.length,
        created,
        updated,
        errors,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
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

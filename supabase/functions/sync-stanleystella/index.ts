import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SS_BASE = "https://api.stanleystella.com/webrequest";
const PRICE_MULTIPLIER = 1.81;

function buildPayload(user: string, password: string, extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    jsonrpc: "2.0",
    method: "call",
    params: {
      db_name: "production_api",
      user,
      password,
      ...extra,
    },
  });
}

async function ssApiCall(url: string, user: string, password: string, extra: Record<string, unknown> = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: buildPayload(user, password, extra),
  });
  if (!res.ok) throw new Error(`SS API failed [${res.status}] ${url}`);
  return res.json();
}

function parseResult(data: { result?: string; error?: unknown }): unknown[] {
  if (data.error) {
    throw new Error(`SS API error: ${JSON.stringify(data.error)}`);
  }
  const result = data.result;
  if (!result) return [];
  if (typeof result === "string") {
    try { return JSON.parse(result); } catch { return []; }
  }
  if (Array.isArray(result)) return result;
  return [];
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

    const ssUser = Deno.env.get("STANLEYSTELLA_USER");
    const ssPassword = Deno.env.get("STANLEYSTELLA_PASSWORD");
    if (!ssUser || !ssPassword) {
      return new Response(JSON.stringify({ error: "Stanley/Stella credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Fetching Stanley/Stella data (DEBUG MODE)...");

    // Fetch only products and prices for debug (skip stock/images to be faster)
    const [productsData, stockData, pricesData, imagesData] = await Promise.all([
      ssApiCall(`${SS_BASE}/productsV2/get_json`, ssUser, ssPassword, {
        LanguageCode: "fr_FR",
        Published: true,
      }),
      ssApiCall(`${SS_BASE}/v2/stock/get_json`, ssUser, ssPassword, {
        Is_Inventory: true,
      }),
      ssApiCall(`${SS_BASE}/products/get_prices`, ssUser, ssPassword, {}),
      ssApiCall(`${SS_BASE}/products_imagesV2/get_json`, ssUser, ssPassword, {
        LanguageCode: "fr_FR",
      }),
    ]);

    const products = parseResult(productsData);
    const stocks = parseResult(stockData);
    const prices = parseResult(pricesData);
    const images = parseResult(imagesData);

    // Return sample data for field mapping
    const sampleProduct = products.length > 0 ? products[0] : null;
    const sampleStock = stocks.length > 0 ? stocks[0] : null;
    const samplePrice = prices.length > 0 ? prices[0] : null;
    const sampleImage = images.length > 0 ? images[0] : null;

    // Also get keys of each
    const productKeys = sampleProduct ? Object.keys(sampleProduct as Record<string, unknown>) : [];
    const stockKeys = sampleStock ? Object.keys(sampleStock as Record<string, unknown>) : [];
    const priceKeys = samplePrice ? Object.keys(samplePrice as Record<string, unknown>) : [];
    const imageKeys = sampleImage ? Object.keys(sampleImage as Record<string, unknown>) : [];

    return new Response(
      JSON.stringify({
        debug: true,
        counts: { products: products.length, stocks: stocks.length, prices: prices.length, images: images.length },
        sampleProduct,
        productKeys,
        sampleStock,
        stockKeys,
        samplePrice,
        priceKeys,
        sampleImage,
        imageKeys,
      }, null, 2),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Stanley/Stella sync error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

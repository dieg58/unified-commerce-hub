const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const username = Deno.env.get("TOPTEX_USERNAME")!;
    const password = Deno.env.get("TOPTEX_PASSWORD")!;
    const apiKey = Deno.env.get("TOPTEX_API_KEY") || "";

    // Try different URL + header combinations
    const urls = [
      "https://api.toptex.io",
      "https://api.toptex.io/prod",
      "https://api.toptex.io/api",
    ];
    
    const authPaths = ["/v1/auth", "/auth", "/v1/authenticate"];
    
    const results: any[] = [];
    
    for (const baseUrl of urls) {
      for (const path of authPaths) {
        try {
          const res = await fetch(`${baseUrl}${path}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
            },
            body: JSON.stringify({ username, password }),
          });
          const text = await res.text();
          results.push({
            url: `${baseUrl}${path}`,
            status: res.status,
            preview: text.substring(0, 300),
          });
          if (res.ok) {
            // If auth works, try listing products
            const authData = JSON.parse(text);
            const token = authData.token;
            const prodRes = await fetch(`${baseUrl}/v1/products?catalog_reference=GI64000`, {
              headers: { "Authorization": `Bearer ${token}`, "x-api-key": apiKey },
            });
            const prodText = await prodRes.text();
            results.push({
              url: "products_test",
              status: prodRes.status,
              preview: prodText.substring(0, 500),
            });
            return new Response(JSON.stringify({ success: true, results }, null, 2), {
              status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } catch (e) {
          results.push({ url: `${baseUrl}${path}`, error: String(e) });
        }
      }
    }

    return new Response(JSON.stringify({ error: "All attempts failed", results }, null, 2), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

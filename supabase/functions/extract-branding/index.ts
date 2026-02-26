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
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await callerClient.auth.getUser();
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const url = typeof body.url === "string" ? body.url.trim().slice(0, 500) : "";
    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format URL
    let formattedUrl = url;
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log("Extracting branding from:", formattedUrl);

    // Try branding format first, fallback to metadata-only if it times out
    let data: any = null;
    let usedFallback = false;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);

      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: formattedUrl,
          formats: ["branding"],
          timeout: 20000,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      data = await response.json();

      if (!response.ok) {
        console.warn("Branding format failed, trying metadata fallback:", data?.error || data?.code);
        usedFallback = true;
      }
    } catch (e) {
      console.warn("Branding request timed out or failed, trying metadata fallback");
      usedFallback = true;
    }

    // Fallback: just grab metadata (much faster, no JS rendering needed)
    if (usedFallback) {
      try {
        const fallbackResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: formattedUrl,
            formats: ["markdown"],
            onlyMainContent: false,
            timeout: 15000,
          }),
        });
        data = await fallbackResp.json();
        if (!fallbackResp.ok) {
          console.error("Fallback scrape also failed:", data);
          return new Response(
            JSON.stringify({ success: false, error: "Scrape failed" }),
            { status: fallbackResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (e2) {
        console.error("Fallback also failed:", e2);
        return new Response(
          JSON.stringify({ success: false, error: "Scrape timed out" }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const branding = data?.data?.branding || data?.branding || {};
    const metadata = data?.data?.metadata || data?.metadata || {};

    const result = {
      success: true,
      branding: {
        primaryColor: branding.colors?.primary || null,
        accentColor: branding.colors?.accent || branding.colors?.secondary || null,
        logo: branding.images?.logo || branding.logo || metadata.ogImage || null,
        favicon: branding.images?.favicon || null,
        title: metadata.title || metadata.ogTitle || null,
        description: metadata.description || metadata.ogDescription || null,
      },
    };

    console.log("Branding extracted:", JSON.stringify(result.branding));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error extracting branding:", error);
    return new Response(
      JSON.stringify({ success: false, error: "An error occurred." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

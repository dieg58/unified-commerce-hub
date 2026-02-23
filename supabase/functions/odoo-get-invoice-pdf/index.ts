import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ODOO_URL = Deno.env.get("ODOO_URL");
    const ODOO_DB = Deno.env.get("ODOO_DB");
    const ODOO_LOGIN = Deno.env.get("ODOO_LOGIN");
    const ODOO_API_KEY = Deno.env.get("ODOO_API_KEY");

    if (!ODOO_URL || !ODOO_DB || !ODOO_LOGIN || !ODOO_API_KEY) {
      throw new Error("Odoo credentials not configured");
    }

    // Verify user auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { invoice_id } = await req.json();
    if (!invoice_id) throw new Error("invoice_id is required");

    // Fetch invoice to get odoo_invoice_id
    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select("odoo_invoice_id, invoice_number")
      .eq("id", invoice_id)
      .single();

    if (invErr || !invoice?.odoo_invoice_id) {
      throw new Error("Invoice not found or not synced with Odoo");
    }

    // Fetch PDF from Odoo
    const pdfUrl = `${ODOO_URL}/api/v1/report/pdf/account.report_invoice/${invoice.odoo_invoice_id}`;
    const pdfRes = await fetch(pdfUrl, {
      headers: {
        "Authorization": `Bearer ${ODOO_API_KEY}`,
        "X-Odoo-Db": ODOO_DB,
        "X-Odoo-Login": ODOO_LOGIN,
      },
    });

    if (!pdfRes.ok) {
      const text = await pdfRes.text();
      throw new Error(`Failed to fetch PDF from Odoo [${pdfRes.status}]: ${text}`);
    }

    const pdfBuffer = await pdfRes.arrayBuffer();

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.invoice_number || "invoice"}.pdf"`,
      },
    });
  } catch (error: unknown) {
    console.error("Invoice PDF error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

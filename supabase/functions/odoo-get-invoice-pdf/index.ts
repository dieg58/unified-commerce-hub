import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── XML-RPC helpers ──
function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function str(v: string): string { return `<string>${escapeXml(v)}</string>`; }
function int(v: number): string { return `<int>${v}</int>`; }
function param(inner: string): string { return `<param><value>${inner}</value></param>`; }
function struct(fields: Record<string, string>): string {
  const members = Object.entries(fields)
    .map(([k, v]) => `<member><name>${k}</name><value>${v}</value></member>`)
    .join("");
  return `<struct>${members}</struct>`;
}
function array(items: string[]): string {
  return `<array><data>${items.map(v => `<value>${v}</value>`).join("")}</data></array>`;
}
function xmlRpcCall(methodName: string, params: string[]): string {
  return `<?xml version="1.0"?>\n<methodCall>\n  <methodName>${methodName}</methodName>\n  <params>${params.join("")}</params>\n</methodCall>`;
}

async function xmlRpcPost(url: string, body: string): Promise<string> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "text/xml" }, body });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`XML-RPC HTTP ${res.status}: ${text.substring(0, 300)}`);
  }
  return res.text();
}

function checkFault(xml: string): void {
  if (xml.includes("<fault>")) {
    const faultString = xml.match(/<name>faultString<\/name>\s*<value>\s*<string>([\s\S]*?)<\/string>/);
    throw new Error(`Odoo XML-RPC fault: ${faultString?.[1] || "Unknown fault"}`);
  }
}

function extractInt(xml: string): number | null {
  const m = xml.match(/<(?:int|i4)>(\d+)<\/(?:int|i4)>/);
  return m ? parseInt(m[1], 10) : null;
}

function extractBase64(xml: string): string | null {
  const m = xml.match(/<base64>([\s\S]*?)<\/base64>/);
  return m ? m[1].replace(/\s/g, "") : null;
}

async function authenticate(url: string, db: string, login: string, apiKey: string): Promise<number> {
  const body = xmlRpcCall("authenticate", [
    param(str(db)), param(str(login)), param(str(apiKey)), param(struct({})),
  ]);
  const xml = await xmlRpcPost(`${url}/xmlrpc/2/common`, body);
  checkFault(xml);
  const uid = extractInt(xml);
  if (!uid) throw new Error("Odoo authentication failed");
  return uid;
}

async function execute(url: string, db: string, uid: number, apiKey: string, model: string, method: string, args: string[], kwargs: string = struct({})): Promise<string> {
  const body = xmlRpcCall("execute_kw", [
    param(str(db)),
    param(int(uid)),
    param(str(apiKey)),
    param(str(model)),
    param(str(method)),
    param(array(args)),
    param(kwargs),
  ]);
  const xml = await xmlRpcPost(`${url}/xmlrpc/2/object`, body);
  checkFault(xml);
  return xml;
}

function extractInts(xml: string): number[] {
  const matches = [...xml.matchAll(/<(?:int|i4)>(\d+)<\/(?:int|i4)>/g)];
  return matches.map(m => parseInt(m[1], 10));
}

async function getInvoicePdf(url: string, db: string, uid: number, apiKey: string, invoiceId: number): Promise<Uint8Array> {
  // Step 1: Find the report action ID for account.report_invoice
  const domain = array([array([str("report_name"), str("="), str("account.report_invoice")])]);
  const searchXml = await execute(url, db, uid, apiKey, "ir.actions.report", "search", [domain], struct({ limit: int(1) }));
  const reportIds = extractInts(searchXml);
  
  if (reportIds.length === 0) {
    throw new Error("Report 'account.report_invoice' not found in Odoo");
  }

  // Step 2: Call _render_qweb_pdf on the report action
  const reportArgs = array([int(reportIds[0]), array([int(invoiceId)])]);
  const pdfXml = await execute(url, db, uid, apiKey, "ir.actions.report", "_render_qweb_pdf", [reportArgs]);
  
  const b64 = extractBase64(pdfXml);
  if (!b64) throw new Error("No PDF data returned from Odoo report");

  const binaryString = atob(b64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

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

    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select("odoo_invoice_id, invoice_number")
      .eq("id", invoice_id)
      .single();

    if (invErr || !invoice?.odoo_invoice_id) {
      throw new Error("Invoice not found or not synced with Odoo");
    }

    // Authenticate and fetch PDF via XML-RPC object endpoint (Odoo 17+)
    const uid = await authenticate(ODOO_URL, ODOO_DB, ODOO_LOGIN, ODOO_API_KEY);
    const pdfBytes = await getInvoicePdf(ODOO_URL, ODOO_DB, uid, ODOO_API_KEY, invoice.odoo_invoice_id);

    return new Response(pdfBytes, {
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
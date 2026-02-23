import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── XML-RPC helpers ──

function xmlRpcCall(methodName: string, params: string[]): string {
  return `<?xml version="1.0"?>
<methodCall>
  <methodName>${methodName}</methodName>
  <params>${params.join("")}</params>
</methodCall>`;
}

function param(inner: string): string {
  return `<param><value>${inner}</value></param>`;
}
function str(v: string): string { return `<string>${escapeXml(v)}</string>`; }
function int(v: number): string { return `<int>${v}</int>`; }

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function array(items: string[]): string {
  return `<array><data>${items.map(v => `<value>${v}</value>`).join("")}</data></array>`;
}

function struct(fields: Record<string, string>): string {
  const members = Object.entries(fields)
    .map(([k, v]) => `<member><name>${k}</name><value>${v}</value></member>`)
    .join("");
  return `<struct>${members}</struct>`;
}

async function xmlRpcPost(url: string, body: string): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/xml" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`XML-RPC HTTP ${res.status}: ${text.substring(0, 300)}`);
  }
  return res.text();
}

function extractInt(xml: string): number | null {
  const m = xml.match(/<(?:int|i4)>(\d+)<\/(?:int|i4)>/);
  return m ? parseInt(m[1], 10) : null;
}

function extractInts(xml: string): number[] {
  return [...xml.matchAll(/<(?:int|i4)>(\d+)<\/(?:int|i4)>/g)].map(m => parseInt(m[1], 10));
}

function extractString(xml: string, fieldName: string): string | null {
  // Look for <name>fieldName</name><value><string>...</string></value>
  const re = new RegExp(`<name>${fieldName}</name>\\s*<value>\\s*<string>([\\s\\S]*?)</string>`, "m");
  const m = xml.match(re);
  return m ? m[1] : null;
}

function extractDouble(xml: string, fieldName: string): number {
  const re = new RegExp(`<name>${fieldName}</name>\\s*<value>\\s*<double>([\\d.]+)</double>`, "m");
  const m = xml.match(re);
  return m ? parseFloat(m[1]) : 0;
}

function extractFieldInts(xml: string, fieldName: string): number[] {
  // Extract array of ints inside a specific field
  const re = new RegExp(`<name>${fieldName}</name>\\s*<value>\\s*<array>\\s*<data>([\\s\\S]*?)</data>\\s*</array>`, "m");
  const m = xml.match(re);
  if (!m) return [];
  return [...m[1].matchAll(/<(?:int|i4)>(\d+)<\/(?:int|i4)>/g)].map(x => parseInt(x[1], 10));
}

function checkFault(xml: string): void {
  if (xml.includes("<fault>")) {
    const faultString = xml.match(/<name>faultString<\/name>\s*<value>\s*<string>([\s\S]*?)<\/string>/);
    throw new Error(`Odoo XML-RPC fault: ${faultString?.[1] || "Unknown fault"}`);
  }
}

// ── Odoo operations ──

async function authenticate(url: string, db: string, login: string, apiKey: string): Promise<number> {
  const body = xmlRpcCall("authenticate", [
    param(str(db)),
    param(str(login)),
    param(str(apiKey)),
    param(struct({})),
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

// ── Parse a single struct from read response ──
// This is a simplified parser that extracts key fields we need
function parseOrderRead(xml: string): { state: string | null; invoice_ids: number[] } {
  return {
    state: extractString(xml, "state"),
    invoice_ids: extractFieldInts(xml, "invoice_ids"),
  };
}

function parseInvoiceRead(xml: string): {
  name: string | null;
  invoice_date: string | null;
  invoice_date_due: string | null;
  amount_untaxed: number;
  amount_tax: number;
  amount_total: number;
  payment_state: string | null;
  move_type: string | null;
} {
  return {
    name: extractString(xml, "name"),
    invoice_date: extractString(xml, "invoice_date"),
    invoice_date_due: extractString(xml, "invoice_date_due"),
    amount_untaxed: extractDouble(xml, "amount_untaxed"),
    amount_tax: extractDouble(xml, "amount_tax"),
    amount_total: extractDouble(xml, "amount_total"),
    payment_state: extractString(xml, "payment_state"),
    move_type: extractString(xml, "move_type"),
  };
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Authenticate with Odoo
    const uid = await authenticate(ODOO_URL, ODOO_DB, ODOO_LOGIN, ODOO_API_KEY);

    // Optional: scope to a single order or poll all synced orders
    let body: any = {};
    try { body = await req.json(); } catch { /* cron call */ }
    const singleOrderId = body?.order_id;

    // Get orders synced with Odoo
    let query = supabase
      .from("orders")
      .select("id, tenant_id, odoo_order_id, odoo_order_status")
      .not("odoo_order_id", "is", null);

    if (singleOrderId) query = query.eq("id", singleOrderId);

    const { data: orders, error: ordersErr } = await query;
    if (ordersErr) throw ordersErr;
    if (!orders?.length) {
      return new Response(JSON.stringify({ success: true, message: "No synced orders to poll", updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let updatedOrders = 0;
    let updatedInvoices = 0;
    const errors: string[] = [];

    for (const order of orders) {
      try {
        // Read order from Odoo
        const fields = struct({ fields: array([str("state"), str("invoice_ids")]) });
        const readXml = await execute(ODOO_URL, ODOO_DB, uid, ODOO_API_KEY,
          "sale.order", "read", [array([int(order.odoo_order_id!)])], fields);

        const odooOrder = parseOrderRead(readXml);
        const newStatus = odooOrder.state;

        if (newStatus && newStatus !== order.odoo_order_status) {
          await supabase.from("orders").update({
            odoo_order_status: newStatus,
            odoo_synced_at: new Date().toISOString(),
          }).eq("id", order.id);
          updatedOrders++;

          await supabase.from("odoo_sync_log").insert({
            tenant_id: order.tenant_id,
            order_id: order.id,
            sync_type: "order_status_poll",
            direction: "pull",
            status: "success",
            odoo_model: "sale.order",
            odoo_record_id: order.odoo_order_id,
            response_payload: { state: newStatus },
          });
        }

        // Fetch invoices
        for (const invId of odooOrder.invoice_ids) {
          try {
            const invFields = struct({ fields: array([
              str("name"), str("invoice_date"), str("invoice_date_due"),
              str("amount_untaxed"), str("amount_tax"), str("amount_total"),
              str("payment_state"), str("move_type"),
            ]) });
            const invXml = await execute(ODOO_URL, ODOO_DB, uid, ODOO_API_KEY,
              "account.move", "read", [array([int(invId)])], invFields);

            const inv = parseInvoiceRead(invXml);
            if (inv.move_type !== "out_invoice") continue;

            const { data: existing } = await supabase
              .from("invoices")
              .select("id")
              .eq("odoo_invoice_id", invId)
              .single();

            const invoicePayload = {
              invoice_number: inv.name || `INV-${invId}`,
              invoice_date: inv.invoice_date || new Date().toISOString().split("T")[0],
              due_date: inv.invoice_date_due || null,
              amount_untaxed: inv.amount_untaxed,
              amount_tax: inv.amount_tax,
              amount_total: inv.amount_total,
              payment_status: inv.payment_state || "not_paid",
            };

            if (existing) {
              await supabase.from("invoices").update(invoicePayload).eq("id", existing.id);
            } else {
              await supabase.from("invoices").insert({
                ...invoicePayload,
                order_id: order.id,
                tenant_id: order.tenant_id,
                odoo_invoice_id: invId,
              });
            }
            updatedInvoices++;
          } catch (invErr: any) {
            errors.push(`Invoice ${invId}: ${invErr.message}`);
          }
        }
      } catch (orderErr: any) {
        errors.push(`Order ${order.id}: ${orderErr.message}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      orders_checked: orders.length,
      orders_updated: updatedOrders,
      invoices_synced: updatedInvoices,
      errors: errors.length ? errors : undefined,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Poll Odoo error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

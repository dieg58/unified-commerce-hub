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
function bool(v: boolean): string { return `<boolean>${v ? 1 : 0}</boolean>`; }

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

// Extract first <int> or <i4> value from XML-RPC response
function extractInt(xml: string): number | null {
  const m = xml.match(/<(?:int|i4)>(\d+)<\/(?:int|i4)>/);
  return m ? parseInt(m[1], 10) : null;
}

// Extract all <int>/<i4> values
function extractInts(xml: string): number[] {
  const matches = [...xml.matchAll(/<(?:int|i4)>(\d+)<\/(?:int|i4)>/g)];
  return matches.map(m => parseInt(m[1], 10));
}

// Extract boolean
function extractBool(xml: string): boolean {
  const m = xml.match(/<boolean>([01])<\/boolean>/);
  return m ? m[1] === "1" : false;
}

// Check for fault
function checkFault(xml: string): void {
  if (xml.includes("<fault>")) {
    const faultString = xml.match(/<name>faultString<\/name>\s*<value>\s*<string>([\s\S]*?)<\/string>/);
    throw new Error(`Odoo XML-RPC fault: ${faultString?.[1] || "Unknown fault"}`);
  }
}

// ── Odoo XML-RPC operations ──

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
  if (!uid) throw new Error("Odoo authentication failed. Check ODOO_URL, ODOO_DB, ODOO_LOGIN, ODOO_API_KEY.");
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

// ── Business logic ──

async function ensurePartner(url: string, db: string, uid: number, apiKey: string, profile: any): Promise<number> {
  // Search by email
  const domain = array([array([str("email"), str("="), str(profile.email)])]);
  const searchXml = await execute(url, db, uid, apiKey, "res.partner", "search", [domain],
    struct({ limit: int(1) }));
  
  const ids = extractInts(searchXml);
  if (ids.length > 0) return ids[0];

  // Create partner
  const vals = struct({
    name: str(profile.full_name || profile.email),
    email: str(profile.email),
    customer_rank: int(1),
  });
  const createXml = await execute(url, db, uid, apiKey, "res.partner", "create", [vals]);
  const newId = extractInt(createXml);
  if (!newId) throw new Error("Failed to create Odoo partner");
  return newId;
}

async function createSaleOrder(url: string, db: string, uid: number, apiKey: string, partnerId: number, order: any, items: any[]): Promise<number> {
  const orderLines = items.map((item: any) => {
    const lineVals = struct({
      name: str(item.products?.name || "Product"),
      product_uom_qty: int(item.qty),
      price_unit: `<double>${Number(item.unit_price)}</double>`,
    });
    // (0, 0, vals) tuple for one2many
    return array([int(0), int(0), lineVals]);
  });

  const vals = struct({
    partner_id: int(partnerId),
    client_order_ref: str(`INKOO-${order.id.slice(0, 8).toUpperCase()}`),
    origin: str(`INKOO-${order.id.slice(0, 8).toUpperCase()}`),
    order_line: array(orderLines),
  });

  const createXml = await execute(url, db, uid, apiKey, "sale.order", "create", [vals]);
  const newId = extractInt(createXml);
  if (!newId) throw new Error("Failed to create Odoo sale order");
  return newId;
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
      throw new Error("Odoo credentials not configured. Set ODOO_URL, ODOO_DB, ODOO_LOGIN, ODOO_API_KEY.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { order_id } = await req.json();
    if (!order_id) throw new Error("order_id is required");

    // Authenticate with Odoo
    const uid = await authenticate(ODOO_URL, ODOO_DB, ODOO_LOGIN, ODOO_API_KEY);
    console.log("Odoo authenticated, uid:", uid);

    // Fetch order with profile and items
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*, profiles:created_by(id, full_name, email, odoo_partner_id), order_items(qty, unit_price, products(name, sku)), entities(name, code)")
      .eq("id", order_id)
      .single();
    if (orderErr || !order) throw new Error(`Order not found: ${orderErr?.message}`);

    const profile = (order as any).profiles;
    const items = (order as any).order_items || [];

    // 1. Ensure partner exists in Odoo
    let partnerId = profile?.odoo_partner_id;
    if (!partnerId) {
      partnerId = await ensurePartner(ODOO_URL, ODOO_DB, uid, ODOO_API_KEY, profile);
      await supabase.from("profiles").update({ odoo_partner_id: partnerId }).eq("id", profile.id);
    }

    // Log sync attempt
    const logEntry = {
      tenant_id: order.tenant_id,
      order_id: order_id,
      sync_type: "order_push",
      direction: "push",
      odoo_model: "sale.order",
      request_payload: { partner_id: partnerId, items_count: items.length },
    };

    // 2. Create sale order in Odoo
    let odooOrderId: number;
    try {
      odooOrderId = await createSaleOrder(ODOO_URL, ODOO_DB, uid, ODOO_API_KEY, partnerId, order, items);
    } catch (e) {
      await supabase.from("odoo_sync_log").insert({
        ...logEntry,
        status: "error",
        error_message: e.message,
      });
      throw e;
    }

    // 3. Update order with Odoo info
    await supabase.from("orders").update({
      odoo_order_id: odooOrderId,
      odoo_order_status: "draft",
      odoo_synced_at: new Date().toISOString(),
    }).eq("id", order_id);

    // 4. Log success
    await supabase.from("odoo_sync_log").insert({
      ...logEntry,
      status: "success",
      odoo_record_id: odooOrderId,
      response_payload: { odoo_order_id: odooOrderId },
    });

    return new Response(JSON.stringify({
      success: true,
      odoo_order_id: odooOrderId,
      odoo_partner_id: partnerId,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Odoo sync error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

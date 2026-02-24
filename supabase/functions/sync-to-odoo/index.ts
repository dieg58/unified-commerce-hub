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
  const matches = [...xml.matchAll(/<(?:int|i4)>(\d+)<\/(?:int|i4)>/g)];
  return matches.map(m => parseInt(m[1], 10));
}

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

async function ensureProduct(url: string, db: string, uid: number, apiKey: string, name: string, sku: string, price: number): Promise<number> {
  const domain = array([array([str("default_code"), str("="), str(sku)])]);
  const searchXml = await execute(url, db, uid, apiKey, "product.product", "search", [domain],
    struct({ limit: int(1) }));
  const ids = extractInts(searchXml);
  if (ids.length > 0) return ids[0];

  const vals = struct({
    name: str(name),
    default_code: str(sku),
    list_price: `<double>${price}</double>`,
    type: str("consu"),
  });
  const createXml = await execute(url, db, uid, apiKey, "product.product", "create", [vals]);
  const newId = extractInt(createXml);
  if (!newId) throw new Error(`Failed to create Odoo product for SKU ${sku}`);
  return newId;
}

async function ensurePartner(url: string, db: string, uid: number, apiKey: string, profile: any): Promise<number> {
  const domain = array([array([str("email"), str("="), str(profile.email)])]);
  const searchXml = await execute(url, db, uid, apiKey, "res.partner", "search", [domain],
    struct({ limit: int(1) }));
  
  const ids = extractInts(searchXml);
  if (ids.length > 0) return ids[0];

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

async function createSaleOrder(url: string, db: string, uid: number, apiKey: string, partnerId: number, order: any, items: any[], supabase: any): Promise<number> {
  const orderLines: string[] = [];
  for (const item of items) {
    const productName = item.products?.name || "Product";
    const variantLabel = item.variant_label;
    const displayName = variantLabel ? `${productName} (${variantLabel})` : productName;
    const productSku = item.products?.sku || `INKOO-${Date.now()}`;
    const productPrice = Number(item.unit_price);
    const productId = item.products?.id;

    let odooProductId = item.products?.odoo_product_id;
    if (!odooProductId) {
      odooProductId = await ensureProduct(url, db, uid, apiKey, productName, productSku, productPrice);
      if (productId) {
        await supabase.from("products").update({ odoo_product_id: odooProductId }).eq("id", productId);
      }
    }

    const lineVals = struct({
      product_id: int(odooProductId),
      name: str(displayName),
      product_uom_qty: int(item.qty),
      price_unit: `<double>${productPrice}</double>`,
    });
    orderLines.push(array([int(0), int(0), lineVals]));
  }

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
      throw new Error("Odoo credentials not configured.");
    }

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authErr } = await callerClient.auth.getUser();
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const order_id = typeof body.order_id === "string" ? body.order_id.trim() : "";
    if (!order_id || !UUID_RE.test(order_id)) {
      return new Response(JSON.stringify({ error: "Valid order_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate with Odoo
    const uid = await authenticate(ODOO_URL, ODOO_DB, ODOO_LOGIN, ODOO_API_KEY);
    console.log("Odoo authenticated, uid:", uid);

    // Fetch order with profile and items
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*, profiles:created_by(id, full_name, email, odoo_partner_id), order_items(qty, unit_price, variant_label, products(id, name, sku, odoo_product_id)), entities!orders_entity_id_fkey(name, code)")
      .eq("id", order_id)
      .single();
    if (orderErr || !order) throw new Error("Order not found");

    const profile = (order as any).profiles;
    const items = (order as any).order_items || [];

    let partnerId = profile?.odoo_partner_id;
    if (!partnerId) {
      partnerId = await ensurePartner(ODOO_URL, ODOO_DB, uid, ODOO_API_KEY, profile);
      await supabase.from("profiles").update({ odoo_partner_id: partnerId }).eq("id", profile.id);
    }

    const logEntry = {
      tenant_id: order.tenant_id,
      order_id: order_id,
      sync_type: "order_push",
      direction: "push",
      odoo_model: "sale.order",
      request_payload: { partner_id: partnerId, items_count: items.length },
    };

    let odooOrderId: number;
    try {
      odooOrderId = await createSaleOrder(ODOO_URL, ODOO_DB, uid, ODOO_API_KEY, partnerId, order, items, supabase);
    } catch (e) {
      await supabase.from("odoo_sync_log").insert({
        ...logEntry,
        status: "error",
        error_message: (e as Error).message,
      });
      throw e;
    }

    await supabase.from("orders").update({
      odoo_order_id: odooOrderId,
      odoo_order_status: "draft",
      odoo_synced_at: new Date().toISOString(),
    }).eq("id", order_id);

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
    return new Response(JSON.stringify({ success: false, error: "Sync failed. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

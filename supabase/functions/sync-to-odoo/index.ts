import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Odoo REST API helper
async function odooRpc(url: string, db: string, login: string, apiKey: string, model: string, method: string, args: any[], kwargs: Record<string, any> = {}) {
  const endpoint = `${url}/api/v1/${model}/${method}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "X-Odoo-Db": db,
      "X-Odoo-Login": login,
    },
    body: JSON.stringify({ args, kwargs }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Odoo API error [${res.status}]: ${text}`);
  }
  return res.json();
}

// Search or create partner
async function ensurePartner(url: string, db: string, login: string, apiKey: string, profile: any) {
  // Search existing
  const searchRes = await fetch(`${url}/api/v1/res.partner?filters=[["email","=","${profile.email}"]]&limit=1`, {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "X-Odoo-Db": db,
      "X-Odoo-Login": login,
    },
  });
  const searchData = await searchRes.json();

  if (searchData?.data?.length > 0) {
    return searchData.data[0].id;
  }

  // Create partner
  const createRes = await fetch(`${url}/api/v1/res.partner`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "X-Odoo-Db": db,
      "X-Odoo-Login": login,
    },
    body: JSON.stringify({
      name: profile.full_name || profile.email,
      email: profile.email,
      customer_rank: 1,
    }),
  });
  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`Failed to create partner [${createRes.status}]: ${text}`);
  }
  const createData = await createRes.json();
  return createData?.data?.id || createData?.id;
}

// Create sale order
async function createSaleOrder(url: string, db: string, login: string, apiKey: string, partnerId: number, order: any, items: any[]) {
  const orderLines = items.map((item: any) => ({
    product_id: false, // Will use description instead
    name: item.products?.name || "Product",
    product_uom_qty: item.qty,
    price_unit: Number(item.unit_price),
  }));

  const createRes = await fetch(`${url}/api/v1/sale.order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "X-Odoo-Db": db,
      "X-Odoo-Login": login,
    },
    body: JSON.stringify({
      partner_id: partnerId,
      client_order_ref: order.id.slice(0, 8).toUpperCase(),
      origin: `INKOO-${order.id.slice(0, 8).toUpperCase()}`,
      order_line: orderLines.map((line: any) => [0, 0, line]),
    }),
  });
  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`Failed to create sale order [${createRes.status}]: ${text}`);
  }
  const createData = await createRes.json();
  return createData?.data?.id || createData?.id;
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
      partnerId = await ensurePartner(ODOO_URL, ODOO_DB, ODOO_LOGIN, ODOO_API_KEY, profile);
      // Save partner ID
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
      odooOrderId = await createSaleOrder(ODOO_URL, ODOO_DB, ODOO_LOGIN, ODOO_API_KEY, partnerId, order, items);
    } catch (e) {
      // Log failure
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

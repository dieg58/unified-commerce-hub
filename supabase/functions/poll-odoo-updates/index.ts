import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function odooGet(url: string, db: string, login: string, apiKey: string, endpoint: string) {
  const res = await fetch(`${url}${endpoint}`, {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "X-Odoo-Db": db,
      "X-Odoo-Login": login,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Odoo GET ${endpoint} [${res.status}]: ${text}`);
  }
  return res.json();
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

    // Optional: scope to a single order (manual refresh) or poll all synced orders
    let body: any = {};
    try {
      body = await req.json();
    } catch { /* empty body = cron call, poll all */ }

    const singleOrderId = body?.order_id;

    // 1. Get orders that have been synced to Odoo
    let query = supabase
      .from("orders")
      .select("id, tenant_id, odoo_order_id, odoo_order_status")
      .not("odoo_order_id", "is", null);

    if (singleOrderId) {
      query = query.eq("id", singleOrderId);
    }

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
        // 2. Fetch order status from Odoo
        const orderData = await odooGet(ODOO_URL, ODOO_DB, ODOO_LOGIN, ODOO_API_KEY,
          `/api/v1/sale.order/${order.odoo_order_id}?fields=state,invoice_ids`);

        const odooOrder = orderData?.data || orderData;
        const newStatus = odooOrder?.state;

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

        // 3. Fetch invoices linked to this Odoo order
        const invoiceIds = odooOrder?.invoice_ids || [];
        for (const invId of invoiceIds) {
          try {
            const invData = await odooGet(ODOO_URL, ODOO_DB, ODOO_LOGIN, ODOO_API_KEY,
              `/api/v1/account.move/${invId}?fields=name,invoice_date,invoice_date_due,amount_untaxed,amount_tax,amount_total,payment_state,move_type`);

            const inv = invData?.data || invData;
            if (inv?.move_type !== "out_invoice") continue;

            // Upsert invoice
            const { data: existing } = await supabase
              .from("invoices")
              .select("id, payment_status")
              .eq("odoo_invoice_id", invId)
              .single();

            const invoicePayload = {
              invoice_number: inv.name || `INV-${invId}`,
              invoice_date: inv.invoice_date || new Date().toISOString().split("T")[0],
              due_date: inv.invoice_date_due || null,
              amount_untaxed: inv.amount_untaxed || 0,
              amount_tax: inv.amount_tax || 0,
              amount_total: inv.amount_total || 0,
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

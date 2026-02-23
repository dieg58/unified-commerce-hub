import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-odoo-webhook-secret",
};

const VALID_EVENT_TYPES = ["order_status_update", "invoice_created", "invoice_updated", "payment_registered"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Webhook secret is REQUIRED
    const webhookSecret = Deno.env.get("ODOO_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("ODOO_WEBHOOK_SECRET is not configured");
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const incomingSecret = req.headers.get("x-odoo-webhook-secret");
    if (incomingSecret !== webhookSecret) {
      return new Response(JSON.stringify({ error: "Invalid webhook secret" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const { event_type, data } = payload;

    if (!event_type || !VALID_EVENT_TYPES.includes(event_type)) {
      return new Response(JSON.stringify({ error: "Invalid event_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Odoo webhook received:", event_type);

    switch (event_type) {
      case "order_status_update": {
        const { odoo_order_id, status } = data;
        if (!odoo_order_id) throw new Error("odoo_order_id required");

        const statusMap: Record<string, string> = {
          draft: "approved",
          sent: "approved",
          sale: "processing",
          done: "processing",
          cancel: "rejected",
        };
        const inkooStatus = statusMap[status] || status;

        const { data: order, error } = await supabase
          .from("orders")
          .update({ odoo_order_status: status })
          .eq("odoo_order_id", odoo_order_id)
          .select("id, tenant_id")
          .single();
        
        if (error) console.error("Order status update error:", error);
        if (order) {
          await supabase.from("odoo_sync_log").insert({
            tenant_id: order.tenant_id,
            order_id: order.id,
            sync_type: "order_status",
            direction: "pull",
            status: "success",
            odoo_model: "sale.order",
            odoo_record_id: odoo_order_id,
            response_payload: data,
          });
        }
        break;
      }

      case "invoice_created":
      case "invoice_updated": {
        const { odoo_invoice_id, odoo_order_id, invoice_number, invoice_date, due_date,
                amount_untaxed, amount_tax, amount_total, payment_status, pdf_url } = data;

        const { data: order } = await supabase
          .from("orders")
          .select("id, tenant_id")
          .eq("odoo_order_id", odoo_order_id)
          .single();

        if (!order) {
          console.warn("Order not found for odoo_order_id:", odoo_order_id);
          break;
        }

        const { data: existing } = await supabase
          .from("invoices")
          .select("id")
          .eq("odoo_invoice_id", odoo_invoice_id)
          .single();

        if (existing) {
          await supabase.from("invoices").update({
            invoice_number,
            invoice_date,
            due_date,
            amount_untaxed: amount_untaxed || 0,
            amount_tax: amount_tax || 0,
            amount_total: amount_total || 0,
            payment_status: payment_status || "not_paid",
            odoo_pdf_url: pdf_url,
          }).eq("id", existing.id);
        } else {
          await supabase.from("invoices").insert({
            order_id: order.id,
            tenant_id: order.tenant_id,
            odoo_invoice_id,
            invoice_number,
            invoice_date,
            due_date,
            amount_untaxed: amount_untaxed || 0,
            amount_tax: amount_tax || 0,
            amount_total: amount_total || 0,
            payment_status: payment_status || "not_paid",
            odoo_pdf_url: pdf_url,
          });
        }

        await supabase.from("odoo_sync_log").insert({
          tenant_id: order.tenant_id,
          order_id: order.id,
          sync_type: event_type,
          direction: "pull",
          status: "success",
          odoo_model: "account.move",
          odoo_record_id: odoo_invoice_id,
          response_payload: data,
        });
        break;
      }

      case "payment_registered": {
        const { odoo_invoice_id, payment_status } = data;
        
        const { error } = await supabase
          .from("invoices")
          .update({ payment_status: payment_status || "paid" })
          .eq("odoo_invoice_id", odoo_invoice_id);

        if (error) console.error("Payment update error:", error);
        break;
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ success: false, error: "Webhook processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

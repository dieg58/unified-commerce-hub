import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-odoo-webhook-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Optional: verify webhook secret
    const webhookSecret = Deno.env.get("ODOO_WEBHOOK_SECRET");
    if (webhookSecret) {
      const incomingSecret = req.headers.get("x-odoo-webhook-secret");
      if (incomingSecret !== webhookSecret) {
        return new Response(JSON.stringify({ error: "Invalid webhook secret" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload = await req.json();
    const { event_type, data } = payload;

    console.log("Odoo webhook received:", event_type, JSON.stringify(data));

    switch (event_type) {
      case "order_status_update": {
        // data: { odoo_order_id, status, origin }
        const { odoo_order_id, status } = data;
        if (!odoo_order_id) throw new Error("odoo_order_id required");

        // Map Odoo status to Inkoo status
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
        // data: { odoo_invoice_id, odoo_order_id, invoice_number, invoice_date, due_date,
        //         amount_untaxed, amount_tax, amount_total, payment_status, pdf_url }
        const { odoo_invoice_id, odoo_order_id, invoice_number, invoice_date, due_date,
                amount_untaxed, amount_tax, amount_total, payment_status, pdf_url } = data;

        // Find order by odoo_order_id
        const { data: order } = await supabase
          .from("orders")
          .select("id, tenant_id")
          .eq("odoo_order_id", odoo_order_id)
          .single();

        if (!order) {
          console.warn("Order not found for odoo_order_id:", odoo_order_id);
          break;
        }

        // Upsert invoice
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
        // data: { odoo_invoice_id, payment_status }
        const { odoo_invoice_id, payment_status } = data;
        
        const { error } = await supabase
          .from("invoices")
          .update({ payment_status: payment_status || "paid" })
          .eq("odoo_invoice_id", odoo_invoice_id);

        if (error) console.error("Payment update error:", error);
        break;
      }

      default:
        console.warn("Unknown event_type:", event_type);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

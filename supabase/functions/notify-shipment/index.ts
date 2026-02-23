import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shipment_id } = await req.json();
    if (!shipment_id) throw new Error("shipment_id is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch shipment with order + profile
    const { data: shipment, error: sErr } = await supabase
      .from("shipments")
      .select("*, orders(id, total, store_type, created_by, profiles:created_by(full_name, email), tenants:tenant_id(name))")
      .eq("id", shipment_id)
      .single();

    if (sErr || !shipment) throw new Error(sErr?.message || "Shipment not found");

    const order = shipment.orders as any;
    const profile = order?.profiles as any;
    const tenant = order?.tenants as any;
    const email = profile?.email;
    const name = profile?.full_name || "Client";

    if (!email) {
      return new Response(JSON.stringify({ ok: true, skipped: "no email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!resendKey) {
      console.warn("RESEND_API_KEY not set, skipping email");
      return new Response(JSON.stringify({ ok: true, skipped: "no resend key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trackingInfo = shipment.tracking_number
      ? `<p><strong>Numéro de suivi :</strong> ${shipment.tracking_number}</p>`
      : "";
    const carrierInfo = shipment.carrier
      ? `<p><strong>Transporteur :</strong> ${shipment.carrier}</p>`
      : "";

    const statusLabels: Record<string, string> = {
      preparing: "En préparation",
      shipped: "Expédié",
      delivered: "Livré",
    };
    const statusLabel = statusLabels[shipment.status] || shipment.status;

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#0ea5e9">Mise à jour de votre commande</h2>
        <p>Bonjour ${name},</p>
        <p>Votre commande <strong>#${order.id.slice(0, 8)}</strong> chez <strong>${tenant?.name || "la boutique"}</strong> a un nouveau statut :</p>
        <div style="background:#f0f9ff;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0"><strong>Statut :</strong> ${statusLabel}</p>
          ${carrierInfo}
          ${trackingInfo}
        </div>
        ${shipment.notes ? `<p><em>Note : ${shipment.notes}</em></p>` : ""}
        <p>Merci pour votre confiance !</p>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Inkoo <onboarding@resend.dev>",
        to: [email],
        subject: `Commande #${order.id.slice(0, 8)} — ${statusLabel}`,
        html,
      }),
    });

    const resendData = await resendRes.json();
    console.log("Email sent:", resendData);

    return new Response(JSON.stringify({ ok: true, resend: resendData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-shipment error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

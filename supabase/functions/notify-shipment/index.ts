import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeHtml(s: string): string {
  return s.replace(/[<>"'&]/g, (c) => {
    const map: Record<string, string> = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;' };
    return map[c] || c;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");

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

    const body = await req.json();
    const shipment_id = typeof body.shipment_id === "string" ? body.shipment_id.trim() : "";
    if (!shipment_id || !UUID_RE.test(shipment_id)) {
      return new Response(JSON.stringify({ error: "Valid shipment_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch shipment with order + profile
    const { data: shipment, error: sErr } = await supabase
      .from("shipments")
      .select("*, orders(id, total, store_type, created_by, profiles:created_by(full_name, email), tenants:tenant_id(name))")
      .eq("id", shipment_id)
      .single();

    if (sErr || !shipment) throw new Error("Shipment not found");

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
      ? `<p><strong>Numéro de suivi :</strong> ${sanitizeHtml(shipment.tracking_number)}</p>`
      : "";
    const carrierInfo = shipment.carrier
      ? `<p><strong>Transporteur :</strong> ${sanitizeHtml(shipment.carrier)}</p>`
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
        <p>Bonjour ${sanitizeHtml(name)},</p>
        <p>Votre commande <strong>#${sanitizeHtml(order.id.slice(0, 8))}</strong> chez <strong>${sanitizeHtml(tenant?.name || "la boutique")}</strong> a un nouveau statut :</p>
        <div style="background:#f0f9ff;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0"><strong>Statut :</strong> ${sanitizeHtml(statusLabel)}</p>
          ${carrierInfo}
          ${trackingInfo}
        </div>
        ${shipment.notes ? `<p><em>Note : ${sanitizeHtml(shipment.notes)}</em></p>` : ""}
        <p>Merci pour votre confiance !</p>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Inkoo <noreply@inkoo.be>",
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
    return new Response(JSON.stringify({ error: "Failed to send notification." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_EVENT_TYPES = ["order_confirmed", "order_shipped", "order_delivered", "approval_required", "order_rejected"];

function replaceVars(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value || "");
  }
  result = result.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, content) => {
    return vars[key] ? content : "";
  });
  return result;
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
    const order_id = typeof body.order_id === "string" ? body.order_id.trim() : "";
    const event_type = typeof body.event_type === "string" ? body.event_type.trim() : "";

    if (!order_id || !UUID_RE.test(order_id)) {
      return new Response(JSON.stringify({ error: "Valid order_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!event_type || !VALID_EVENT_TYPES.includes(event_type)) {
      return new Response(JSON.stringify({ error: "Valid event_type is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    if (!resendKey) {
      console.warn("RESEND_API_KEY not set, skipping email");
      return new Response(JSON.stringify({ ok: true, skipped: "no resend key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch template
    const { data: template, error: tErr } = await supabase
      .from("email_templates")
      .select("*")
      .eq("event_type", event_type)
      .single();

    if (tErr || !template) {
      console.warn("Template not found for event:", event_type);
      return new Response(JSON.stringify({ ok: true, skipped: "no template" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!template.enabled) {
      return new Response(JSON.stringify({ ok: true, skipped: "template disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch order with related data
    const { data: order, error: oErr } = await supabase
      .from("orders")
      .select("*, profiles:created_by(full_name, email), entities:entity_id(name), tenants:tenant_id(name)")
      .eq("id", order_id)
      .single();

    if (oErr || !order) throw new Error("Order not found");

    const profile = order.profiles as any;
    const entity = order.entities as any;
    const tenant = order.tenants as any;

    let recipientEmails: string[] = [];

    if (event_type === "approval_required") {
      const { data: managers } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["shop_manager", "dept_manager"]);

      if (managers?.length) {
        const managerIds = managers.map((m) => m.user_id);
        const { data: managerProfiles } = await supabase
          .from("profiles")
          .select("email")
          .in("id", managerIds)
          .eq("tenant_id", order.tenant_id);

        recipientEmails = managerProfiles?.map((p) => p.email).filter(Boolean) || [];
      }
    } else {
      recipientEmails = profile?.email ? [profile.email] : [];
    }

    if (!recipientEmails.length) {
      return new Response(JSON.stringify({ ok: true, skipped: "no recipients" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let carrier = "";
    let trackingNumber = "";
    let trackingUrl = "";

    if (event_type === "order_shipped" || event_type === "order_delivered") {
      const { data: shipments } = await supabase
        .from("shipments")
        .select("carrier, tracking_number")
        .eq("order_id", order_id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (shipments?.length) {
        carrier = shipments[0].carrier || "";
        trackingNumber = shipments[0].tracking_number || "";
        if (trackingNumber) {
          trackingUrl = `https://www.google.com/search?q=${encodeURIComponent(carrier + " tracking " + trackingNumber)}`;
        }
      }
    }

    const vars: Record<string, string> = {
      order_ref: order.id.slice(0, 8).toUpperCase(),
      order_total: Number(order.total).toFixed(2),
      customer_name: profile?.full_name || "Client",
      entity_name: entity?.name || "",
      tenant_name: tenant?.name || "Inkoo",
      carrier,
      tracking_number: trackingNumber,
      tracking_url: trackingUrl,
    };

    const subject = replaceVars(template.subject, vars);
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        ${replaceVars(template.body_html, vars)}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
        <p style="font-size:12px;color:#9ca3af;text-align:center">
          Cet email a été envoyé automatiquement par ${vars.tenant_name} via Inkoo.
        </p>
      </div>
    `;

    const results = [];
    for (const to of recipientEmails) {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Inkoo <noreply@inkoo.be>",
          to: [to],
          subject,
          html,
        }),
      });

      const resendData = await resendRes.json();
      console.log(`Email sent to ${to}:`, resendData);

      await supabase.from("email_logs").insert({
        event_type,
        recipient_email: to,
        subject,
        order_id,
        tenant_id: order.tenant_id,
        status: resendRes.ok ? "sent" : "failed",
        error: resendRes.ok ? null : JSON.stringify(resendData),
      });

      results.push({ to, status: resendRes.ok ? "sent" : "failed" });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-order-email error:", err);
    return new Response(JSON.stringify({ error: "Failed to send email." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

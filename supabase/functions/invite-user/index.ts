import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_ROLES = ["super_admin", "shop_manager", "dept_manager", "employee"] as const;

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller identity
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

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check caller is super_admin or shop_manager
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);
    const roles = callerRoles?.map((r: any) => r.role) || [];
    if (!roles.includes("super_admin") && !roles.includes("shop_manager")) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    // Validate inputs
    const email = typeof body.email === "string" ? body.email.trim().slice(0, 255) : "";
    const full_name = typeof body.full_name === "string" ? body.full_name.trim().slice(0, 100) : "";
    const role = typeof body.role === "string" ? body.role.trim() : "";
    const tenant_id = typeof body.tenant_id === "string" ? body.tenant_id.trim() : "";

    if (!email || !tenant_id || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!EMAIL_RE.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!UUID_RE.test(tenant_id)) {
      return new Response(JSON.stringify({ error: "Invalid tenant_id format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!VALID_ROLES.includes(role as any)) {
      return new Response(JSON.stringify({ error: "Invalid role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let userId: string;
    let tempPassword = "";

    if (existingUser) {
      userId = existingUser.id;
      tempPassword = crypto.randomUUID().slice(0, 8) + "Xk1!";
      await adminClient.auth.admin.updateUserById(userId, { password: tempPassword });
      await adminClient
        .from("profiles")
        .update({ tenant_id, full_name: full_name || existingUser.user_metadata?.full_name || "" })
        .eq("id", userId);
    } else {
      tempPassword = crypto.randomUUID().slice(0, 8) + "Xk1!";
      const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: full_name || "" },
      });
      if (createErr) {
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = newUser.user!.id;

      await new Promise((r) => setTimeout(r, 500));
      await adminClient
        .from("profiles")
        .update({ tenant_id, full_name: full_name || "" })
        .eq("id", userId);
    }

    // Set role
    await adminClient.from("user_roles").delete().eq("user_id", userId);
    await adminClient.from("user_roles").insert({ user_id: userId, role });

    // Update invitation status
    await adminClient
      .from("invitations")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("tenant_id", tenant_id)
      .eq("email", email.toLowerCase());

    // Send invitation email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      const safeName = sanitizeHtml(full_name);
      const safeEmail = sanitizeHtml(email);

      const roleLabels: Record<string, string> = {
        super_admin: "Super Administrateur",
        shop_manager: "Gestionnaire de boutique",
        dept_manager: "Responsable de département",
        employee: "Collaborateur",
      };
      const roleLabel = roleLabels[role] || role;

      let subject: string;
      let contentBlock: string;

      if (!existingUser) {
        subject = "🎉 Bienvenue sur Inkoo — Votre compte est prêt !";
        contentBlock = `
          <h1 style="margin:0 0 8px;font-size:24px;color:#1a1a1a;">Bienvenue${safeName ? `, ${safeName}` : ""} !</h1>
          <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
            Vous avez été invité(e) à rejoindre la plateforme <strong>Inkoo</strong> en tant que <strong>${sanitizeHtml(roleLabel)}</strong>.
          </p>
          <div style="background:#f8f9fa;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Vos identifiants de connexion</p>
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:8px 0;color:#555;font-size:14px;width:100px;">Email</td>
                <td style="padding:8px 0;font-weight:600;color:#1a1a1a;font-size:14px;">${safeEmail}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#555;font-size:14px;">Mot de passe</td>
                <td style="padding:8px 0;font-weight:600;color:#1a1a1a;font-size:14px;font-family:monospace;letter-spacing:1px;">${sanitizeHtml(tempPassword)}</td>
              </tr>
            </table>
          </div>
          <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.5;">
            Nous vous recommandons de <strong>modifier votre mot de passe</strong> après votre première connexion.
          </p>`;
      } else {
        subject = "📬 Vous avez été ajouté(e) à une nouvelle boutique";
        contentBlock = `
          <h1 style="margin:0 0 8px;font-size:24px;color:#1a1a1a;">Bonjour${safeName ? `, ${safeName}` : ""} !</h1>
          <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
            Vous avez été ajouté(e) à une nouvelle boutique en tant que <strong>${sanitizeHtml(roleLabel)}</strong>.
          </p>
          <div style="background:#f8f9fa;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Vos identifiants de connexion</p>
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:8px 0;color:#555;font-size:14px;width:100px;">Email</td>
                <td style="padding:8px 0;font-weight:600;color:#1a1a1a;font-size:14px;">${safeEmail}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#555;font-size:14px;">Mot de passe</td>
                <td style="padding:8px 0;font-weight:600;color:#1a1a1a;font-size:14px;font-family:monospace;letter-spacing:1px;">${sanitizeHtml(tempPassword)}</td>
              </tr>
            </table>
          </div>
          <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.5;">
            Nous vous recommandons de <strong>modifier votre mot de passe</strong> après votre connexion.
          </p>`;
      }

      const emailHtml = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#292929,#3d3d3d);padding:32px 40px;text-align:center;">
          <h2 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">INKOO</h2>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">Plateforme de commandes B2B</p>
        </td></tr>
        <tr><td style="padding:36px 40px 20px;">
          ${contentBlock}
          <div style="text-align:center;margin:8px 0 28px;">
            <a href="https://b2b-inkoo.lovable.app/login" style="display:inline-block;background:#292929;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;">
              Se connecter
            </a>
          </div>
        </td></tr>
        <tr><td style="padding:20px 40px 28px;border-top:1px solid #eee;text-align:center;">
          <p style="margin:0;color:#aaa;font-size:12px;line-height:1.5;">
            Cet email a été envoyé automatiquement par Inkoo.<br>
            Si vous n'êtes pas à l'origine de cette demande, veuillez ignorer cet email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: "Inkoo <noreply@inkoo.eu>",
          to: [email],
          subject,
          html: emailHtml,
        }),
      });
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId, is_new: !existingUser }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("invite-user error:", err);
    return new Response(JSON.stringify({ error: "An error occurred processing the invitation." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

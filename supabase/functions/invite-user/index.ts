import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const { email, full_name, role, tenant_id } = await req.json();

    if (!email || !tenant_id || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
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

    if (existingUser) {
      userId = existingUser.id;
      // Update profile to assign to tenant
      await adminClient
        .from("profiles")
        .update({ tenant_id, full_name: full_name || existingUser.user_metadata?.full_name || "" })
        .eq("id", userId);
    } else {
      // Create new user with a random password - they'll reset via email
      const tempPassword = crypto.randomUUID() + "A1!";
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

      // Wait briefly for trigger to create profile, then update tenant_id
      await new Promise((r) => setTimeout(r, 500));
      await adminClient
        .from("profiles")
        .update({ tenant_id, full_name: full_name || "" })
        .eq("id", userId);
    }

    // Set role (delete existing roles first)
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
      let emailBody: string;
      let subject: string;

      if (!existingUser) {
        // New user: generate a password reset link so they can set their password
        const { data: linkData } = await adminClient.auth.admin.generateLink({
          type: "recovery",
          email,
        });
        const resetLink = linkData?.properties?.action_link || "";
        subject = "Vous êtes invité(e) à rejoindre la plateforme";
        emailBody = `<h2>Bienvenue ${full_name || ""} !</h2>
          <p>Vous avez été invité(e) à rejoindre la plateforme en tant que <strong>${role}</strong>.</p>
          <p>Cliquez sur le lien ci-dessous pour définir votre mot de passe et accéder à votre compte :</p>
          <p><a href="${resetLink}" style="background:#292929;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Définir mon mot de passe</a></p>
          <p>Si le bouton ne fonctionne pas, copiez ce lien : ${resetLink}</p>`;
      } else {
        subject = "Vous avez été ajouté(e) à une nouvelle boutique";
        emailBody = `<h2>Bonjour ${full_name || ""} !</h2>
          <p>Vous avez été ajouté(e) à une boutique en tant que <strong>${role}</strong>.</p>
          <p>Connectez-vous à la plateforme pour y accéder.</p>`;
      }

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: "Inkoo <onboarding@resend.dev>",
          to: [email],
          subject,
          html: emailBody,
        }),
      });
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId, is_new: !existingUser }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

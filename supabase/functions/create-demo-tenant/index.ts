import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function generatePassword(len = 16): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const fullName = String(body.full_name || "").trim().slice(0, 100);
    const email = String(body.email || "").trim().toLowerCase().slice(0, 255);
    const company = String(body.company || "").trim().slice(0, 100);
    const phone = String(body.phone || "").trim().slice(0, 30);
    const websiteUrl = String(body.website_url || "").trim().slice(0, 500);

    // Validate
    if (!fullName || !email || !company) {
      return new Response(JSON.stringify({ error: "full_name, email, company required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Create user (or reuse existing)
    const password = generatePassword();
    let userId: string;
    const { data: userData, error: userErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (userErr) {
      if (userErr.message?.includes("already been registered")) {
        const { data: listData } = await supabase.auth.admin.listUsers();
        const existingUser = listData?.users?.find((u: any) => u.email === email);
        if (!existingUser) throw new Error("User exists but could not be found");
        userId = existingUser.id;
        await supabase.auth.admin.updateUserById(userId, { password });
      } else {
        throw new Error(`User creation failed: ${userErr.message}`);
      }
    } else {
      userId = userData.user.id;
    }

    // Check if user already has a tenant (returning user)
    const { data: existingProfile } = await supabase
      .from("profiles").select("tenant_id").eq("id", userId).single();
    if (existingProfile?.tenant_id) {
      const { data: existingTenant } = await supabase
        .from("tenants").select("slug").eq("id", existingProfile.tenant_id).single();
      console.log(`Returning existing demo for ${email}: ${existingTenant?.slug}`);
      return new Response(JSON.stringify({ slug: existingTenant?.slug || "", email, password }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: only for truly new tenants, check duplicate email in last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from("demo_requests")
      .select("id")
      .eq("email", email)
      .gte("created_at", since)
      .limit(1);
    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ error: "Demo already requested recently" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert demo_requests (lead tracking)
    await supabase.from("demo_requests").insert({
      full_name: fullName, email, company, phone: phone || null,
    });

    // 3. Create tenant
    let slug = toSlug(company);
    const { data: slugCheck } = await supabase.from("tenants").select("id").eq("slug", slug).limit(1);
    if (slugCheck && slugCheck.length > 0) {
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    }
    const { data: tenant, error: tenantErr } = await supabase
      .from("tenants")
      .insert({ name: company, slug, status: "demo" })
      .select("id")
      .single();
    if (tenantErr) throw new Error(`Tenant creation failed: ${tenantErr.message}`);
    const tenantId = tenant.id;

    // 4. Branding - try extract from website or use defaults
    let brandingData: Record<string, string> = {
      primary_color: "#0ea5e9",
      accent_color: "#10b981",
      secondary_color: "#f5f5f4",
      text_color: "#1a1a1a",
      background_color: "#ffffff",
      button_text_color: "#ffffff",
    };

    if (websiteUrl) {
      try {
        const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
        if (firecrawlKey) {
          let formattedUrl = websiteUrl;
          if (!formattedUrl.startsWith("http")) formattedUrl = `https://${formattedUrl}`;
          const fcRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ url: formattedUrl, formats: ["branding"], onlyMainContent: true }),
          });
          if (fcRes.ok) {
            const fcData = await fcRes.json();
            const b = fcData.data?.branding || fcData.branding || {};
            if (b.colors?.primary) brandingData.primary_color = b.colors.primary;
            if (b.colors?.accent || b.colors?.secondary) brandingData.accent_color = b.colors.accent || b.colors.secondary;
            if (b.images?.logo) brandingData.logo_url = b.images.logo;
            if (b.images?.favicon) brandingData.favicon_url = b.images.favicon;
          }
        }
      } catch (e) {
        console.warn("Branding extraction failed, using defaults:", e);
      }
    }

    await supabase.from("tenant_branding").insert({ tenant_id: tenantId, ...brandingData });

    // 5. Attach profile to tenant
    await supabase.from("profiles").update({ tenant_id: tenantId }).eq("id", userId);

    // 6. Assign shop_manager role
    await supabase.from("user_roles").insert({ user_id: userId, role: "shop_manager" });

    // 7. Create HQ entity + budgets
    const { data: entity } = await supabase
      .from("entities")
      .insert({ tenant_id: tenantId, name: "Siège", code: "HQ" })
      .select("id")
      .single();

    if (entity) {
      await supabase.from("budgets").insert([
        { tenant_id: tenantId, entity_id: entity.id, store_type: "bulk", amount: 10000 },
        { tenant_id: tenantId, entity_id: entity.id, store_type: "staff", amount: 5000 },
      ]);

      // 8. Seed demo products (fire-and-forget)
      try {
        // Call seed-demo-products internally with service role
        const seedRes = await fetch(`${supabaseUrl}/functions/v1/seed-demo-products`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tenant_id: tenantId, entity_id: entity.id }),
        });
        const seedBody = await seedRes.text();
        console.log("Seed result:", seedBody);
      } catch (e) {
        console.warn("Seed demo products failed (non-blocking):", e);
      }
    }

    // 9. Send notification email to diego@inkoo.eu
    try {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Inkoo <noreply@inkoo.eu>",
            to: ["diego@inkoo.eu"],
            subject: `🆕 Nouveau lead démo : ${company}`,
            html: `
              <h2>Nouveau lead — Boutique démo créée</h2>
              <table style="border-collapse:collapse;width:100%;max-width:500px;">
                <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Nom</td><td style="padding:8px;border:1px solid #ddd;">${fullName}</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Email</td><td style="padding:8px;border:1px solid #ddd;">${email}</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Entreprise</td><td style="padding:8px;border:1px solid #ddd;">${company}</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Téléphone</td><td style="padding:8px;border:1px solid #ddd;">${phone || "—"}</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Site web</td><td style="padding:8px;border:1px solid #ddd;">${websiteUrl || "—"}</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Slug</td><td style="padding:8px;border:1px solid #ddd;">${slug}.inkoo.eu</td></tr>
              </table>
            `,
          }),
        });
      }
    } catch (e) {
      console.warn("Email notification failed (non-blocking):", e);
    }

    console.log(`✓ Demo tenant created: ${slug} for ${email}`);

    return new Response(JSON.stringify({ slug, email, password }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("create-demo-tenant error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

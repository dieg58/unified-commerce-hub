import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all products with low_stock_threshold > 0, including variants
    const { data: products, error: pErr } = await supabase
      .from("products")
      .select("*, product_variants(*), tenants(name, slug)")
      .gt("low_stock_threshold", 0)
      .eq("active", true);

    if (pErr) throw pErr;
    if (!products?.length) {
      return new Response(JSON.stringify({ success: true, message: "No products with stock alerts" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group alerts by tenant
    const alertsByTenant: Record<string, { tenantName: string; tenantId: string; alerts: any[] }> = {};

    for (const p of products) {
      const threshold = p.low_stock_threshold;
      const variants = (p.product_variants as any[]) || [];
      const lowItems: any[] = [];

      if (variants.length > 0) {
        for (const v of variants) {
          if (v.stock_qty <= threshold) {
            lowItems.push({
              productName: p.name,
              sku: p.sku,
              variant: v.variant_value,
              qty: v.stock_qty,
              threshold,
              location: v.location || p.location || "—",
            });
          }
        }
      } else {
        if (p.stock_qty <= threshold) {
          lowItems.push({
            productName: p.name,
            sku: p.sku,
            variant: null,
            qty: p.stock_qty,
            threshold,
            location: p.location || "—",
          });
        }
      }

      if (lowItems.length > 0) {
        const tenantId = p.tenant_id;
        if (!alertsByTenant[tenantId]) {
          alertsByTenant[tenantId] = {
            tenantName: (p.tenants as any)?.name || "Boutique",
            tenantId,
            alerts: [],
          };
        }
        alertsByTenant[tenantId].alerts.push(...lowItems);
      }
    }

    if (Object.keys(alertsByTenant).length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No low stock alerts" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get recipients: super_admins + shop_managers per tenant
    const { data: superAdmins } = await supabase
      .from("user_roles")
      .select("user_id, profiles(email, full_name)")
      .eq("role", "super_admin");

    const superAdminEmails = (superAdmins || [])
      .map((r: any) => r.profiles?.email)
      .filter(Boolean);

    let emailsSent = 0;

    for (const [tenantId, { tenantName, alerts }] of Object.entries(alertsByTenant)) {
      // Get shop_managers for this tenant
      const { data: managers } = await supabase
        .from("user_roles")
        .select("user_id, profiles(email, full_name, tenant_id)")
        .eq("role", "shop_manager");

      const managerEmails = (managers || [])
        .filter((r: any) => r.profiles?.tenant_id === tenantId)
        .map((r: any) => r.profiles?.email)
        .filter(Boolean);

      const recipients = [...new Set([...superAdminEmails, ...managerEmails])];
      if (recipients.length === 0) continue;

      const alertRows = alerts.map((a: any) =>
        `<tr>
          <td style="padding:8px;border:1px solid #e5e5e5">${a.productName}</td>
          <td style="padding:8px;border:1px solid #e5e5e5;font-family:monospace">${a.sku}${a.variant ? ` (${a.variant})` : ""}</td>
          <td style="padding:8px;border:1px solid #e5e5e5;color:#dc2626;font-weight:bold">${a.qty}</td>
          <td style="padding:8px;border:1px solid #e5e5e5">${a.threshold}</td>
          <td style="padding:8px;border:1px solid #e5e5e5">${a.location}</td>
        </tr>`
      ).join("");

      const htmlBody = `
        <h2 style="color:#dc2626">⚠️ Alerte stock bas — ${tenantName}</h2>
        <p>Les produits suivants sont en dessous du seuil de stock minimum configuré :</p>
        <table style="border-collapse:collapse;width:100%;margin:16px 0">
          <tr style="background:#f5f5f5">
            <th style="padding:8px;border:1px solid #e5e5e5;text-align:left">Produit</th>
            <th style="padding:8px;border:1px solid #e5e5e5;text-align:left">SKU</th>
            <th style="padding:8px;border:1px solid #e5e5e5;text-align:left">Stock actuel</th>
            <th style="padding:8px;border:1px solid #e5e5e5;text-align:left">Seuil</th>
            <th style="padding:8px;border:1px solid #e5e5e5;text-align:left">Emplacement</th>
          </tr>
          ${alertRows}
        </table>
        <p style="color:#6b7280;font-size:12px">Cet email a été envoyé automatiquement par Inkoo.</p>
      `;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Inkoo <noreply@inkoo.be>",
          to: recipients,
          subject: `⚠️ Alerte stock bas — ${tenantName} (${alerts.length} produit${alerts.length > 1 ? "s" : ""})`,
          html: htmlBody,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error(`Resend error for tenant ${tenantId}:`, data);
      } else {
        emailsSent++;
      }
    }

    return new Response(JSON.stringify({ success: true, emailsSent, tenantsAlerted: Object.keys(alertsByTenant).length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error checking low stock:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

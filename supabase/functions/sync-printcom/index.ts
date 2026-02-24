import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_BASE = "https://api.print.com";
const BATCH_SIZE = 50;

async function loginPrintcom(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credentials: { username: email, password } }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Print.com login failed [${res.status}]: ${text}`);
  }
  const token = await res.text();
  // Token may be returned as JSON string or plain text
  return token.replace(/^"|"$/g, "").trim();
}

async function fetchCategories(token: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/products/categories`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Print.com categories failed [${res.status}]: ${text}`);
  }
  return res.json();
}

async function fetchProductDetails(token: string, sku: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/products/${sku}?view=reseller`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pcEmail = Deno.env.get("PRINTCOM_EMAIL");
    const pcPassword = Deno.env.get("PRINTCOM_PASSWORD");
    if (!pcEmail || !pcPassword) {
      return new Response(JSON.stringify({ error: "Print.com credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Optional action parameter
    let action = "sync";
    try {
      const body = await req.json();
      if (body?.action) action = body.action;
    } catch { /* no body */ }

    // ── 1. Login to Print.com ──
    console.log("Logging in to Print.com...");
    const token = await loginPrintcom(pcEmail, pcPassword);
    console.log("Login successful");

    // ── 2. Fetch categories ──
    if (action === "categories") {
      const categories = await fetchCategories(token);
      return new Response(
        JSON.stringify({ categories }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. Full sync: fetch categories then product details ──
    console.log("Fetching Print.com categories...");
    const categories = await fetchCategories(token);
    console.log(`Found ${categories.length} categories`);

    let created = 0;
    let updated = 0;
    let errors = 0;
    const now = new Date().toISOString();

    // Process categories in batches
    const batch: Array<{ printId: string; payload: Record<string, any> }> = [];

    for (const cat of categories) {
      try {
        const catName = cat.name || cat.sku || "Unknown";
        const catSku = cat.sku || cat.name;
        
        // Try to get product details for richer info
        let description: string | null = null;
        let imageUrl: string | null = null;

        try {
          const details = await fetchProductDetails(token, catSku);
          if (details) {
            description = details.description || details.title || null;
            // Check for image in product details
            if (details.images?.length > 0) {
              imageUrl = details.images[0]?.url || details.images[0] || null;
            } else if (details.image) {
              imageUrl = details.image;
            }
          }
        } catch {
          // Product details optional, continue without
        }

        // Clean category name for display
        const displayName = catName
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase());

        batch.push({
          printId: `PRINT-${catSku}`,
          payload: {
            name: displayName,
            sku: catSku,
            category: "Print",
            description,
            image_url: imageUrl,
            stock_qty: 9999, // Print on demand = always available
            base_price: 0, // Price depends on configuration
            is_new: false,
            active: true,
            last_synced_at: now,
          },
        });

        // Flush batch when full
        if (batch.length >= BATCH_SIZE) {
          await flushBatch(supabase, batch);
          created += batch.filter(b => !b._existed).length;
          updated += batch.filter(b => b._existed).length;
          batch.length = 0;
        }
      } catch {
        errors++;
      }
    }

    // Flush remaining
    if (batch.length > 0) {
      const result = await flushBatchWithCounts(supabase, batch);
      created += result.created;
      updated += result.updated;
    }

    console.log(`Done: ${created} created, ${updated} updated, ${errors} errors`);

    return new Response(
      JSON.stringify({ success: true, total: categories.length, created, updated, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Print.com sync error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function flushBatchWithCounts(
  supabase: any,
  batch: Array<{ printId: string; payload: Record<string, any> }>
): Promise<{ created: number; updated: number }> {
  const printIds = batch.map((b) => b.printId);
  const { data: existing } = await supabase
    .from("catalog_products")
    .select("id, midocean_id")
    .in("midocean_id", printIds);

  const existingMap = new Map<string, string>();
  for (const e of existing || []) {
    if (e.midocean_id) existingMap.set(e.midocean_id, e.id);
  }

  let created = 0;
  let updated = 0;

  const toInsert: any[] = [];
  const toUpdate: Array<{ id: string; payload: Record<string, any> }> = [];

  for (const b of batch) {
    const existingId = existingMap.get(b.printId);
    if (existingId) {
      toUpdate.push({ id: existingId, payload: b.payload });
    } else {
      toInsert.push({ ...b.payload, midocean_id: b.printId, active: true });
    }
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("catalog_products").insert(toInsert);
    if (error) {
      console.error("Insert err:", error.message);
    } else {
      created = toInsert.length;
    }
  }

  for (const u of toUpdate) {
    await supabase.from("catalog_products").update(u.payload).eq("id", u.id);
    updated++;
  }

  return { created, updated };
}

// Keep backward compat
async function flushBatch(supabase: any, batch: any[]) {
  await flushBatchWithCounts(supabase, batch);
}

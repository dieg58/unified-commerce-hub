import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_BASE = "https://api.print.com";

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
  const raw = await res.text();
  // Token is returned as a JSON string (with quotes)
  try {
    const json = JSON.parse(raw);
    if (typeof json === "string") return json;
    if (json.token) return json.token;
    if (json.access_token) return json.access_token;
  } catch { /* plain text */ }
  return raw.replace(/^"|"$/g, "").trim();
}

async function fetchProducts(token: string): Promise<any> {
  const res = await fetch(`${API_BASE}/products`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Print.com products failed [${res.status}]: ${text}`);
  }
  return res.json();
}

async function fetchProductDetail(token: string, sku: string): Promise<any | null> {
  const res = await fetch(`${API_BASE}/products/${sku}?view=reseller`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

// Known Print.com product SKUs (common ones)
const KNOWN_SKUS = [
  "business_cards", "flyers", "posters", "folders", "brochures", "booklets",
  "stickers", "labels", "envelopes", "letterheads", "postcards", "greeting_cards",
  "calendars", "magazines", "notepads", "banners", "rollup_banners", "flags",
  "packaging", "boxes", "bags", "t_shirts", "hoodies", "caps",
  "mugs", "coasters", "mouse_pads", "usb_sticks", "pens", "lanyards",
  "keychains", "magnets", "puzzles", "canvas", "photo_prints", "wall_calendars",
  "desk_calendars", "presentation_folders", "certificates", "menus",
  "invitations", "thank_you_cards", "name_badges", "door_hangers",
  "table_tents", "tent_cards", "hang_tags", "wrapping_paper",
];

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

    // ── 1. Login to Print.com ──
    console.log("Logging in to Print.com...");
    const token = await loginPrintcom(pcEmail, pcPassword);
    console.log("Login successful");

    // ── 2. Try /products endpoint first ──
    console.log("Fetching Print.com products...");
    let productList: any[] = [];
    
    try {
      const productsData = await fetchProducts(token);
      console.log("Products response type:", typeof productsData, Array.isArray(productsData));
      
      if (Array.isArray(productsData)) {
        productList = productsData;
      } else if (productsData && typeof productsData === "object") {
        // Could be { products: [...] } or { data: [...] } or { skus: [...] }
        const keys = Object.keys(productsData);
        console.log("Products response keys:", keys.join(", "));
        
        if (productsData.products) productList = productsData.products;
        else if (productsData.data) productList = productsData.data;
        else if (productsData.skus) {
          productList = productsData.skus.map((sku: string) => ({ sku, name: sku }));
        } else {
          // Log first 500 chars for debugging
          console.log("Products response preview:", JSON.stringify(productsData).substring(0, 500));
          // Use the object keys as product SKUs if they look like product entries
          productList = keys.map(k => ({ sku: k, name: k, ...productsData[k] }));
        }
      }
    } catch (err) {
      console.log("Products endpoint error:", err instanceof Error ? err.message : String(err));
      console.log("Falling back to known SKUs...");
      
      // Fallback: try known SKUs individually
      for (const sku of KNOWN_SKUS) {
        const detail = await fetchProductDetail(token, sku);
        if (detail) {
          productList.push({ sku, name: detail.name || detail.title || sku, ...detail });
        }
      }
    }

    console.log(`Found ${productList.length} products`);

    // ── 3. Upsert into catalog_products ──
    const now = new Date().toISOString();
    let created = 0;
    let updated = 0;
    let errors = 0;

    // Build all payloads first
    const allPayloads: any[] = [];
    for (const product of productList) {
      try {
        const sku = product.sku || product.slug || product.id || "unknown";
        const printId = `PRINT-${sku}`;
        const displayName = (product.name || product.title || sku)
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase());

        let imageUrl: string | null = null;
        if (product.images?.length > 0) {
          imageUrl = product.images[0]?.url || product.images[0] || null;
        } else if (product.image) {
          imageUrl = typeof product.image === "string" ? product.image : product.image?.url || null;
        } else if (product.thumbnail) {
          imageUrl = product.thumbnail;
        }

        allPayloads.push({
          name: displayName,
          sku,
          category: "Print",
          description: product.description || null,
          image_url: imageUrl,
          stock_qty: 9999,
          base_price: 0,
          is_new: false,
          active: true,
          last_synced_at: now,
          midocean_id: printId,
        });
      } catch { errors++; }
    }

    // Fetch existing PRINT- entries to know what to update vs insert
    const printIds = allPayloads.map(p => p.midocean_id);
    const existingMap = new Map<string, string>();
    
    // Fetch in batches of 200
    for (let i = 0; i < printIds.length; i += 200) {
      const chunk = printIds.slice(i, i + 200);
      const { data: existing } = await supabase
        .from("catalog_products")
        .select("id, midocean_id")
        .in("midocean_id", chunk);
      for (const e of existing || []) {
        if (e.midocean_id) existingMap.set(e.midocean_id, e.id);
      }
    }

    const toInsert: any[] = [];
    const toUpdate: Array<{ id: string; payload: any }> = [];

    for (const p of allPayloads) {
      const existingId = existingMap.get(p.midocean_id);
      if (existingId) {
        const { midocean_id, ...rest } = p;
        toUpdate.push({ id: existingId, payload: rest });
      } else {
        toInsert.push(p);
      }
    }

    // Batch insert (50 at a time)
    const BATCH = 50;
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const batch = toInsert.slice(i, i + BATCH);
      const { error: insertErr } = await supabase.from("catalog_products").insert(batch);
      if (insertErr) {
        console.error(`Insert batch error at ${i}:`, insertErr.message);
        errors += batch.length;
      } else {
        created += batch.length;
      }
    }

    // Batch update (use Promise.all with chunks for speed)
    for (let i = 0; i < toUpdate.length; i += BATCH) {
      const batch = toUpdate.slice(i, i + BATCH);
      await Promise.all(batch.map(u =>
        supabase.from("catalog_products").update(u.payload).eq("id", u.id)
      ));
      updated += batch.length;
    }

    console.log(`Done: ${created} created, ${updated} updated, ${errors} errors`);

    return new Response(
      JSON.stringify({ success: true, total: productList.length, created, updated, errors }),
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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_BASE = "https://api.print.com";

// ── Category mapping from SKU keywords ──
const CATEGORY_MAP: Record<string, string> = {
  // Paper & Print
  "flyer": "Impression > Flyers & Dépliants",
  "leaflet": "Impression > Flyers & Dépliants",
  "brochure": "Impression > Brochures",
  "booklet": "Impression > Brochures",
  "magazine": "Impression > Magazines",
  "poster": "Impression > Posters & Affiches",
  "banner": "Impression > Bannières & Signalétique",
  "rollup": "Impression > Bannières & Signalétique",
  "roll-up": "Impression > Bannières & Signalétique",
  "flag": "Impression > Bannières & Signalétique",
  "sign": "Impression > Bannières & Signalétique",
  "card": "Impression > Cartes",
  "business-card": "Impression > Cartes de visite",
  "postcard": "Impression > Cartes postales",
  "greeting": "Impression > Cartes",
  "invitation": "Impression > Cartes",
  "folder": "Impression > Chemises & Dossiers",
  "presentation": "Impression > Chemises & Dossiers",
  "envelope": "Impression > Enveloppes",
  "letterhead": "Impression > Papeterie",
  "notepad": "Impression > Papeterie",
  "notebook": "Impression > Papeterie",
  "calendar": "Impression > Calendriers",
  "sticker": "Impression > Stickers & Étiquettes",
  "label": "Impression > Stickers & Étiquettes",
  "menu": "Impression > Menus & Cartes",
  "placemat": "Impression > Menus & Cartes",
  "certificate": "Impression > Documents",
  // Packaging
  "packaging": "Packaging > Emballages",
  "box": "Packaging > Boîtes",
  "bag": "Packaging > Sacs",
  "wrapping": "Packaging > Emballages",
  "hang-tag": "Packaging > Étiquettes",
  // Textile
  "t-shirt": "Textile > T-shirts",
  "tshirt": "Textile > T-shirts",
  "hoodie": "Textile > Sweats",
  "sweater": "Textile > Sweats",
  "polo": "Textile > Polos",
  "cap": "Textile > Casquettes",
  "beanie": "Textile > Bonnets",
  "scarf": "Textile > Accessoires textile",
  "apron": "Textile > Tabliers",
  "jacket": "Textile > Vestes",
  "vest": "Textile > Gilets",
  "fleece": "Textile > Polaires",
  // Signage & Large format
  "canvas": "Grand format > Canvas",
  "panel": "Grand format > Panneaux",
  "board": "Grand format > Panneaux",
  "foam": "Grand format > Panneaux",
  "dibond": "Grand format > Panneaux",
  "pvc": "Grand format > Panneaux",
  "window": "Grand format > Vitrophanie",
  "wall": "Grand format > Décoration murale",
  "floor": "Grand format > Signalétique sol",
  // Promotional
  "mug": "Objets publicitaires > Mugs",
  "coaster": "Objets publicitaires > Sous-verres",
  "mouse-pad": "Objets publicitaires > Tapis de souris",
  "mousepad": "Objets publicitaires > Tapis de souris",
  "usb": "Objets publicitaires > USB",
  "pen": "Objets publicitaires > Stylos",
  "lanyard": "Objets publicitaires > Lanyards",
  "keychain": "Objets publicitaires > Porte-clés",
  "magnet": "Objets publicitaires > Magnets",
  "puzzle": "Objets publicitaires > Puzzles",
  "badge": "Objets publicitaires > Badges",
  "bottle": "Objets publicitaires > Bouteilles",
  "umbrella": "Objets publicitaires > Parapluies",
  "cushion": "Objets publicitaires > Coussins",
  "towel": "Objets publicitaires > Serviettes",
  // Food & drink
  "coffee": "Alimentaire",
  "chocolate": "Alimentaire",
  "cookie": "Alimentaire",
  "tea": "Alimentaire",
  "oil": "Alimentaire",
  "wine": "Alimentaire",
  "candy": "Alimentaire",
};

function categorizeProduct(sku: string): string {
  const skuLower = sku.toLowerCase();
  // Try longer matches first (more specific)
  const entries = Object.entries(CATEGORY_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [keyword, category] of entries) {
    if (skuLower.includes(keyword)) {
      return category;
    }
  }
  return "Print > Autre";
}

// ── Product image URL construction ──
// Print.com app uses product thumbnails at predictable CDN URLs
function getProductImageUrl(sku: string): string {
  return `https://app.print.com/static/img/products/${sku}.png`;
}

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
  try {
    const json = JSON.parse(raw);
    if (typeof json === "string") return json;
    if (json.token) return json.token;
    if (json.access_token) return json.access_token;
  } catch { /* plain text */ }
  return raw.replace(/^"|"$/g, "").trim();
}

async function fetchProducts(token: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/products`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Print.com products failed [${res.status}]: ${text}`);
  }
  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (data?.products) return data.products;
  if (data?.data) return data.data;
  return Object.keys(data).map(k => ({ sku: k, ...data[k] }));
}

async function fetchProductDetail(token: string, sku: string): Promise<any | null> {
  const res = await fetch(`${API_BASE}/products/${sku}?view=reseller`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

// ── Check if image URL is valid ──
async function checkImageUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok && (res.headers.get("content-type")?.startsWith("image/") ?? false);
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let body: any = {};
  try { body = await req.clone().json(); } catch { /* no body */ }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const pcEmail = Deno.env.get("PRINTCOM_EMAIL");
    const pcPassword = Deno.env.get("PRINTCOM_PASSWORD");
    if (!pcEmail || !pcPassword) {
      return new Response(JSON.stringify({ error: "Print.com credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Enrich action: fetch categories from detail endpoint in batches ──
    if (body?.action === "enrich") {
      const token = await loginPrintcom(pcEmail, pcPassword);
      const batchSize = body.batchSize || 30;
      const offset = body.offset || 0;

      // Get products without proper category
      const { data: products } = await supabase
        .from("catalog_products")
        .select("id, sku, midocean_id, category, image_url")
        .like("midocean_id", "PRINT-%")
        .range(offset, offset + batchSize - 1);

      if (!products || products.length === 0) {
        return new Response(
          JSON.stringify({ success: true, enriched: 0, message: "No more products to enrich" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let enriched = 0;
      for (const product of products) {
        try {
          const detail = await fetchProductDetail(token, product.sku);
          const updates: Record<string, any> = {};

          if (detail) {
            // Update category from API if available
            if (detail.category) {
              updates.category = `Print > ${detail.category}`;
            } else {
              updates.category = categorizeProduct(product.sku);
            }

            // Use proper title
            if (detail.titleSingle) {
              updates.name = detail.titleSingle;
            }

            // Description from properties
            if (detail.titlePlural) {
              updates.description = detail.titlePlural;
            }
          } else {
            // Fallback: categorize from SKU
            updates.category = categorizeProduct(product.sku);
          }

          // Try image URL patterns
          if (!product.image_url) {
            const imgPatterns = [
              `https://app.print.com/static/img/products/${product.sku}.png`,
              `https://app.print.com/static/img/products/${product.sku}.jpg`,
              `https://app.print.com/static/img/products/${product.sku}.webp`,
            ];
            for (const imgUrl of imgPatterns) {
              if (await checkImageUrl(imgUrl)) {
                updates.image_url = imgUrl;
                break;
              }
            }
          }

          if (Object.keys(updates).length > 0) {
            await supabase.from("catalog_products").update(updates).eq("id", product.id);
            enriched++;
          }
        } catch (err) {
          console.error(`Enrich error for ${product.sku}:`, err instanceof Error ? err.message : String(err));
        }
      }

      return new Response(
        JSON.stringify({ success: true, enriched, total: products.length, nextOffset: offset + batchSize }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Auth check for sync actions ──
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

    // ── 1. Login to Print.com ──
    console.log("Logging in to Print.com...");
    const token = await loginPrintcom(pcEmail, pcPassword);
    console.log("Login successful");

    // ── 2. Fetch products ──
    console.log("Fetching Print.com products...");
    const productList = await fetchProducts(token);
    console.log(`Found ${productList.length} products`);

    // ── 3. Build payloads with proper names and categories ──
    const now = new Date().toISOString();
    let created = 0;
    let updated = 0;
    let errors = 0;

    const allPayloads: any[] = [];
    for (const product of productList) {
      try {
        const sku = product.sku || "unknown";
        const printId = `PRINT-${sku}`;
        const name = product.titleSingle || product.titlePlural || product.name || sku
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase());

        const category = categorizeProduct(sku);

        allPayloads.push({
          name,
          sku,
          category,
          description: product.titlePlural || null,
          image_url: null, // Will be enriched later
          stock_qty: 9999,
          base_price: 0,
          is_new: false,
          active: product.active !== false,
          last_synced_at: now,
          midocean_id: printId,
          variant_colors: [],
          variant_sizes: [],
        });
      } catch { errors++; }
    }

    // ── 4. Fetch existing for update vs insert ──
    const printIds = allPayloads.map(p => p.midocean_id);
    const existingMap = new Map<string, string>();
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

    // Batch insert
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

    // Batch update
    for (let i = 0; i < toUpdate.length; i += BATCH) {
      const batch = toUpdate.slice(i, i + BATCH);
      await Promise.all(batch.map(u =>
        supabase.from("catalog_products").update(u.payload).eq("id", u.id)
      ));
      updated += batch.length;
    }

    console.log(`Done: ${created} created, ${updated} updated, ${errors} errors`);

    // ── 5. Auto-trigger enrichment for first batch ──
    // Enrich first 30 products with categories and images
    let enriched = 0;
    try {
      const { data: toEnrich } = await supabase
        .from("catalog_products")
        .select("id, sku, image_url")
        .like("midocean_id", "PRINT-%")
        .is("image_url", null)
        .limit(20);

      if (toEnrich) {
        for (const product of toEnrich) {
          try {
            const detail = await fetchProductDetail(token, product.sku);
            const updates: Record<string, any> = {};
            if (detail?.category) {
              updates.category = `Print > ${detail.category}`;
            }
            if (detail?.titleSingle) {
              updates.name = detail.titleSingle;
            }
            if (Object.keys(updates).length > 0) {
              await supabase.from("catalog_products").update(updates).eq("id", product.id);
              enriched++;
            }
          } catch { /* skip */ }
        }
      }
    } catch { /* enrichment is best-effort */ }

    return new Response(
      JSON.stringify({ success: true, total: productList.length, created, updated, errors, enriched }),
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

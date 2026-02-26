import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DemoProduct {
  name: string;
  sku: string;
  image: string;
  category: string;
  price: number;
  prompt: string;
}

const DEMO_PRODUCTS: DemoProduct[] = [
  { name: "T-Shirt Classic", sku: "DEMO-TSHIRT", image: "tshirt.jpg", category: "textile", price: 12.50, prompt: "Place this logo on the chest area of this t-shirt as if it were screen-printed. Maintain fabric texture, folds and shadows. Keep the same background and framing. Output a photorealistic product shot." },
  { name: "Polo Premium", sku: "DEMO-POLO", image: "polo.jpg", category: "textile", price: 24.90, prompt: "Place this logo on the left chest of this polo shirt as if it were embroidered. Keep stitching texture visible. Maintain fabric folds, shadows and original background." },
  { name: "Hoodie Confort", sku: "DEMO-HOODIE", image: "hoodie.jpg", category: "textile", price: 35.00, prompt: "Place this logo centered on the chest of this hoodie as if it were screen-printed. Respect the fabric texture, folds and shadows. Keep original background." },
  { name: "Veste Softshell", sku: "DEMO-JACKET", image: "jacket.jpg", category: "textile", price: 45.00, prompt: "Place this logo on the left chest of this jacket as if it were embroidered. Maintain fabric texture, zippers, and shadows. Keep original background." },
  { name: "Casquette Brodée", sku: "DEMO-CAP", image: "cap.jpg", category: "accessories", price: 9.90, prompt: "Place this logo on the front panel of this cap as if it were embroidered. Respect the curved surface and fabric texture. Keep original background." },
  { name: "Tablier Pro", sku: "DEMO-APRON", image: "apron.jpg", category: "textile", price: 18.00, prompt: "Place this logo centered on the chest area of this apron as if it were screen-printed. Maintain fabric texture and shadows. Keep original background." },
  { name: "Badge Nominatif", sku: "DEMO-BADGE", image: "badge.jpg", category: "accessories", price: 3.50, prompt: "Place this logo on this badge/name tag as if it were printed directly on it. Keep the original shape and background." },
  { name: "Sac à Dos", sku: "DEMO-BAG", image: "bag.jpg", category: "bags", price: 22.00, prompt: "Place this logo on the front pocket of this backpack as if it were embroidered or sewn on. Respect the fabric texture and perspective. Keep original background." },
  { name: "Gourde Isotherme", sku: "DEMO-BOTTLE", image: "bottle.jpg", category: "drinkware", price: 15.00, prompt: "Place this logo on this water bottle as if it were laser-engraved or printed on the surface. Respect the cylindrical curvature and metallic reflections. Keep original background." },
  { name: "Tote Bag", sku: "DEMO-TOTEBAG", image: "totebag.jpg", category: "bags", price: 8.50, prompt: "Place this logo centered on this tote bag as if it were screen-printed. Respect the fabric texture and flat surface. Keep original background." },
  { name: "Mug Céramique", sku: "DEMO-MUG", image: "mug.jpg", category: "drinkware", price: 7.90, prompt: "Place this logo on this ceramic mug as if it were sublimation-printed. Respect the curved surface, gloss and reflections. Keep original background." },
  { name: "Carnet A5", sku: "DEMO-NOTEBOOK", image: "notebook.jpg", category: "stationery", price: 6.50, prompt: "Place this logo on the cover of this notebook as if it were hot-stamped or foil-printed. Keep the cover texture and original background." },
  { name: "Stylo Métal", sku: "DEMO-PEN", image: "pen.jpg", category: "stationery", price: 4.20, prompt: "Place this logo on this metal pen as if it were laser-engraved on the barrel. Respect the cylindrical shape and metallic surface. Keep original background." },
  { name: "Lanyard", sku: "DEMO-LANYARD", image: "lanyard.jpg", category: "accessories", price: 2.80, prompt: "Place this logo repeated along this lanyard as if it were sublimation-printed on the fabric ribbon. Keep original background." },
  { name: "T-Shirt Col V", sku: "DEMO-TSHIRT-V", image: "tshirt.jpg", category: "textile", price: 13.50, prompt: "Place this logo on the chest area of this t-shirt as if it were screen-printed. Maintain fabric texture, folds and shadows. Keep the same background and framing." },
  { name: "Polo Femme", sku: "DEMO-POLO-F", image: "polo.jpg", category: "textile", price: 24.90, prompt: "Place this logo on the left chest of this polo shirt as if it were embroidered. Keep stitching texture visible. Maintain fabric folds, shadows and original background." },
  { name: "Hoodie Zip", sku: "DEMO-HOODIE-Z", image: "hoodie.jpg", category: "textile", price: 38.00, prompt: "Place this logo centered on the chest of this hoodie as if it were screen-printed. Respect the fabric texture, folds and shadows. Keep original background." },
  { name: "Mug XL", sku: "DEMO-MUG-XL", image: "mug.jpg", category: "drinkware", price: 9.90, prompt: "Place this logo on this ceramic mug as if it were sublimation-printed. Respect the curved surface, gloss and reflections. Keep original background." },
  { name: "Stylo Bille", sku: "DEMO-PEN-B", image: "pen.jpg", category: "stationery", price: 2.50, prompt: "Place this logo on this pen as if it were pad-printed on the barrel. Respect the shape and surface. Keep original background." },
  { name: "Sac Shopping", sku: "DEMO-BAG-S", image: "totebag.jpg", category: "bags", price: 11.00, prompt: "Place this logo centered on this shopping bag as if it were screen-printed. Respect the fabric texture. Keep original background." },
];

async function fetchImageAsBase64(url: string): Promise<{ b64: string; mime: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const mime = res.headers.get("content-type") || "image/jpeg";
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const b64 = btoa(binary);
    return { b64, mime };
  } catch (e) {
    console.error("Failed to fetch image:", url, e);
    return null;
  }
}

async function generateBrandedImage(
  productB64: string,
  productMime: string,
  logoB64: string,
  logoMime: string,
  prompt: string,
  apiKey: string,
): Promise<string | null> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:${productMime};base64,${productB64}` } },
              { type: "image_url", image_url: { url: `data:${logoMime};base64,${logoB64}` } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);
      return null;
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl || !imageUrl.startsWith("data:")) {
      console.error("No image in Gemini response");
      return null;
    }

    // Extract base64 from data URL
    const commaIdx = imageUrl.indexOf(",");
    return commaIdx > 0 ? imageUrl.substring(commaIdx + 1) : null;
  } catch (e) {
    console.error("Gemini generation error:", e);
    return null;
  }
}

serve(async (req) => {
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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    // Verify caller
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await callerClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { tenant_id, entity_id, logo_url, app_url } = body;

    if (!tenant_id || !entity_id) {
      return new Response(JSON.stringify({ error: "tenant_id and entity_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for inserts (bypass RLS)
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch logo once if available
    let logoData: { b64: string; mime: string } | null = null;
    if (logo_url) {
      logoData = await fetchImageAsBase64(logo_url);
      if (!logoData) console.warn("Could not fetch logo, will use base images only");
    }

    const baseUrl = app_url || "https://b2b-inkoo.lovable.app";
    let created = 0;

    for (const product of DEMO_PRODUCTS) {
      try {
        // Fetch base product image
        const productImageUrl = `${baseUrl}/demo/${product.image}`;
        const productData = await fetchImageAsBase64(productImageUrl);

        let finalImageUrl: string | null = null;

        if (productData && logoData && lovableApiKey) {
          // Generate branded image via Gemini
          console.log(`Generating branded image for ${product.sku}...`);
          const generatedB64 = await generateBrandedImage(
            productData.b64,
            productData.mime,
            logoData.b64,
            logoData.mime,
            product.prompt,
            lovableApiKey,
          );

          if (generatedB64) {
            // Upload to storage
            const filePath = `${tenant_id}/demo-${product.sku.toLowerCase()}.jpg`;
            const fileBytes = Uint8Array.from(atob(generatedB64), (c) => c.charCodeAt(0));
            const { error: uploadErr } = await supabase.storage
              .from("product-images")
              .upload(filePath, fileBytes, {
                contentType: "image/png",
                upsert: true,
              });

            if (!uploadErr) {
              const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(filePath);
              finalImageUrl = urlData.publicUrl;
            } else {
              console.error(`Upload error for ${product.sku}:`, uploadErr);
            }
          }
        }

        // Fallback: use original image URL
        if (!finalImageUrl && productData) {
          finalImageUrl = productImageUrl;
        }

        // Insert product
        const { data: prod, error: prodErr } = await supabase
          .from("products")
          .insert({
            tenant_id,
            name: product.name,
            sku: product.sku,
            category: product.category,
            image_url: finalImageUrl,
            active: true,
            active_bulk: true,
            active_staff: true,
            stock_qty: 100,
            stock_type: "in_stock",
          })
          .select("id")
          .single();

        if (prodErr) {
          console.error(`Insert error for ${product.sku}:`, prodErr);
          continue;
        }

        // Insert prices (bulk + staff)
        const prices = [
          { product_id: prod.id, tenant_id, store_type: "bulk" as const, price: product.price },
          { product_id: prod.id, tenant_id, store_type: "staff" as const, price: Math.round(product.price * 0.8 * 100) / 100 },
        ];
        await supabase.from("product_prices").insert(prices);

        created++;
        console.log(`✓ ${product.sku} created (${created}/${DEMO_PRODUCTS.length})`);
      } catch (e) {
        console.error(`Error processing ${product.sku}:`, e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, created }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("seed-demo-products error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

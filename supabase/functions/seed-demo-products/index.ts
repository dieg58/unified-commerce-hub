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
  { name: "T-Shirt Classic", sku: "DEMO-TSHIRT", image: "tshirt.jpg", category: "textile", price: 12.50, prompt: "Take this product photo and add the provided logo SMALL on the left chest area (about 3-4cm wide in real scale), as if it were a subtle screen-print or embroidery. The logo must be small and proportional like real corporate merchandise. Keep the EXACT same product photo, background, lighting, fabric texture and folds. Do NOT enlarge the logo or place it centered. Output a photorealistic product shot." },
  { name: "Polo Premium", sku: "DEMO-POLO", image: "polo.jpg", category: "textile", price: 24.90, prompt: "Take this product photo and add the provided logo SMALL on the left chest area (about 3-4cm wide in real scale), as if it were a small embroidered patch. The logo must be discreet and proportional like real corporate polo branding. Keep the EXACT same product photo, background, lighting, fabric texture and folds. Do NOT enlarge the logo. Output a photorealistic product shot." },
  { name: "Hoodie Confort", sku: "DEMO-HOODIE", image: "hoodie.jpg", category: "textile", price: 35.00, prompt: "Take this product photo and add the provided logo SMALL on the left chest area (about 4-5cm wide in real scale), as if it were a small screen-print or embroidery. The logo must be subtle and proportional like real corporate hoodie branding. Keep the EXACT same product photo, background, lighting, fabric texture and folds. Do NOT make the logo large or centered. Output a photorealistic product shot." },
  { name: "Veste Softshell", sku: "DEMO-JACKET", image: "jacket.jpg", category: "textile", price: 45.00, prompt: "Take this product photo and add the provided logo SMALL on the left chest area (about 3-4cm wide in real scale), as if it were a small embroidered logo. The logo must be discreet like real corporate jacket branding. Keep the EXACT same product photo, background, zippers, fabric texture. Do NOT enlarge the logo. Output a photorealistic product shot." },
  { name: "Casquette Brodée", sku: "DEMO-CAP", image: "cap.jpg", category: "accessories", price: 9.90, prompt: "Take this product photo and add the provided logo on the front panel of the cap (about 5cm wide), as if it were embroidered. The logo should be centered on the front panel and sized proportionally to the cap. Keep the EXACT same product photo, background, curved surface and fabric texture. Output a photorealistic product shot." },
  { name: "Tablier Pro", sku: "DEMO-APRON", image: "apron.jpg", category: "textile", price: 18.00, prompt: "Take this product photo and add the provided logo SMALL on the upper chest area of the apron (about 5-6cm wide), as if it were a small screen-print. Keep the EXACT same product photo, background, fabric texture. Do NOT make the logo oversized. Output a photorealistic product shot." },
  { name: "Badge Nominatif", sku: "DEMO-BADGE", image: "badge.jpg", category: "accessories", price: 3.50, prompt: "Take this product photo and add the provided logo small on the badge/name tag, sized proportionally to fit the badge. Keep the EXACT same product photo and background. Output a photorealistic product shot." },
  { name: "Sac à Dos", sku: "DEMO-BAG", image: "bag.jpg", category: "bags", price: 22.00, prompt: "Take this product photo and add the provided logo SMALL on the front pocket of the backpack (about 4-5cm wide), as if it were a small embroidered or sewn-on patch. Keep the EXACT same product photo, background, fabric texture and perspective. Do NOT enlarge the logo. Output a photorealistic product shot." },
  { name: "Gourde Isotherme", sku: "DEMO-BOTTLE", image: "bottle.jpg", category: "drinkware", price: 15.00, prompt: "Take this product photo and add the provided logo SMALL on the bottle surface (about 3cm wide), as if it were laser-engraved or printed. The logo must be subtle and follow the cylindrical curvature. Keep the EXACT same product photo, background and metallic reflections. Do NOT make the logo large. Output a photorealistic product shot." },
  { name: "Tote Bag", sku: "DEMO-TOTEBAG", image: "totebag.jpg", category: "bags", price: 8.50, prompt: "Take this product photo and add the provided logo centered on the tote bag (about 8-10cm wide), as if it were screen-printed. The logo should be medium-sized and centered. Keep the EXACT same product photo, background, fabric texture. Output a photorealistic product shot." },
  { name: "Mug Céramique", sku: "DEMO-MUG", image: "mug.jpg", category: "drinkware", price: 7.90, prompt: "Take this product photo and add the provided logo SMALL on the mug surface (about 4cm wide), as if it were sublimation-printed. The logo must follow the curved surface and be proportional. Keep the EXACT same product photo, background, gloss and reflections. Output a photorealistic product shot." },
  { name: "Carnet A5", sku: "DEMO-NOTEBOOK", image: "notebook.jpg", category: "stationery", price: 6.50, prompt: "Take this product photo and add the provided logo SMALL in the lower-right corner of the notebook cover (about 3-4cm wide), as if it were hot-stamped or debossed. Keep the EXACT same product photo, background, cover texture. Do NOT make the logo fill the entire cover. Output a photorealistic product shot." },
  { name: "Stylo Métal", sku: "DEMO-PEN", image: "pen.jpg", category: "stationery", price: 4.20, prompt: "Take this product photo and add the provided logo TINY on the pen barrel (about 1-2cm wide), as if it were laser-engraved. The logo must be very small and follow the cylindrical barrel shape. Keep the EXACT same product photo, background, metallic surface. Output a photorealistic product shot." },
  { name: "Lanyard", sku: "DEMO-LANYARD", image: "lanyard.jpg", category: "accessories", price: 2.80, prompt: "Take this product photo and add the provided logo repeated small along the lanyard ribbon (each about 2cm wide), as if it were sublimation-printed on the fabric. Keep the EXACT same product photo and background. Output a photorealistic product shot." },
  { name: "T-Shirt Col V", sku: "DEMO-TSHIRT-V", image: "tshirt.jpg", category: "textile", price: 13.50, prompt: "Take this product photo and add the provided logo SMALL on the left chest area (about 3-4cm wide), as if it were a subtle screen-print. Keep the EXACT same product photo, background, fabric texture. Do NOT enlarge the logo. Output a photorealistic product shot." },
  { name: "Polo Femme", sku: "DEMO-POLO-F", image: "polo.jpg", category: "textile", price: 24.90, prompt: "Take this product photo and add the provided logo SMALL on the left chest area (about 3-4cm wide), as if it were a small embroidered patch. Keep the EXACT same product photo, background, fabric texture. Do NOT enlarge the logo. Output a photorealistic product shot." },
  { name: "Hoodie Zip", sku: "DEMO-HOODIE-Z", image: "hoodie.jpg", category: "textile", price: 38.00, prompt: "Take this product photo and add the provided logo SMALL on the left chest area (about 4-5cm wide), as if it were a small embroidery. Keep the EXACT same product photo, background, fabric texture. Do NOT make the logo large. Output a photorealistic product shot." },
  { name: "Mug XL", sku: "DEMO-MUG-XL", image: "mug.jpg", category: "drinkware", price: 9.90, prompt: "Take this product photo and add the provided logo SMALL on the mug surface (about 5cm wide), as if it were sublimation-printed. Follow the curved surface. Keep the EXACT same product photo, background. Output a photorealistic product shot." },
  { name: "Stylo Bille", sku: "DEMO-PEN-B", image: "pen.jpg", category: "stationery", price: 2.50, prompt: "Take this product photo and add the provided logo TINY on the pen barrel (about 1-2cm wide), as if it were pad-printed. Keep the EXACT same product photo, background, surface. Output a photorealistic product shot." },
  { name: "Sac Shopping", sku: "DEMO-BAG-S", image: "totebag.jpg", category: "bags", price: 11.00, prompt: "Take this product photo and add the provided logo centered on the shopping bag (about 8-10cm wide), as if it were screen-printed. Keep the EXACT same product photo, background, fabric texture. Output a photorealistic product shot." },
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

async function convertSvgToPng(svgB64: string, apiKey: string): Promise<{ b64: string; mime: string } | null> {
  try {
    // Decode SVG base64 to get the XML text
    const svgText = atob(svgB64);
    console.log("Converting SVG logo to PNG via Gemini...");
    
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
            content: `Render this SVG logo as a clean, high-resolution PNG image. Keep the EXACT same design, colors, shapes and proportions. Use a pure white background. Do not add any extra elements. Here is the SVG code:\n\n${svgText}`,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("SVG conversion error:", response.status, errText);
      return null;
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl || !imageUrl.startsWith("data:")) {
      console.error("No image in SVG conversion response");
      return null;
    }

    const commaIdx = imageUrl.indexOf(",");
    if (commaIdx <= 0) return null;
    
    console.log("✓ SVG logo converted to PNG successfully");
    return { b64: imageUrl.substring(commaIdx + 1), mime: "image/png" };
  } catch (e) {
    console.error("SVG conversion error:", e);
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
      if (!logoData) {
        console.warn("Could not fetch logo, will use base images only");
      } else if (logoData.mime.includes("svg")) {
        // SVG is not supported by Gemini — convert to PNG first
        console.log("Logo is SVG, converting to PNG...");
        if (lovableApiKey) {
          const pngLogo = await convertSvgToPng(logoData.b64, lovableApiKey);
          if (pngLogo) {
            logoData = pngLogo;
          } else {
            console.warn("SVG to PNG conversion failed, will use base images only");
            logoData = null;
          }
        } else {
          console.warn("No API key for SVG conversion, will use base images only");
          logoData = null;
        }
      }
    }

    const baseUrl = app_url || "https://b2b-inkoo.lovable.app";
    let created = 0;

    for (const product of DEMO_PRODUCTS) {
      try {
        // Base product image URL (served from public/demo/)
        const productImageUrl = `${baseUrl}/demo/${product.image}`;

        let finalImageUrl: string | null = productImageUrl;

        if (logoData && lovableApiKey) {
          // Fetch base product image for AI compositing
          const productData = await fetchImageAsBase64(productImageUrl);
          if (productData) {
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
            } else {
              console.warn(`AI generation failed for ${product.sku}, using base image`);
            }
          } else {
            console.warn(`Could not fetch base image for ${product.sku}, using URL directly`);
          }
        } else {
          console.log(`No logo or API key, using base image URL for ${product.sku}`);
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

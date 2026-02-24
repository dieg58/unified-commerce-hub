import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "https://www.pfconcept.com";
const STORE = "en_nl";
const PRICE_MULTIPLIER = 1.65;

// PF Concept product categories to scrape
const CATEGORIES = [
  { keyword: "bag", category: "Bags" },
  { keyword: "backpack", category: "Bags" },
  { keyword: "tote", category: "Bags" },
  { keyword: "bottle", category: "Drinkware" },
  { keyword: "mug", category: "Drinkware" },
  { keyword: "tumbler", category: "Drinkware" },
  { keyword: "thermos", category: "Drinkware" },
  { keyword: "pen", category: "Writing" },
  { keyword: "pencil", category: "Writing" },
  { keyword: "notebook", category: "Writing" },
  { keyword: "journal", category: "Writing" },
  { keyword: "powerbank", category: "Technology" },
  { keyword: "charger", category: "Technology" },
  { keyword: "speaker", category: "Technology" },
  { keyword: "earbuds", category: "Technology" },
  { keyword: "headphone", category: "Technology" },
  { keyword: "umbrella", category: "Accessories" },
  { keyword: "lanyard", category: "Accessories" },
  { keyword: "keychain", category: "Accessories" },
  { keyword: "cap", category: "Accessories" },
  { keyword: "hat", category: "Accessories" },
  { keyword: "apron", category: "Accessories" },
  { keyword: "towel", category: "Home & Living" },
  { keyword: "blanket", category: "Home & Living" },
  { keyword: "candle", category: "Home & Living" },
  { keyword: "award", category: "Awards" },
  { keyword: "trophy", category: "Awards" },
  { keyword: "sport", category: "Sports & Outdoor" },
  { keyword: "lunch", category: "Food & Kitchen" },
  { keyword: "cutting board", category: "Food & Kitchen" },
  { keyword: "wine", category: "Food & Kitchen" },
  { keyword: "tool", category: "Tools" },
  { keyword: "flashlight", category: "Tools" },
  { keyword: "first aid", category: "Safety" },
];

interface ScrapedProduct {
  sku: string;
  name: string;
  imageUrl: string | null;
  price: number;
  category: string;
  isNew: boolean;
  productUrl: string | null;
}

/**
 * Login to PF Concept Magento store and get session cookies
 */
async function loginToPFConcept(email: string, password: string): Promise<string | null> {
  try {
    // Step 1: Get the login page to retrieve the form_key
    const loginPageRes = await fetch(`${BASE_URL}/${STORE}/customer/account/login/`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      redirect: "manual",
    });
    const loginHtml = await loginPageRes.text();

    // Extract form_key
    const formKeyMatch = loginHtml.match(/name="form_key"\s+.*?value="([^"]+)"/);
    if (!formKeyMatch) {
      console.error("Could not find form_key on login page");
      return null;
    }
    const formKey = formKeyMatch[1];

    // Extract cookies from login page
    const setCookies = loginPageRes.headers.getSetCookie?.() || [];
    const cookies = setCookies
      .map((c: string) => c.split(";")[0])
      .join("; ");

    // Step 2: POST login
    const formBody = new URLSearchParams({
      "form_key": formKey,
      "login[username]": email,
      "login[password]": password,
    });

    const loginRes = await fetch(`${BASE_URL}/${STORE}/customer/account/loginPost/`, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": cookies,
        "Referer": `${BASE_URL}/${STORE}/customer/account/login/`,
      },
      body: formBody.toString(),
      redirect: "manual",
    });

    // Collect all cookies from the login response
    const loginCookies = loginRes.headers.getSetCookie?.() || [];
    const allCookies = [...setCookies, ...loginCookies]
      .map((c: string) => c.split(";")[0])
      .join("; ");

    // Check if login succeeded (redirect to account page)
    const location = loginRes.headers.get("location") || "";
    if (location.includes("account") || loginRes.status === 302) {
      console.log("PF Concept login successful");
      return allCookies;
    }

    console.error("PF Concept login failed, status:", loginRes.status);
    return null;
  } catch (err) {
    console.error("Login error:", err);
    return null;
  }
}

/**
 * Scrape a single search results page from PF Concept
 */
async function scrapeSearchPage(
  keyword: string,
  category: string,
  page: number,
  cookies: string | null,
): Promise<{ products: ScrapedProduct[]; hasMore: boolean }> {
  const url = `${BASE_URL}/${STORE}/catalogsearch/result/?q=${encodeURIComponent(keyword)}&product_list_limit=96&p=${page}`;

  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (compatible; InkooBot/1.0)",
    "Accept": "text/html",
  };
  if (cookies) headers["Cookie"] = cookies;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    console.error(`Search page fetch failed for "${keyword}" p${page}: ${res.status}`);
    return { products: [], hasMore: false };
  }

  const html = await res.text();
  const products: ScrapedProduct[] = [];

  // Parse product items from search result HTML
  // PF Concept Magento uses product-item containers
  const productPattern = /<li[^>]*class="[^"]*product-item[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  let match;
  const seen = new Set<string>();

  while ((match = productPattern.exec(html)) !== null) {
    const block = match[1];

    // Extract SKU from data attributes or text
    const skuMatch = block.match(/data-product-sku="([^"]+)"/) ||
      block.match(/<div[^>]*class="[^"]*product-item-sku[^"]*"[^>]*>\s*([A-Z0-9]+)\s*</) ||
      block.match(/>(\d{5,8}[A-Z]?\d*)</);

    // Extract product name
    const nameMatch = block.match(/class="[^"]*product-item-link[^"]*"[^>]*>([^<]+)</) ||
      block.match(/title="([^"]+)"/);

    // Extract image URL
    const imgMatch = block.match(/src="(https:\/\/www\.pfconcept\.com\/media\/[^"]+\.(jpg|jpeg|png|webp)[^"]*)"/i);

    // Extract price
    const priceMatch = block.match(/(?:From:\s*\*?\*?)?(?:US?\$|€)\s*([\d,.]+)/);

    // Extract product URL
    const urlMatch = block.match(/href="(https:\/\/www\.pfconcept\.com\/[^"]+\.html[^"]*)"/);

    // Check if marked as new
    const isNew = /(?:Just arrived|New)/i.test(block);

    if (!skuMatch && !nameMatch) continue;

    const sku = skuMatch?.[1]?.trim() || "";
    const name = nameMatch?.[1]?.trim() || "";
    if (!sku && !name) continue;

    const productKey = sku || name;
    if (seen.has(productKey)) continue;
    seen.add(productKey);

    let price = 0;
    if (priceMatch) {
      price = parseFloat(priceMatch[1].replace(",", ".")) || 0;
    }

    products.push({
      sku,
      name,
      imageUrl: imgMatch?.[1] || null,
      price: Math.round(price * PRICE_MULTIPLIER * 100) / 100,
      category,
      isNew,
      productUrl: urlMatch?.[1] || null,
    });
  }

  // Check if there's a next page
  const hasMore = html.includes(`p=${page + 1}`);

  return { products, hasMore };
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
      authHeader.replace("Bearer ", ""),
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
      return new Response(JSON.stringify({ error: "Forbidden: super_admin required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to login for better price access
    const pfEmail = Deno.env.get("PF_CONCEPT_EMAIL");
    const pfPassword = Deno.env.get("PF_CONCEPT_PASSWORD");

    let cookies: string | null = null;
    if (pfEmail && pfPassword) {
      console.log("Attempting PF Concept login...");
      cookies = await loginToPFConcept(pfEmail, pfPassword);
    } else {
      console.log("PF_CONCEPT credentials not set, scraping public data only");
    }

    // Scrape products from all categories
    console.log(`Scraping PF Concept products across ${CATEGORIES.length} keywords...`);

    const allProducts = new Map<string, ScrapedProduct>();

    for (const cat of CATEGORIES) {
      let page = 1;
      const maxPages = 5; // Limit pages per keyword

      while (page <= maxPages) {
        try {
          const { products, hasMore } = await scrapeSearchPage(
            cat.keyword,
            cat.category,
            page,
            cookies,
          );

          for (const p of products) {
            const key = p.sku || p.name;
            if (!allProducts.has(key)) {
              allProducts.set(key, p);
            }
          }

          console.log(`"${cat.keyword}" p${page}: ${products.length} products`);

          if (!hasMore || products.length === 0) break;
          page++;

          // Small delay to be respectful
          await new Promise((r) => setTimeout(r, 500));
        } catch (err) {
          console.error(`Error scraping "${cat.keyword}" p${page}:`, err);
          break;
        }
      }
    }

    console.log(`Total unique products scraped: ${allProducts.size}`);

    // Upsert into catalog_products
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    const now = new Date().toISOString();

    for (const [, product] of allProducts) {
      try {
        if (!product.sku && !product.name) {
          skipped++;
          continue;
        }

        const pfcId = `PFC-${product.sku || product.name.replace(/\s+/g, "-").substring(0, 30)}`;

        // Check if exists
        const { data: existing } = await supabase
          .from("catalog_products")
          .select("id")
          .eq("midocean_id", pfcId)
          .maybeSingle();

        const payload = {
          name: product.name || product.sku,
          sku: product.sku || pfcId,
          category: product.category,
          description: null as string | null,
          image_url: product.imageUrl,
          stock_qty: 0, // PF Concept doesn't expose stock publicly
          base_price: product.price,
          is_new: product.isNew,
          last_synced_at: now,
        };

        if (existing) {
          await supabase.from("catalog_products").update(payload).eq("id", existing.id);
          updated++;
        } else {
          await supabase.from("catalog_products").insert({
            ...payload,
            midocean_id: pfcId,
            active: true,
          });
          created++;
        }
      } catch (e) {
        console.error("Error saving product:", e);
        errors++;
      }
    }

    console.log(
      `PF Concept sync complete: ${created} created, ${updated} updated, ${skipped} skipped, ${errors} errors`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        total: allProducts.size,
        created,
        updated,
        skipped,
        errors,
        authenticated: !!cookies,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("Sync error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

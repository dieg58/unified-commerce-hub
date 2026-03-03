import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { read, utils } from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Parse multipart form
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const brand = (formData.get("brand") as string) || "Craft";

    if (!file) {
      return new Response(JSON.stringify({ error: "No file uploaded" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[sync-newwave] Processing ${file.name}, brand=${brand}, size=${file.size}`);

    // Read XLSX
    const buffer = await file.arrayBuffer();
    const workbook = read(new Uint8Array(buffer), { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: Record<string, string>[] = utils.sheet_to_json(sheet, { defval: "" });

    console.log(`[sync-newwave] Parsed ${rows.length} rows`);

    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: "Empty spreadsheet" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Detect column names (handle slight variations between Corporate and Club files)
    const sampleKeys = Object.keys(rows[0]);
    const findCol = (patterns: string[]): string | null => {
      for (const p of patterns) {
        const found = sampleKeys.find((k) => k.toLowerCase().includes(p.toLowerCase()));
        if (found) return found;
      }
      return null;
    };

    const COL_FAMILY = findCol(["Family"]) || "Family";
    const COL_FAMILY_NAME = findCol(["Family Name w/o Brand"]) || "Family Name w/o Brand";
    const COL_BRAND = findCol(["Brand"]) || "Brand";
    const COL_NAME_EN = findCol(["Product Name EN With Brand"]) || "Product Name EN With Brand";
    const COL_NAME_NL = findCol(["Product Name NL With Brand"]) || "Product Name NL With Brand";
    const COL_NAME_FR = findCol(["Product Name FR With Brand"]) || "Product Name FR With Brand";
    const COL_DESC_EN = findCol(["Description EN"]) || "Description EN";
    const COL_DESC_NL = findCol(["Description NL"]) || "Description NL";
    const COL_DESC_FR = findCol(["Description FR"]) || "Description FR";
    const COL_CATEGORY = findCol(["Main Category", "Product Category"]) || "Main Category";
    const COL_CRAFT_CAT = findCol(["Category Craft"]) || "Category Craft";
    const COL_URL_PHOTO = findCol(["URL Photo", "Url photo"]) || "URL Photo";
    const COL_COLOUR_EN = findCol(["Col. EN", "Colour EN"]) || "Col. EN";
    const COL_COLOUR_NL = findCol(["Colour NL"]) || "Colour NL";
    const COL_WEB_COLOR = findCol(["WEB COLOR", "WEBcolor"]) || "WEB COLOR";
    const COL_SIZE = findCol(["Size"]) || "Size";
    const COL_PRICE = findCol(["Advice Selling Price"]) || "Advice Selling Price";
    const COL_SEXE = findCol(["Sexe"]) || "Sexe";
    const COL_MAT_EN = findCol(["Mat. EN"]) || "Mat. EN";
    const COL_LEVEL = findCol(["Level"]) || "Level";
    const COL_NEW = findCol(["New", "NEW"]) || "New";

    // Helper: clean URL
    const cleanUrl = (raw: string): string => {
      if (!raw) return "";
      return raw.replace(/\\/g, "").trim();
    };

    // Map of "WEB COLOR" name → approximate hex
    const WEB_COLOR_HEX: Record<string, string> = {
      Black: "#000000", White: "#FFFFFF", Blue: "#0066CC", Red: "#CC0000",
      Green: "#228B22", Yellow: "#FFD700", Orange: "#FF8C00", Pink: "#FF69B4",
      Grey: "#808080", Gray: "#808080", Brown: "#8B4513", Navy: "#001F3F",
      Purple: "#800080", Burgundy: "#800020", Silver: "#C0C0C0", Gold: "#FFD700",
      Beige: "#F5F5DC", Coral: "#FF7F50", Turquoise: "#40E0D0", Teal: "#008080",
    };

    const getHex = (webColor: string, _colourEN: string): string | null => {
      if (!webColor) return null;
      const key = webColor.charAt(0).toUpperCase() + webColor.slice(1).toLowerCase();
      return WEB_COLOR_HEX[key] || null;
    };

    // Aggregate by Family code
    type FamilyData = {
      familyCode: string;
      familyName: string;
      nameEN: string;
      nameNL: string;
      nameFR: string;
      descEN: string;
      descNL: string;
      descFR: string;
      category: string;
      craftCategory: string;
      imageUrl: string;
      basePrice: number;
      colors: Map<string, { color: string; hex: string | null; image_url: string | null }>;
      sizes: Set<string>;
      isNew: boolean;
    };

    const families = new Map<string, FamilyData>();

    for (const row of rows) {
      const familyCode = String(row[COL_FAMILY] || "").trim();
      if (!familyCode || /^\d*$/.test(familyCode) === false && familyCode.length < 3) continue;
      // Skip header/empty rows
      const level = String(row[COL_LEVEL] || "").trim();
      if (!level && !row[COL_FAMILY_NAME]) continue;

      const colourEN = String(row[COL_COLOUR_EN] || "").trim();
      const webColor = String(row[COL_WEB_COLOR] || "").trim();
      const size = String(row[COL_SIZE] || "").trim();
      const photoUrl = cleanUrl(String(row[COL_URL_PHOTO] || ""));

      if (!families.has(familyCode)) {
        // Parse price: "€ 33.00" → 33.00
        const rawPrice = String(row[COL_PRICE] || "0");
        const price = parseFloat(rawPrice.replace(/[€\s,]/g, "").replace(",", ".")) || 0;

        const category = String(row[COL_CATEGORY] || "").trim();
        const craftCat = String(row[COL_CRAFT_CAT] || "").trim();
        const isNew = String(row[COL_NEW] || "").trim().toLowerCase() === "new" || String(row[COL_NEW] || "").trim() === "1";

        families.set(familyCode, {
          familyCode,
          familyName: String(row[COL_FAMILY_NAME] || "").trim(),
          nameEN: String(row[COL_NAME_EN] || "").trim(),
          nameNL: String(row[COL_NAME_NL] || "").trim(),
          nameFR: String(row[COL_NAME_FR] || "").trim(),
          descEN: String(row[COL_DESC_EN] || "").trim(),
          descNL: String(row[COL_DESC_NL] || "").trim(),
          descFR: String(row[COL_DESC_FR] || "").trim(),
          category: craftCat ? `${craftCat} > ${category}` : category,
          craftCategory: craftCat,
          imageUrl: photoUrl,
          basePrice: price,
          colors: new Map(),
          sizes: new Set(),
          isNew,
        });
      }

      const family = families.get(familyCode)!;

      // Aggregate color
      if (colourEN && !family.colors.has(colourEN)) {
        family.colors.set(colourEN, {
          color: colourEN,
          hex: getHex(webColor, colourEN),
          image_url: photoUrl || null,
        });
      }

      // Aggregate size
      if (size) family.sizes.add(size);
    }

    console.log(`[sync-newwave] Aggregated ${families.size} families`);

    // Upsert into catalog_products
    let created = 0, updated = 0, errors = 0;
    const BATCH = 50;
    const familyArr = Array.from(families.values());

    for (let i = 0; i < familyArr.length; i += BATCH) {
      const batch = familyArr.slice(i, i + BATCH);
      const upsertRows = batch.map((f) => {
        // Use Family name (without brand) for clean display, but prepend brand
        const displayName = f.nameEN || `${brand} ${f.familyName}`;
        // Strip color/size suffix from family-level name
        const familyDisplayName = f.familyName
          ? `${brand} ${f.familyName}`
          : displayName.split(/\s+(xs|s|m|l|xl|xxl|3xl|4xl)\s*$/i)[0];

        return {
          sku: `NW-${f.familyCode}`,
          midocean_id: `NW-${f.familyCode}`,
          name: familyDisplayName,
          name_en: familyDisplayName,
          name_nl: f.nameNL ? f.nameNL.split(/\s+(xs|s|m|l|xl|xxl|3xl|4xl)\s*$/i)[0] : null,
          description: f.descFR || f.descEN || null,
          description_en: f.descEN || null,
          description_nl: f.descNL || null,
          category: f.category || "general",
          image_url: f.imageUrl || null,
          base_price: f.basePrice,
          brand,
          variant_colors: Array.from(f.colors.values()),
          variant_sizes: Array.from(f.sizes),
          is_new: f.isNew,
          last_synced_at: new Date().toISOString(),
        };
      });

      // Check which already exist
      const skus = upsertRows.map((r) => r.sku);
      const { data: existing } = await admin
        .from("catalog_products")
        .select("sku")
        .in("sku", skus);

      const existingSkus = new Set((existing || []).map((e: any) => e.sku));

      const toInsert = upsertRows.filter((r) => !existingSkus.has(r.sku));
      const toUpdate = upsertRows.filter((r) => existingSkus.has(r.sku));

      if (toInsert.length > 0) {
        const { error: insertErr } = await admin
          .from("catalog_products")
          .insert(toInsert.map((r) => ({ ...r, active: true })));
        if (insertErr) {
          console.error(`[sync-newwave] Insert error:`, insertErr.message);
          errors += toInsert.length;
        } else {
          created += toInsert.length;
        }
      }

      for (const row of toUpdate) {
        // Preserve active status on update
        const { sku, ...updateData } = row;
        const { error: updateErr } = await admin
          .from("catalog_products")
          .update(updateData)
          .eq("sku", sku);
        if (updateErr) {
          console.error(`[sync-newwave] Update error for ${sku}:`, updateErr.message);
          errors++;
        } else {
          updated++;
        }
      }
    }

    console.log(`[sync-newwave] Done: created=${created}, updated=${updated}, errors=${errors}`);

    return new Response(
      JSON.stringify({ created, updated, errors, total: families.size }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[sync-newwave] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

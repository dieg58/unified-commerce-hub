import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FAMILY_RULES: [RegExp, string][] = [
  [/sport|training|run|bike|ski|squad|gameday|fitness|gym|athletic|active\s*wear|performance/i, "Sport"],
  [/kitchen|cuisine|lunch|barbecue|vaisselle|table|cook|food/i, "Cuisine"],
  [/home|maison|intérieur|couverture|bougie|diffuseur|wellness|bien.?[eê]tre|candle|spa|relax|salle de bain/i, "Maison & Bien-être"],
  [/office|bureau|écriture|writing|conference|conférenc|desk|organis/i, "Bureau"],
  [/travel|voyage|outdoor|plein\s*air|camping|hik|randonn|pique.?nique|beach|plage/i, "Voyage & Plein air"],
  [/kids|enfant|bébé|baby|children|peluche|jouet/i, "Enfants"],
  [/tech|power.?bank|chargeur|audio|usb|électr|gadget|smart|connect/i, "Technologie"],
  [/event|événement|lanyard|badge|congrès|salon|séminaire|gift|cadeau/i, "Événementiel"],
  [/budget|économique|value|basic|entry.?level/i, "Budget"],
  [/premium|luxury|luxe|exclusive|prestige|deluxe|haut\s*de\s*gamme/i, "Premium"],
  [/sécurité|safety|workwear|travail|protection|haute\s*visibilité|hi.?vis/i, "Workwear"],
];

const TAG_RULES: [RegExp, string][] = [
  [/recycl[eé]|recycled|rPET|rPP|recyclé/i, "100% Recyclé"],
  [/made\s*in\s*europ|fabriqué\s*en\s*europ/i, "Made in Europe"],
  [/organic|organique|bio(?:logique)?|GOTS/i, "Bio / Organic"],
  [/v[eé]gan|vegan/i, "Végan"],
  [/fair\s*trade|commerce\s*[eé]quitable/i, "Commerce Équitable"],
  [/GRS|Global\s*Recycled\s*Standard/i, "GRS Certifié"],
  [/OEKO.?TEX|oekotex/i, "OEKO-TEX"],
  [/FSC/i, "FSC"],
  [/bamb[ou]/i, "Bambou"],
  [/coton\s*bio|organic\s*cotton/i, "Coton Bio"],
  [/PVC.?free|sans\s*PVC/i, "Sans PVC"],
  [/BPA.?free|sans\s*BPA/i, "Sans BPA"],
  [/biodégradable|biodegradable|compostable/i, "Biodégradable"],
  [/solar|solaire/i, "Énergie Solaire"],
  [/waterproof|étanche|imperméable/i, "Imperméable"],
  [/anti.?bact[eé]rien|antibacterial/i, "Antibactérien"],
  [/personnalis[eé]|custom|personali[sz]/i, "Personnalisable"],
];

function derive(cat: string, desc?: string|null, brand?: string|null) {
  const c = `${cat||""} ${desc||""} ${brand||""}`;
  const families: string[] = [];
  const tags: string[] = [];
  for (const [re, l] of FAMILY_RULES) if (re.test(c)) families.push(l);
  for (const [re, l] of TAG_RULES) if (re.test(c)) tags.push(l);
  return { families, tags };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const offsetParam = parseInt(url.searchParams.get("offset") || "0");
  const BATCH = 200;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: products, error } = await supabase
    .from("catalog_products")
    .select("id, category, description, brand")
    .range(offsetParam, offsetParam + BATCH - 1);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let updated = 0;
  if (products && products.length > 0) {
    // Build batch updates - group by same families+tags combo to reduce calls
    const updates: Promise<any>[] = [];
    for (const p of products) {
      const { families, tags } = derive(p.category, p.description, p.brand);
      updates.push(
        supabase.from("catalog_products")
          .update({ product_family: families, tags })
          .eq("id", p.id)
      );
    }
    const results = await Promise.all(updates);
    updated = results.filter(r => !r.error).length;
  }

  const hasMore = products && products.length === BATCH;
  const nextOffset = hasMore ? offsetParam + BATCH : null;

  return new Response(
    JSON.stringify({ success: true, updated, offset: offsetParam, nextOffset, hasMore }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

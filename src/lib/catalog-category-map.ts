/**
 * Maps raw supplier categories to simplified, unified display categories.
 * The original category is preserved in the DB — this is frontend-only normalization.
 */

// Mapping rules: [regex or startsWith pattern, simplified category]
const GOODIES_RULES: [RegExp, string][] = [
  // Sacs & Bagagerie
  [/^Bags & travel/i, "Sacs & Bagagerie"],
  [/^Bagagerie/i, "Sacs & Bagagerie"],
  [/^Packaging > Sacs/i, "Sacs & Bagagerie"],
  [/^Objets publicitaires > Sacs/i, "Sacs & Bagagerie"],
  [/^Accessoires > Sacs/i, "Sacs & Bagagerie"],

  // Boissons & Mugs
  [/^Drink & lunchware/i, "Boissons & Mugs"],
  [/^Drinkwear/i, "Boissons & Mugs"],
  [/^Objets publicitaires > Bouteilles/i, "Boissons & Mugs"],
  [/^Objets publicitaires > Mugs/i, "Boissons & Mugs"],
  [/^Objets publicitaires > Sous-verres/i, "Boissons & Mugs"],

  // Bureau & Écriture
  [/^Office & writing/i, "Bureau & Écriture"],
  [/^Objets publicitaires > Stylos/i, "Bureau & Écriture"],

  // Technologie
  [/^Technology/i, "Technologie"],

  // Outils & Porte-clés
  [/^Tools & keyrings/i, "Outils & Porte-clés"],

  // Bien-être & Maison
  [/^Home & wellness/i, "Bien-être & Maison"],

  // Cuisine
  [/^Kitchen & accessories/i, "Cuisine"],

  // Enfants & Jeux
  [/^Kids & games/i, "Enfants & Jeux"],

  // Événementiel
  [/^Lanyards & events/i, "Événementiel"],
  [/^Objets publicitaires > Badges/i, "Événementiel"],
  [/^Objets publicitaires > Magnets/i, "Événementiel"],

  // Plein air & Loisirs
  [/^Outdoor & leisure/i, "Plein air & Loisirs"],
  [/^Equipements sportifs/i, "Plein air & Loisirs"],

  // Parapluies
  [/^Umbrellas/i, "Parapluies"],
  [/^Objets publicitaires > Parapluies/i, "Parapluies"],
  [/^Accessoires > Parapluies/i, "Parapluies"],

  // Cadeaux
  [/^Seasonal gifts/i, "Cadeaux"],
  [/^Catalogues/i, "Cadeaux"],

  // Alimentaire
  [/^Alimentaire/i, "Alimentaire"],

  // Textile (goodies textile items from Midocean/PFC)
  [/^Clothing & wearables/i, "Textile"],
  [/^Head & multiwear/i, "Textile"],
  [/^Headwear/i, "Textile"],

  // Packaging
  [/^Packaging/i, "Packaging"],

  // Objets pub divers
  [/^Objets publicitaires/i, "Objets publicitaires"],
  [/^Accessoires >/i, "Accessoires"],
];

const TEXTILE_RULES: [RegExp, string][] = [
  // Sweats & Pulls — MUST come before T-shirts to avoid "Sweat-Shirts" matching /T-shirts/
  [/Sweat/i, "Sweats & Pulls"],
  [/Sweaters/i, "Sweats & Pulls"],
  [/Pullovers|Cardigans/i, "Sweats & Pulls"],
  [/^Pulls/i, "Sweats & Pulls"],

  // T-shirts (now safe: "Sweat-Shirts" already matched above)
  [/T-shirts/i, "T-shirts"],
  [/^Tees/i, "T-shirts"],
  [/Débardeurs/i, "T-shirts"],

  // Polos
  [/Polos/i, "Polos"],

  // Chemises (must come AFTER Sweat rules so "Sweat-shirts" doesn't match Shirts$)
  [/Chemises|Surchemises/i, "Chemises"],
  [/Shirts$/i, "Chemises"],

  // Vestes & Manteaux
  [/Vestes/i, "Vestes & Manteaux"],
  [/Jackets/i, "Vestes & Manteaux"],
  [/Softshells/i, "Vestes & Manteaux"],
  [/Bodywarmers/i, "Vestes & Manteaux"],
  [/^Extérieur/i, "Vestes & Manteaux"],

  // Pantalons & Shorts
  [/Pantalons|Pantacourts/i, "Pantalons & Shorts"],
  [/Bermudas|Shorts/i, "Pantalons & Shorts"],
  [/^Bas/i, "Pantalons & Shorts"],

  // Robes & Jupes
  [/Robes|Jupes/i, "Robes & Jupes"],

  // Tabliers
  [/Tabliers/i, "Tabliers"],

  // Accessoires textile
  [/Accessoires Vêtements/i, "Accessoires textile"],
  [/Headwear/i, "Accessoires textile"],
  [/^Head & multiwear/i, "Accessoires textile"],
  [/Foulards|Écharpes|Tours de cou/i, "Accessoires textile"],
  [/Bonnets|Casquettes|Bobs|Chapeau/i, "Accessoires textile"],

  // Linge
  [/Linge de maison/i, "Linge de maison"],
  [/Objets publicitaires > Serviettes/i, "Linge de maison"],

  // Sport
  [/Equipements sportifs/i, "Sport"],
  [/Sports & active wear/i, "Sport"],

  // Bagagerie
  [/Bagagerie/i, "Sacs & Bagagerie"],
  [/Packaging/i, "Sacs & Bagagerie"],

  // Chaussures
  [/Chaussures/i, "Chaussures"],

  // Body
  [/^Body/i, "T-shirts"],
];

const SIGNALETIQUE_RULES: [RegExp, string][] = [
  [/Bannières|Signalétique/i, "Bannières & Signalétique"],
  [/Panneaux/i, "Panneaux"],
  [/Canvas/i, "Canvas & Déco"],
  [/Décoration murale/i, "Canvas & Déco"],
  [/Vitrophanie/i, "Vitrophanie"],
  [/Signalétique sol/i, "Signalétique sol"],
  [/Posters|Affiches/i, "Posters & Affiches"],
  [/Stickers|Étiquettes/i, "Stickers & Étiquettes"],
  [/Cartes postales/i, "Cartes & Papeterie"],
  [/Cartes$/i, "Cartes & Papeterie"],
  [/Papeterie/i, "Cartes & Papeterie"],
  [/Enveloppes/i, "Cartes & Papeterie"],
  [/Chemises & Dossiers/i, "Cartes & Papeterie"],
  [/Calendriers/i, "Calendriers"],
  [/Flyers|Dépliants/i, "Flyers & Dépliants"],
  [/Magazines/i, "Magazines"],
  [/Menus/i, "Menus & Cartes"],
  [/Print > /i, "Impression"],
  [/Impression/i, "Impression"],
  [/Grand format/i, "Grand format"],
];

export function getSimplifiedCategory(
  rawCategory: string,
  tab: "goodies" | "textile" | "autre"
): string {
  if (!rawCategory || rawCategory === "general") return "Non classé";

  const rules =
    tab === "goodies"
      ? GOODIES_RULES
      : tab === "textile"
      ? TEXTILE_RULES
      : SIGNALETIQUE_RULES;

  for (const [regex, label] of rules) {
    if (regex.test(rawCategory)) return label;
  }

  // Fallback: use the first part before ">"
  const firstPart = rawCategory.split(">")[0].trim();
  return firstPart || "Autre";
}

/**
 * Determines which catalog tab a product belongs to based on its raw category.
 * When a category matches rules in multiple tabs, uses midocean_id prefix as tiebreaker.
 * Falls back to midocean_id prefix if no category rule matches.
 */
export function getCatalogTabByCategory(
  rawCategory: string,
  midoceanId?: string | null
): "goodies" | "textile" | "autre" {
  const id = (midoceanId ?? "").toUpperCase();
  const prefixTab: "goodies" | "textile" | "autre" =
    (id.startsWith("SS-") || id.startsWith("TT-")) ? "textile"
    : id.startsWith("PRINT-") ? "autre"
    : "goodies";

  if (!rawCategory || rawCategory === "general") return prefixTab;

  // Check which rule sets match
  const matchesGoodies = GOODIES_RULES.some(([regex]) => regex.test(rawCategory));
  const matchesTextile = TEXTILE_RULES.some(([regex]) => regex.test(rawCategory));
  const matchesSigna = SIGNALETIQUE_RULES.some(([regex]) => regex.test(rawCategory));

  // Count how many sets match
  const matches = [
    matchesGoodies && "goodies",
    matchesTextile && "textile",
    matchesSigna && "autre",
  ].filter(Boolean) as ("goodies" | "textile" | "autre")[];

  if (matches.length === 0) return prefixTab; // No rule matched → use prefix
  if (matches.length === 1) return matches[0]; // Unambiguous → use that tab

  // Ambiguous: category matches multiple rule sets → use prefix as tiebreaker
  if (matches.includes(prefixTab)) return prefixTab;
  return matches[0]; // Shouldn't happen often, but pick first match
}

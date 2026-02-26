/**
 * Maps raw supplier categories to simplified, unified display categories.
 * The original category is preserved in the DB — this is frontend-only normalization.
 *
 * Suppliers covered: Midocean (EN), XD Connects (FR), PF Concept (FR),
 * TopTex (FR), Stanley/Stella (FR/EN), Print.com (FR).
 *
 * IMPORTANT: Rules are evaluated top-to-bottom. Place specific patterns
 * BEFORE generic ones to avoid mis-classification.
 */

// ─── GOODIES tab rules ──────────────────────────────────────────
const GOODIES_RULES: [RegExp, string][] = [
  // ── Sacs & Bagagerie ──
  [/Bags & travel/i, "Sacs & Bagagerie"],
  [/Sacs & Voyage/i, "Sacs & Bagagerie"],
  [/Bagagerie/i, "Sacs & Bagagerie"],
  [/Accessoires > Sacs/i, "Sacs & Bagagerie"],
  [/Packaging > Sacs/i, "Sacs & Bagagerie"],

  // ── Boissons & Mugs ──
  [/Drink/i, "Boissons & Mugs"],
  [/Drinkwear/i, "Boissons & Mugs"],
  [/Art de la boisson/i, "Boissons & Mugs"],
  [/Bouteilles/i, "Boissons & Mugs"],
  [/Mugs|Tasses/i, "Boissons & Mugs"],
  [/Verrerie/i, "Boissons & Mugs"],
  [/Vin & Bar/i, "Boissons & Mugs"],

  // ── Bureau & Écriture ──
  [/Office & writing/i, "Bureau & Écriture"],
  [/Écriture/i, "Bureau & Écriture"],
  [/Conférenciers & Carnets/i, "Bureau & Écriture"],
  [/Stylos/i, "Bureau & Écriture"],

  // ── Technologie ──
  [/Technology/i, "Technologie"],
  [/Accessoires Téléphones/i, "Technologie"],
  [/Powerbanks/i, "Technologie"],
  [/Chargeurs/i, "Technologie"],
  [/Audio/i, "Technologie"],

  // ── Outils & Porte-clés ──
  [/Tools & keyrings/i, "Outils & Porte-clés"],
  [/Outils & Torches/i, "Outils & Porte-clés"],
  [/Lanyards & Porte-clés/i, "Outils & Porte-clés"],

  // ── Bien-être & Maison ──
  [/Home & wellness/i, "Bien-être & Maison"],
  [/Maison & Art de vivre/i, "Bien-être & Maison"],
  [/Bougies|Diffuseurs/i, "Bien-être & Maison"],
  [/Bien.?[eê]tre/i, "Bien-être & Maison"],
  [/Couvertures/i, "Bien-être & Maison"],
  [/Intérieur/i, "Bien-être & Maison"],

  // ── Cuisine ──
  [/Kitchen/i, "Cuisine"],
  [/Accessoires cuisine/i, "Cuisine"],
  [/Boîtes lunch/i, "Cuisine"],
  [/Vaiselle|Vaisselle/i, "Cuisine"],
  [/Accessoires de table/i, "Cuisine"],
  [/Barbecue/i, "Cuisine"],

  // ── Enfants & Jeux ──
  [/Kids & games/i, "Enfants & Jeux"],
  [/Peluches/i, "Enfants & Jeux"],
  [/Jeux/i, "Enfants & Jeux"],

  // ── Événementiel ──
  [/Lanyards & events/i, "Événementiel"],
  [/Badges/i, "Événementiel"],
  [/Magnets/i, "Événementiel"],

  // ── Plein air & Loisirs ──
  [/Outdoor & leisure/i, "Plein air & Loisirs"],
  [/Plein Air/i, "Plein air & Loisirs"],
  [/Lunettes de soleil/i, "Plein air & Loisirs"],
  [/Pique.?nique/i, "Plein air & Loisirs"],
  [/isothermes/i, "Plein air & Loisirs"],
  [/Serviettes de plage/i, "Plein air & Loisirs"],
  [/Equipements sportifs/i, "Plein air & Loisirs"],

  // ── Parapluies ──
  [/Parapluies/i, "Parapluies"],
  [/Umbrellas/i, "Parapluies"],

  // ── Voiture & Sécurité ──
  [/Voiture & Sécurité/i, "Voiture & Sécurité"],
  [/Accessoires pour voiture/i, "Voiture & Sécurité"],
  [/Accessoires vélo/i, "Voiture & Sécurité"],
  [/Gilets de sécurité/i, "Voiture & Sécurité"],
  [/Premiers secours/i, "Voiture & Sécurité"],
  [/Bandes réfléchissantes/i, "Voiture & Sécurité"],

  // ── Cadeaux ──
  [/Seasonal gifts/i, "Cadeaux"],
  [/Catalogues/i, "Cadeaux"],

  // ── Alimentaire ──
  [/Alimentaire/i, "Alimentaire"],

  // ── Textile goodies (Midocean/PFC textile items in goodies tab) ──
  [/Clothing & wearables/i, "Textile"],
  [/^Headwear$/i, "Textile"],
  [/Head & multiwear/i, "Textile"],
  [/^Textiles > /i, "Textile"],

  // ── Catch-all ──
  [/Packaging/i, "Packaging"],
  [/Accessoires >/i, "Accessoires"],
  [/Objets publicitaires/i, "Objets publicitaires"],
];

// ─── TEXTILE tab rules ──────────────────────────────────────────
const TEXTILE_RULES: [RegExp, string][] = [
  // ── Sweats & Pulls (MUST come before T-shirts) ──
  [/Sweat/i, "Sweats & Pulls"],
  [/Sweaters/i, "Sweats & Pulls"],
  [/Pullovers|Cardigans/i, "Sweats & Pulls"],
  [/Gilets(?! de sécurité)/i, "Sweats & Pulls"],
  [/^Pulls/i, "Sweats & Pulls"],

  // ── T-shirts ──
  [/T-shirts/i, "T-shirts"],
  [/^Tees/i, "T-shirts"],
  [/Débardeurs/i, "T-shirts"],
  [/Tuniques/i, "T-shirts"],
  [/Bodys|^Body/i, "T-shirts"],
  [/Maillots de sport/i, "T-shirts"],

  // ── Polos ──
  [/Polos/i, "Polos"],

  // ── Chemises (after Sweat rules) ──
  [/Chemises|Surchemises|Chemisiers|Blouses/i, "Chemises"],
  [/^Shirts > /i, "Chemises"],

  // ── Vestes & Manteaux ──
  [/Vestes/i, "Vestes & Manteaux"],
  [/Jackets/i, "Vestes & Manteaux"],
  [/Softshells/i, "Vestes & Manteaux"],
  [/Bodywarmers/i, "Vestes & Manteaux"],
  [/Ponchos/i, "Vestes & Manteaux"],
  [/^Extérieur/i, "Vestes & Manteaux"],
  [/Chasubles/i, "Vestes & Manteaux"],
  [/Combinaisons/i, "Vestes & Manteaux"],
  [/Blouses de travail/i, "Vestes & Manteaux"],

  // ── Pantalons & Shorts ──
  [/Pantalons|Pantacourts/i, "Pantalons & Shorts"],
  [/Bermudas|Shorts/i, "Pantalons & Shorts"],
  [/Salopettes/i, "Pantalons & Shorts"],
  [/Jeans/i, "Pantalons & Shorts"],
  [/^Bas > /i, "Pantalons & Shorts"],

  // ── Robes & Jupes ──
  [/Robes|Jupes/i, "Robes & Jupes"],
  [/Maillots de bain/i, "Robes & Jupes"],

  // ── Tabliers ──
  [/Tabliers/i, "Tabliers"],

  // ── Sous-vêtements ──
  [/Sous-vêtements/i, "Sous-vêtements"],
  [/Pyjamas/i, "Sous-vêtements"],
  [/Maillots de Corps/i, "Sous-vêtements"],
  [/Boxers|Caleçons|Brassières/i, "Sous-vêtements"],
  [/Chaussettes/i, "Sous-vêtements"],

  // ── Accessoires textile ──
  [/Headwear & Accessoires/i, "Accessoires textile"],
  [/Accessoires Vêtements/i, "Accessoires textile"],
  [/^Head & multiwear/i, "Accessoires textile"],
  [/Foulards|Écharpes|Tours de cou|Étoles/i, "Accessoires textile"],
  [/Bonnets|Casquettes|Bobs|Chapeau|Bérets|Cagoules|Calots|Bandanas|Bandeaux/i, "Accessoires textile"],
  [/Gants/i, "Accessoires textile"],
  [/Ceintures|Cravates|Bretelles|Genouillères/i, "Accessoires textile"],
  [/Bavoir|Étuis/i, "Accessoires textile"],
  [/Poches d'identité/i, "Accessoires textile"],
  [/Masques/i, "Accessoires textile"],
  [/Lunettes & housses/i, "Accessoires textile"],
  [/Casques(?! audio)/i, "Accessoires textile"],

  // ── Linge de maison ──
  [/Linge de maison/i, "Linge de maison"],
  [/Textiles de salle de bains/i, "Linge de maison"],
  [/Serviettes(?! de plage)/i, "Linge de maison"],
  [/Décoration/i, "Linge de maison"],

  // ── Sport ──
  [/Equipements sportifs/i, "Sport"],
  [/Sports & active wear/i, "Sport"],
  [/Bien Être & Sport/i, "Sport"],
  [/Accessoires Sportives/i, "Sport"],
  [/Crampons/i, "Sport"],

  // ── Chaussures ──
  [/Chaussures/i, "Chaussures"],

  // ── Sacs (textile context) ──
  [/Bagagerie/i, "Sacs & Bagagerie"],
  [/Accessoires > Sacs/i, "Sacs & Bagagerie"],

  // ── Catch-all textile ──
  [/^Textiles > /i, "Textile divers"],
  [/Packaging/i, "Accessoires textile"],
];

// ─── SIGNALÉTIQUE tab rules ─────────────────────────────────────
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
    : "goodies"; // Midocean, PFC-, XDC-, or no prefix

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
  return matches[0];
}

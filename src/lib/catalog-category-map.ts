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
  [/Bike/i, "Sport"],
  [/Run/i, "Sport"],
  [/Ski/i, "Sport"],
  [/Training/i, "Sport"],
  [/Squad/i, "Sport"],
  [/Gameday/i, "Sport"],

  // ── Chaussures ──
  [/Chaussures/i, "Chaussures"],

  // ── Sacs (textile context) ──
  [/Bagagerie/i, "Sacs & Bagagerie"],
  [/Accessoires > Sacs/i, "Sacs & Bagagerie"],

  // ── Accessoires Craft/New Wave ──
  [/Accessoires$/i, "Accessoires textile"],
  [/Baselayer/i, "Sous-vêtements"],
  [/Midlayer/i, "Sweats & Pulls"],

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

  // Fallback: use the first segment before ">"
  const firstPart = rawCategory.split(">")[0].trim();
  return firstPart || "Autre";
}

// ─── SUBCATEGORY normalization ──────────────────────────────────
// Maps raw category strings to unified subcategory labels within each simplified category.
// Rules: [regex tested against FULL raw category, unified subcategory label]

const SUBCATEGORY_RULES: Record<string, [RegExp, string][]> = {
  // ── GOODIES ──
  "Sacs & Bagagerie": [
    [/à dos.*(ordi|laptop|computer)/i, "Sacs à dos ordinateur"],
    [/Anti.?Vol/i, "Sacs à dos anti-vol"],
    [/à dos.*(outdoor|aventure)/i, "Sacs à dos outdoor"],
    [/à dos/i, "Sacs à dos"],
    [/à cordon/i, "Sacs à cordon"],
    [/Sacoches ordi|ordinateur Exec/i, "Sacoches ordinateur"],
    [/bandoulière/i, "Sacs bandoulière"],
    [/shopping|tote/i, "Sacs shopping & tote"],
    [/weekend|sport/i, "Sacs week-end & sport"],
    [/plage/i, "Sacs de plage"],
    [/Trousses de toilette|toilette/i, "Trousses de toilette"],
    [/Housses à vêtements/i, "Housses"],
    [/Porte-cartes|portefeuilles/i, "Porte-cartes & portefeuilles"],
    [/Accessoires.*(Voyage|Bagag)/i, "Accessoires voyage"],
    [/Valises/i, "Valises"],
    [/Housses/i, "Housses"],
    [/Paniers/i, "Paniers"],
  ],
  "Boissons & Mugs": [
    [/thermos/i, "Bouteilles thermos"],
    [/infusion/i, "Bouteilles d'infusion"],
    [/eau|water|sport/i, "Bouteilles & gourdes"],
    [/Gourdes|Bouteilles/i, "Bouteilles & gourdes"],
    [/Porte-gourdes/i, "Accessoires"],
    [/céramique/i, "Mugs & tasses"],
    [/Tasses|café|mugs/i, "Mugs & tasses"],
    [/Verrerie/i, "Verrerie"],
    [/Vin & Bar/i, "Vin & bar"],
  ],
  "Technologie": [
    [/Powerbanks/i, "Batteries & powerbanks"],
    [/Chargeurs sans fil/i, "Chargeurs sans fil"],
    [/Chargeurs/i, "Chargeurs"],
    [/Connecteurs|Câbles/i, "Câbles & connectique"],
    [/Hubs/i, "Hubs & adaptateurs"],
    [/Adaptateurs/i, "Hubs & adaptateurs"],
    [/FindMy/i, "Trackers FindMy"],
    [/Montres/i, "Montres connectées"],
    [/Support/i, "Supports"],
    [/Gadgets/i, "Gadgets"],
    [/jeux électroniques/i, "Gaming"],
    [/Pointeurs|laser/i, "Présentateurs"],
    [/Solaire/i, "Solaire"],
    [/Casques audio/i, "Casques audio"],
    [/Haut-parleurs/i, "Enceintes"],
    [/Sans fil/i, "Écouteurs sans fil"],
    [/Accessoires de bureau/i, "Accessoires de bureau"],
  ],
  "Bureau & Écriture": [
    [/plastique/i, "Stylos plastique"],
    [/métal/i, "Stylos métal"],
    [/Set stylos/i, "Sets de stylos"],
    [/Crayons/i, "Crayons"],
    [/Autres stylos/i, "Autres stylos"],
    [/Carnets.*basic/i, "Carnets de notes"],
    [/Carnets.*deluxe/i, "Carnets premium"],
    [/Conférenciers/i, "Conférenciers"],
    [/Ball pens/i, "Stylos"],
  ],
  "Outils & Porte-clés": [
    [/Torches/i, "Torches & lampes"],
    [/Lampe/i, "Torches & lampes"],
    [/Éclairage/i, "Torches & lampes"],
    [/Mètres/i, "Mètres & mesure"],
    [/Règles|cutters/i, "Règles & cutters"],
    [/multi-fonctions/i, "Multi-outils"],
    [/Set d'outils/i, "Sets d'outils"],
    [/Cadeau outils/i, "Coffrets cadeaux"],
    [/Stylos-outil/i, "Stylos-outils"],
    [/Porte-clés/i, "Porte-clés"],
  ],
  "Bien-être & Maison": [
    [/Bien-être|soins/i, "Bien-être & soins"],
    [/Bougies|Diffuseurs/i, "Bougies & diffuseurs"],
    [/Couvertures/i, "Couvertures"],
    [/Intérieur/i, "Décoration intérieure"],
    [/Textiles de salle/i, "Linge de bain"],
  ],
  "Cuisine": [
    [/Accessoires cuisine/i, "Accessoires cuisine"],
    [/Boîtes lunch/i, "Lunch boxes"],
    [/Vaiselle|Vaisselle/i, "Vaisselle"],
    [/Accessoires de table/i, "Arts de la table"],
    [/Barbecue/i, "Barbecue"],
  ],
  "Plein air & Loisirs": [
    [/isothermes/i, "Sacs isothermes"],
    [/Lunettes de soleil/i, "Lunettes de soleil"],
    [/Pique/i, "Pique-nique"],
    [/Barbecue/i, "Barbecue"],
    [/Serviettes de plage/i, "Serviettes de plage"],
    [/Accessoires.*(sport|Sportive)/i, "Accessoires sport"],
    [/Ballons/i, "Ballons & sport"],
    [/Crampons/i, "Sport"],
    [/Entraînement|Terrain/i, "Matériel de terrain"],
    [/Gonflage/i, "Accessoires sport"],
    [/Arbitrage/i, "Accessoires sport"],
  ],
  "Parapluies": [
    [/golf/i, "Parapluies de golf"],
    [/pliables/i, "Parapluies pliables"],
    [/standard|≤\s*23/i, "Parapluies standard"],
    [/entre 23/i, "Parapluies moyens"],
  ],
  "Voiture & Sécurité": [
    [/voiture/i, "Accessoires voiture"],
    [/vélo/i, "Accessoires vélo"],
    [/Gilets de sécurité/i, "Gilets de sécurité"],
    [/Premiers secours/i, "Premiers secours"],
    [/Bandes réfléchissantes/i, "Sécurité"],
  ],
  "Enfants & Jeux": [
    [/Peluches/i, "Peluches"],
    [/Jeux/i, "Jeux"],
    [/Vêtements.*peluche/i, "Accessoires peluches"],
  ],

  // ── TEXTILE ──
  "Sweats & Pulls": [
    [/capuche|à capuche/i, "Sweats à capuche"],
    [/zippés|zip/i, "Sweats zippés"],
    [/col rond/i, "Sweats col rond"],
    [/polaires/i, "Polaires"],
    [/Pullovers|Cardigans/i, "Pulls & cardigans"],
    [/Gilets/i, "Gilets"],
  ],
  "T-shirts": [
    [/Débardeurs/i, "Débardeurs"],
    [/Maillots de sport/i, "Maillots de sport"],
    [/Tuniques/i, "Tuniques"],
    [/Body/i, "Bodys"],
    [/enfants/i, "T-shirts enfants"],
    [/femmes/i, "T-shirts femmes"],
    [/unisexes/i, "T-shirts unisexes"],
  ],
  "Vestes & Manteaux": [
    [/Bodywarmers/i, "Bodywarmer"],
    [/Ponchos/i, "Ponchos"],
    [/matelassée/i, "Vestes matelassées"],
    [/non matelassée/i, "Vestes légères"],
    [/légère matelassée/i, "Doudounes légères"],
    [/Chasubles/i, "Chasubles"],
    [/Combinaisons/i, "Combinaisons"],
    [/Blouses de travail/i, "Blouses de travail"],
    [/polaires/i, "Polaires"],
  ],
  "Pantalons & Shorts": [
    [/Bermudas|Shorts/i, "Bermudas & shorts"],
    [/Salopettes/i, "Salopettes"],
    [/Jeans/i, "Jeans"],
  ],
  "Accessoires textile": [
    [/Casquettes/i, "Casquettes"],
    [/Bonnets/i, "Bonnets"],
    [/Bobs/i, "Bobs"],
    [/Bérets/i, "Bérets"],
    [/Écharpes|Étoles|Tours de cou/i, "Écharpes & tours de cou"],
    [/Bandanas/i, "Bandanas"],
    [/Bandeaux/i, "Bandeaux"],
    [/Gants/i, "Gants"],
    [/Cagoules/i, "Cagoules"],
    [/Chapeaux/i, "Chapeaux"],
    [/Casques/i, "Casques de protection"],
    [/Foulards/i, "Foulards"],
    [/Ceintures/i, "Ceintures"],
    [/Cravates/i, "Cravates"],
    [/Bretelles/i, "Bretelles"],
    [/Genouillères/i, "Genouillères"],
    [/Masques/i, "Masques"],
    [/Brassards/i, "Brassards"],
    [/Lunettes/i, "Lunettes"],
    [/Poches d'identité/i, "Poches d'identité"],
  ],
  "Sous-vêtements": [
    [/Chaussettes/i, "Chaussettes"],
    [/Boxers|Caleçons/i, "Boxers & caleçons"],
    [/Brassières/i, "Brassières"],
    [/Maillots de Corps/i, "Maillots de corps"],
    [/Pyjamas/i, "Pyjamas"],
  ],
  "Chaussures": [
    [/sécurité/i, "Chaussures de sécurité"],
    [/travail/i, "Chaussures de travail"],
    [/Lifestyle|Loisir/i, "Chaussures lifestyle"],
    [/Accessoires chaussures/i, "Accessoires"],
  ],
  "Linge de maison": [
    [/Bain/i, "Linge de bain"],
    [/Décoration/i, "Décoration"],
    [/salle de bains/i, "Linge de bain"],
  ],
  "Sport": [
    [/Accessoires.*(sport|Sportive)/i, "Accessoires sport"],
    [/Ballons/i, "Ballons"],
    [/Crampons/i, "Crampons"],
    [/Entraînement|Terrain/i, "Matériel de terrain"],
    [/Gonflage/i, "Accessoires"],
    [/Arbitrage/i, "Arbitrage"],
  ],
};

/**
 * Returns a normalized subcategory label for a raw category within a given simplified category.
 * Falls back to the last segment of the raw category if no rule matches.
 */
export function getSimplifiedSubCategory(
  rawCategory: string,
  simplifiedCategory: string
): string {
  if (!rawCategory) return "Autre";

  const rules = SUBCATEGORY_RULES[simplifiedCategory];
  if (rules) {
    for (const [regex, label] of rules) {
      if (regex.test(rawCategory)) return label;
    }
  }

  // Fallback: last segment after ">"
  const parts = rawCategory.split(">");
  const last = parts[parts.length - 1].trim();
  return last || "Autre";
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
    (id.startsWith("SS-") || id.startsWith("TT-") || id.startsWith("NW-")) ? "textile"
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

// ─── PRODUCT FAMILY / OCCASION ──────────────────────────────────
// Maps raw category + description to a "family" or "occasion" bucket.
// Used for cross-cutting filters beyond the category hierarchy.

const FAMILY_RULES: [RegExp, string][] = [
  // Sport
  [/sport|training|run|bike|ski|squad|gameday|fitness|gym|athletic|active\s*wear|performance/i, "Sport"],
  // Cuisine
  [/kitchen|cuisine|lunch|barbecue|vaisselle|table|cook|food/i, "Cuisine"],
  // Maison & Bien-être
  [/home|maison|intérieur|couverture|bougie|diffuseur|wellness|bien.?[eê]tre|candle|spa|relax|salle de bain/i, "Maison & Bien-être"],
  // Bureau
  [/office|bureau|écriture|writing|conference|conférenc|desk|organis/i, "Bureau"],
  // Voyage & Plein air
  [/travel|voyage|outdoor|plein\s*air|camping|hik|randonn|pique.?nique|beach|plage/i, "Voyage & Plein air"],
  // Enfants
  [/kids|enfant|bébé|baby|children|peluche|jouet/i, "Enfants"],
  // Technologie
  [/tech|power.?bank|chargeur|audio|usb|électr|gadget|smart|connect/i, "Technologie"],
  // Événementiel
  [/event|événement|lanyard|badge|congrès|salon|séminaire|gift|cadeau/i, "Événementiel"],
  // Budget (based on price thresholds handled separately, but keyword match)
  [/budget|économique|value|basic|entry.?level/i, "Budget"],
  // Premium
  [/premium|luxury|luxe|exclusive|prestige|deluxe|haut\s*de\s*gamme/i, "Premium"],
  // Sécurité & Workwear
  [/sécurité|safety|workwear|travail|protection|haute\s*visibilité|hi.?vis/i, "Workwear"],
];

/**
 * Derives a product family/occasion from raw category and description.
 * Returns an array (a product can belong to multiple families).
 */
export function deriveProductFamily(
  rawCategory: string,
  description?: string | null,
  brand?: string | null,
): string[] {
  const families = new Set<string>();
  const combined = `${rawCategory || ""} ${description || ""} ${brand || ""}`;

  for (const [regex, family] of FAMILY_RULES) {
    if (regex.test(combined)) {
      families.add(family);
    }
  }

  return Array.from(families);
}

// ─── PRODUCT LABELS / TAGS ──────────────────────────────────────
// Predefined labels that can be auto-detected from supplier data.

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

/**
 * Derives product tags/labels from category, description, and composition.
 * Returns an array of matched labels.
 */
export function deriveProductTags(
  rawCategory: string,
  description?: string | null,
  composition?: string | null,
  brand?: string | null,
): string[] {
  const tags = new Set<string>();
  const combined = `${rawCategory || ""} ${description || ""} ${composition || ""} ${brand || ""}`;

  for (const [regex, tag] of TAG_RULES) {
    if (regex.test(combined)) {
      tags.add(tag);
    }
  }

  return Array.from(tags);
}

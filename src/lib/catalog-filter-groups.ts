/**
 * Groups raw color names and sizes into simplified filter families.
 * Used in catalog filter UI to reduce visual clutter.
 */

// ─── Color families ──────────────────────────────────────────────
type ColorFamily = {
  label: string;
  /** Representative hex for the swatch */
  hex: string;
  /** Regex patterns matching raw color names */
  patterns: RegExp[];
};

const COLOR_FAMILIES: ColorFamily[] = [
  {
    label: "Blanc",
    hex: "#FFFFFF",
    patterns: [
      /white/i, /ivory/i, /cream/i, /natural/i, /ecru/i, /linen/i,
      /^vanilla/i, /snow/i, /off.?white/i, /vintage white/i,
    ],
  },
  {
    label: "Noir",
    hex: "#1a1a1a",
    patterns: [
      /black/i, /noir/i, /^RE-Black$/i, /charcoal/i,
    ],
  },
  {
    label: "Gris",
    hex: "#9ca3af",
    patterns: [
      /gr[ae]y/i, /anthracite/i, /stone/i, /metal/i, /graphite/i,
      /mineral/i, /misty/i, /ash/i, /silver/i, /zinc/i, /steel/i,
      /gun.?metal/i, /smoke/i, /heather(?!.*green|.*blue|.*rose)/i,
    ],
  },
  {
    label: "Bleu",
    hex: "#3b82f6",
    patterns: [
      /blue/i, /navy/i, /cobalt/i, /azure/i, /indigo/i, /denim/i,
      /aqua/i, /ocean/i, /sea\b/i, /sky/i, /horizon/i, /pool/i,
      /sapphire/i, /marine/i, /hydro/i, /caribbean/i, /worker/i,
      /soul/i, /topaz/i,
    ],
  },
  {
    label: "Vert",
    hex: "#22c55e",
    patterns: [
      /green/i, /khaki/i, /jade/i, /olive/i, /sage/i, /teal/i,
      /mint/i, /forest/i, /emerald/i, /aloe/i, /almond/i,
      /amazon/i, /stem/i, /brook/i, /monstera/i, /moss/i,
      /^go green$/i, /lime/i, /pine/i, /bottle/i, /fern/i,
      /kaki/i, /vert/i,
    ],
  },
  {
    label: "Rouge",
    hex: "#ef4444",
    patterns: [
      /^red$/i, /^red /i, / red$/i, /burgundy/i, /bordeaux/i,
      /cherry/i, /garnet/i, /crimson/i, /wine/i, /ruby/i,
      /brick/i, /dark cherry/i, /rouge/i, /scarlet/i, /maroon/i,
    ],
  },
  {
    label: "Rose",
    hex: "#f472b6",
    patterns: [
      /pink/i, /rose/i, /coral/i, /blush/i, /fuchsia/i,
      /magenta/i, /raspberry/i, /blossom/i, /candy/i, /sorbet/i,
      /petal/i, /cotton pink/i, /canyon/i, /orchid/i, /parma/i,
      /lilac/i,
    ],
  },
  {
    label: "Jaune",
    hex: "#eab308",
    patterns: [
      /yellow/i, /gold/i, /lemon/i, /citrus/i, /curcuma/i,
      /mustard/i, /honey/i, /sun/i, /jaune/i, /butter/i,
    ],
  },
  {
    label: "Orange",
    hex: "#f97316",
    patterns: [
      /orange/i, /peach/i, /apricot/i, /tangerine/i, /paprika/i,
      /sienna/i, /flame/i, /pomelo/i, /ochre/i, /pêche/i,
      /fraiche peche/i, /amber/i, /copper/i,
    ],
  },
  {
    label: "Violet",
    hex: "#a855f7",
    patterns: [
      /purple/i, /violet/i, /mauve/i, /plum/i, /lavender/i,
    ],
  },
  {
    label: "Marron",
    hex: "#92400e",
    patterns: [
      /brown/i, /beige/i, /camel/i, /mocha/i, /latte/i, /sand/i,
      /tan\b/i, /taupe/i, /coffee/i, /cocoa/i, /chocolate/i,
      /cinnamon/i, /cedar/i, /terracotta/i, /driftwood/i,
      /pampa/i, /grounded/i, /warm earth/i, /wet sand/i,
    ],
  },
  {
    label: "Multicolore",
    hex: "linear-gradient(135deg, #ef4444, #eab308, #22c55e, #3b82f6)",
    patterns: [
      /mix/i, /multi/i, /stripe/i, /check/i, /patchwork/i,
      /floral/i, /pattern/i, /print/i, /hawaiian/i, /paradise/i,
      /mosaic/i, /mozaic/i, /leaves/i, /dots/i, /dotted/i,
      /herringbone/i, /twill/i, /pixel/i, /crosscheck/i, /lines/i,
    ],
  },
];

/**
 * Returns the color family label for a raw color name.
 * Falls back to the raw name if no family matches.
 */
export function getColorFamily(rawColor: string): string {
  if (!rawColor) return "Autre";
  for (const family of COLOR_FAMILIES) {
    if (family.patterns.some((p) => p.test(rawColor))) return family.label;
  }
  return "Autre";
}

/** Get representative hex for a color family */
export function getColorFamilyHex(familyLabel: string): string {
  const family = COLOR_FAMILIES.find((f) => f.label === familyLabel);
  return family?.hex ?? "#888888";
}

/** Returns all defined color family labels in display order */
export function getAllColorFamilies(): string[] {
  return COLOR_FAMILIES.map((f) => f.label);
}


// ─── Size groups ─────────────────────────────────────────────────

type SizeGroup = {
  label: string;
  /** Matches for this group */
  pattern: RegExp;
  sortOrder: number;
};

const SIZE_GROUPS: SizeGroup[] = [
  { label: "XXS", pattern: /^XXS$/i, sortOrder: 1 },
  { label: "XS", pattern: /^XS$/i, sortOrder: 2 },
  { label: "S", pattern: /^S$/i, sortOrder: 3 },
  { label: "M", pattern: /^M$/i, sortOrder: 4 },
  { label: "L", pattern: /^L$/i, sortOrder: 5 },
  { label: "XL", pattern: /^XL$/i, sortOrder: 6 },
  { label: "XXL", pattern: /^XXL$/i, sortOrder: 7 },
  { label: "3XL+", pattern: /^[3-6]XL$/i, sortOrder: 8 },
  { label: "Double (XS/S…)", pattern: /^(XXS\/XS|XS\/S|S\/M|M\/L|L\/XL|XL\/XXL|XXL\/3XL)$/i, sortOrder: 9 },
  { label: "Tailles FR", pattern: /^\d{2}\s*FR$/i, sortOrder: 10 },
  { label: "Pointures EU", pattern: /^\d{2}(\/\d{2})?\s*EU$/i, sortOrder: 11 },
  { label: "Enfant", pattern: /^\d{1,2}(\/\d{1,2})?\s*ans$/i, sortOrder: 12 },
  { label: "Bébé", pattern: /^\d{1,2}[-\/]\d{1,2}\s*m/i, sortOrder: 13 },
  { label: "Bébé", pattern: /^\d{1,2}M$/i, sortOrder: 13 },
  { label: "Taille unique", pattern: /^(one\s*size|os|taille\s*(unique|1|2))$/i, sortOrder: 14 },
];

/**
 * Returns the size group label for a raw size name.
 */
export function getSizeGroup(rawSize: string): string {
  if (!rawSize) return "Autre";
  const trimmed = rawSize.replace(/"/g, "").trim();
  for (const group of SIZE_GROUPS) {
    if (group.pattern.test(trimmed)) return group.label;
  }
  return "Autre";
}

/** Returns all size groups sorted by display order */
export function getSizeGroupOrder(): string[] {
  const seen = new Set<string>();
  return SIZE_GROUPS
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((g) => {
      if (seen.has(g.label)) return false;
      seen.add(g.label);
      return true;
    })
    .map((g) => g.label);
}

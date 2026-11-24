export type CollectionSlug = "traditional-shaker" | "slim-shaker" | "flat";
export type FinishSlug =
  | "premium-oak"
  | "ivory-oak"
  | "classic-walnut"
  | "iron-black"
  | "frosty-white";
export type CeilingHeightFt = 8 | 9 | 10;
export type LayoutId = "l-shape" | "galley" | "island" | "vanity" | "u-shape";

export interface FinishSpec {
  slug: FinishSlug;
  name: string;
  shortNote: string;
  swatchHex: string;
  swatchImage: string;
  edgeHex: string;
  isDark: boolean;
  clearcoat: number;
  clearcoatRoughness: number;
  roughnessScale: number;
  normalScale: number;
}

export interface CollectionSpec {
  slug: CollectionSlug;
  name: string;
  styleTag: string;
  summary: string;
  profileNote: string;
  finishes: FinishSlug[];
  defaultFinish: FinishSlug;
  /** PLACEHOLDER_DIMS — stand-in door profile measurements until Woodoo catalog PDF is confirmed */
  profileDimsMm: {
    stileWidth: number;
    railWidth: number;
    recessDepth: number;
    doorThickness: number;
    bevelMm: number;
  };
}

export interface SiteConfig {
  BRAND_NAME: string;
  BRAND_WORKING_TITLE_NOTE: string;
  LOGO_SRC: string | null;
  LOGO_ALT: string;
  SITE_URL: string;
  SHOWROOM_ADDRESS: string;
  SHOWROOM_CITY_STATE: string;
  OPENING_DATE: string;
  PHONE: string;
  EMAIL: string;
  RESPONSE_PROMISE: string;
  CAL_BOOKING_URL: string;
  featureFlags: {
    dealerChannel: boolean;
    sound: boolean;
    testimonials: boolean;
  };
  /**
   * PLACEHOLDER_DIMS — Standard 32 mm-system North American frameless proportions.
   * Only the 2.0 mm reveal and 3-inch crown molding for 8/9/10 ft ceilings are confirmed
   * from public specifications. Confirm remaining box dimensions against the Woodoo catalog.
   */
  PLACEHOLDER_DIMS: {
    isPlaceholder: true;
    confirmedRevealMm: 2.0;
    confirmedMoldingInches: 3.0;
    carcassThicknessMm: number;
    backPanelThicknessMm: number;
    baseHeightIn: number;
    baseDepthIn: number;
    toeKickHeightIn: number;
    toeKickRecessIn: number;
    wallDepthIn: number;
    tallDepthIn: number;
    vanityHeightIn: number;
    vanityDepthIn: number;
    countertopThicknessIn: number;
    countertopOverhangIn: number;
    backsplashHeightIn: number;
    ceilingHeightsIn: Record<CeilingHeightFt, number>;
    wallHeightsByCeilingIn: Record<
      CeilingHeightFt,
      { mainWallIn: number; stackedUpperIn: number; moldingIn: number }
    >;
  };
}

export const SITE_CONFIG: SiteConfig = {
  BRAND_NAME: process.env.NEXT_PUBLIC_BRAND_NAME || "Woodoo Dallas",
  BRAND_WORKING_TITLE_NOTE: "Working title — DFW branch",
  LOGO_SRC: process.env.NEXT_PUBLIC_LOGO_SRC || null,
  LOGO_ALT: process.env.NEXT_PUBLIC_BRAND_NAME || "Woodoo Dallas",
  SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "https://dfw-preview.local",
  SHOWROOM_ADDRESS:
    process.env.NEXT_PUBLIC_SHOWROOM_ADDRESS || "{{SHOWROOM_ADDRESS}}",
  SHOWROOM_CITY_STATE: "Dallas–Fort Worth, TX",
  OPENING_DATE: process.env.NEXT_PUBLIC_OPENING_DATE || "{{OPENING_DATE}}",
  PHONE: process.env.NEXT_PUBLIC_PHONE || "{{PHONE}}",
  EMAIL: process.env.NEXT_PUBLIC_EMAIL || "{{EMAIL}}",
  RESPONSE_PROMISE:
    process.env.NEXT_PUBLIC_RESPONSE_PROMISE || "{{RESPONSE_PROMISE}}",
  CAL_BOOKING_URL: process.env.NEXT_PUBLIC_CAL_BOOKING_URL || "",
  featureFlags: {
    dealerChannel: process.env.NEXT_PUBLIC_ENABLE_DEALER_CHANNEL === "true",
    sound: true,
    // Off until real, permissioned quotes exist (see CONTENT-NEEDED.md). Set NEXT_PUBLIC_SHOW_TESTIMONIALS=true to preview the slot.
    testimonials: process.env.NEXT_PUBLIC_SHOW_TESTIMONIALS === "true",
  },
  PLACEHOLDER_DIMS: {
    isPlaceholder: true,
    confirmedRevealMm: 2.0,
    confirmedMoldingInches: 3.0,
    carcassThicknessMm: 19,
    backPanelThicknessMm: 6,
    baseHeightIn: 34.5,
    baseDepthIn: 24,
    toeKickHeightIn: 4.5,
    toeKickRecessIn: 3.25,
    wallDepthIn: 12,
    tallDepthIn: 24,
    vanityHeightIn: 34.5,
    vanityDepthIn: 21,
    countertopThicknessIn: 1.5,
    countertopOverhangIn: 1.0,
    backsplashHeightIn: 18,
    ceilingHeightsIn: { 8: 96, 9: 108, 10: 120 },
    wallHeightsByCeilingIn: {
      8: { mainWallIn: 39, stackedUpperIn: 0, moldingIn: 3 },
      9: { mainWallIn: 36, stackedUpperIn: 15, moldingIn: 3 },
      10: { mainWallIn: 42, stackedUpperIn: 21, moldingIn: 3 },
    },
  },
};

export function isPlaceholderValue(value: string | null | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  return trimmed.length === 0 || (trimmed.startsWith("{{") && trimmed.endsWith("}}"));
}

export function isShowroomOpen(): boolean {
  return (
    !isPlaceholderValue(SITE_CONFIG.OPENING_DATE) &&
    !isPlaceholderValue(SITE_CONFIG.SHOWROOM_ADDRESS)
  );
}

export function getDisplayAddress(): string {
  return isPlaceholderValue(SITE_CONFIG.SHOWROOM_ADDRESS)
    ? "DFW showroom — opening soon"
    : SITE_CONFIG.SHOWROOM_ADDRESS;
}

export const FINISHES: Record<FinishSlug, FinishSpec> = {
  "premium-oak": {
    slug: "premium-oak",
    name: "Premium Oak",
    shortNote: "Warm European oak grain under a satin finish.",
    swatchHex: "#b79165",
    swatchImage: "/textures/swatches/premium-oak.webp",
    edgeHex: "#9e7a51",
    isDark: false,
    clearcoat: 0.2,
    clearcoatRoughness: 0.42,
    roughnessScale: 0.92,
    normalScale: 0.85,
  },
  "ivory-oak": {
    slug: "ivory-oak",
    name: "Ivory Oak",
    shortNote: "Pale architectural oak for bright, restrained rooms.",
    swatchHex: "#ddcfb9",
    swatchImage: "/textures/swatches/ivory-oak.webp",
    edgeHex: "#c9baa3",
    isDark: false,
    clearcoat: 0.16,
    clearcoatRoughness: 0.48,
    roughnessScale: 0.96,
    normalScale: 0.72,
  },
  "classic-walnut": {
    slug: "classic-walnut",
    name: "Classic Walnut",
    shortNote: "Deep chocolate walnut with quiet vertical movement.",
    swatchHex: "#674833",
    swatchImage: "/textures/swatches/classic-walnut.webp",
    edgeHex: "#513726",
    isDark: true,
    clearcoat: 0.26,
    clearcoatRoughness: 0.38,
    roughnessScale: 0.88,
    normalScale: 0.9,
  },
  "iron-black": {
    slug: "iron-black",
    name: "Iron Black",
    shortNote: "Dark charcoal tone where subtle grain meets raking light.",
    swatchHex: "#23201d",
    swatchImage: "/textures/swatches/iron-black.webp",
    edgeHex: "#191715",
    isDark: true,
    clearcoat: 0.18,
    clearcoatRoughness: 0.46,
    roughnessScale: 0.9,
    normalScale: 0.8,
  },
  "frosty-white": {
    slug: "frosty-white",
    name: "Frosty White",
    shortNote: "Clean warm-white architectural satin.",
    swatchHex: "#f1eee7",
    swatchImage: "/textures/swatches/frosty-white.webp",
    edgeHex: "#dfd9ce",
    isDark: false,
    clearcoat: 0.22,
    clearcoatRoughness: 0.4,
    roughnessScale: 0.85,
    normalScale: 0.25,
  },
};

export const FINISH_ORDER: FinishSlug[] = [
  "premium-oak",
  "ivory-oak",
  "classic-walnut",
  "iron-black",
  "frosty-white",
];

/**
 * Exact collections & valid finish pairings from business-facts-summary.md (Section 1).
 */
export const COLLECTIONS: Record<CollectionSlug, CollectionSpec> = {
  "traditional-shaker": {
    slug: "traditional-shaker",
    name: "Traditional Shaker",
    styleTag: "Classic",
    summary:
      "Balanced five-piece proportions on a frameless full-overlay box. Familiar lines, exact 2 mm gaps.",
    profileNote:
      "Sturdy stiles and rails framing a recessed center panel, paired with factory-finished sides and no face frame.",
    finishes: ["premium-oak", "classic-walnut", "iron-black", "frosty-white"],
    defaultFinish: "premium-oak",
    profileDimsMm: {
      stileWidth: 57,
      railWidth: 57,
      recessDepth: 7,
      doorThickness: 19,
      bevelMm: 1.5,
    },
  },
  "slim-shaker": {
    slug: "slim-shaker",
    name: "Slim Shaker",
    styleTag: "Modern",
    summary:
      "A narrower border around the recessed panel. Quiet shadow geometry built for contemporary North Texas homes.",
    profileNote:
      "Refined narrow perimeter frame that keeps architectural shadow depth while lightening the front elevation.",
    finishes: ["premium-oak", "iron-black", "frosty-white"],
    defaultFinish: "iron-black",
    profileDimsMm: {
      stileWidth: 22,
      railWidth: 22,
      recessDepth: 6,
      doorThickness: 19,
      bevelMm: 1.0,
    },
  },
  flat: {
    slug: "flat",
    name: "Flat",
    styleTag: "Minimalist",
    summary:
      "Unbroken slab planes where wood grain and the 2 mm reveal carry the whole elevation.",
    profileNote:
      "Clean full-overlay slab front with minimal reveals across stacked 8, 9, and 10 ft wall systems.",
    finishes: ["ivory-oak", "classic-walnut", "frosty-white"],
    defaultFinish: "classic-walnut",
    profileDimsMm: {
      stileWidth: 0,
      railWidth: 0,
      recessDepth: 0,
      doorThickness: 19,
      bevelMm: 1.2,
    },
  },
};

export const COLLECTION_LIST: CollectionSpec[] = [
  COLLECTIONS["traditional-shaker"],
  COLLECTIONS["slim-shaker"],
  COLLECTIONS.flat,
];

export function isValidFinishForCollection(
  collection: CollectionSlug,
  finish: FinishSlug
): boolean {
  return COLLECTIONS[collection].finishes.includes(finish);
}

export function resolveFinishForCollection(
  collection: CollectionSlug,
  preferred: FinishSlug
): FinishSlug {
  if (isValidFinishForCollection(collection, preferred)) {
    return preferred;
  }
  return COLLECTIONS[collection].defaultFinish;
}

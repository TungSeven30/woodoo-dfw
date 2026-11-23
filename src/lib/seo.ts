import {
  COLLECTIONS,
  CollectionSlug,
  FINISHES,
  SITE_CONFIG,
  isPlaceholderValue,
} from "@/config/site";
import { FAQ_ITEMS, LOCAL_DFW_COMMUNITIES } from "@/config/content";

export function buildOrganizationJsonLd() {
  const hasAddress = !isPlaceholderValue(SITE_CONFIG.SHOWROOM_ADDRESS);
  const hasPhone = !isPlaceholderValue(SITE_CONFIG.PHONE);
  const hasEmail = !isPlaceholderValue(SITE_CONFIG.EMAIL);

  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": hasAddress ? ["Organization", "HomeGoodsStore"] : "Organization",
    name: SITE_CONFIG.BRAND_NAME,
    url: SITE_CONFIG.SITE_URL,
    description:
      "European-style frameless ready-to-assemble kitchen and bath cabinets for Dallas–Fort Worth builders, remodelers, designers, and homeowners.",
    areaServed: LOCAL_DFW_COMMUNITIES.map((city) => ({
      "@type": "City",
      name: `${city}, TX`,
    })),
  };

  if (hasAddress) {
    base.address = {
      "@type": "PostalAddress",
      streetAddress: SITE_CONFIG.SHOWROOM_ADDRESS,
      addressLocality: "Dallas–Fort Worth",
      addressRegion: "TX",
      addressCountry: "US",
    };
  }
  if (hasPhone) base.telephone = SITE_CONFIG.PHONE;
  if (hasEmail) base.email = SITE_CONFIG.EMAIL;

  return base;
}

export function buildProductJsonLd(slug: CollectionSlug) {
  const col = COLLECTIONS[slug];
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${col.name} Frameless Cabinetry — ${SITE_CONFIG.BRAND_NAME}`,
    category: "Kitchen & Bath Cabinetry",
    description: `${col.summary} Available in ${col.finishes.map((f) => FINISHES[f].name).join(", ")}. Full-overlay European-style frameless construction with a 2 mm reveal, manufactured in Malaysia.`,
    brand: {
      "@type": "Brand",
      name: SITE_CONFIG.BRAND_NAME,
    },
    image: `${SITE_CONFIG.SITE_URL}/og/${slug}.png`,
    material: col.finishes.map((f) => FINISHES[f].name),
    countryOfOrigin: {
      "@type": "Country",
      name: "Malaysia",
    },
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "Construction",
        value: "Frameless full overlay, no face frame or centre stile",
      },
      {
        "@type": "PropertyValue",
        name: "Reveal",
        value: "2 mm",
      },
      {
        "@type": "PropertyValue",
        name: "Ceiling system",
        value: "8, 9, and 10 ft stacked configurations with 3-inch molding",
      },
    ],
  };
}

export function buildFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

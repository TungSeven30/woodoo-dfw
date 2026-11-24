/**
 * Product imagery used across content pages.
 * Every kitchen and bath image is a concept render (no DFW photography exists yet),
 * so `concept: true` puts a visible "Concept render" tag on it. Swap a file in
 * public/images/ for real photography and set `concept: false`.
 */
export const IMAGES = {
  "kitchen-oak-shaker": {
    src: "/images/kitchen-oak-shaker.jpg",
    alt: "Kitchen with Traditional Shaker doors in Premium Oak, a long island and a white stone top",
    concept: true,
  },
  "kitchen-black-slim": {
    src: "/images/kitchen-black-slim.jpg",
    alt: "Kitchen with Slim Shaker doors in Iron Black and a white marble counter",
    concept: true,
  },
  "kitchen-ivory-flat": {
    src: "/images/kitchen-ivory-flat.jpg",
    alt: "Kitchen with Flat doors in Ivory Oak and stacked uppers to the ceiling",
    concept: true,
  },
  "kitchen-walnut-flat": {
    src: "/images/kitchen-walnut-flat.jpg",
    alt: "Galley kitchen with Flat doors in Classic Walnut",
    concept: true,
  },
  "kitchen-white-shaker": {
    src: "/images/kitchen-white-shaker.jpg",
    alt: "Family kitchen with Traditional Shaker doors in Frosty White and an island",
    concept: true,
  },
  "bath-walnut": {
    src: "/images/bath-walnut.jpg",
    alt: "Bathroom with a wall-hung Classic Walnut vanity and matching linen tower",
    concept: true,
  },
  "detail-reveal": {
    src: "/images/detail-reveal.jpg",
    alt: "Close-up of the even 2 mm gap between two oak cabinet doors",
    concept: true,
  },
  "detail-interior": {
    src: "/images/detail-interior.jpg",
    alt: "Open frameless cabinet with no center stile and a fully open interior",
    concept: true,
  },
  flatpack: {
    src: "/images/flatpack.jpg",
    alt: "Flat-packed oak cabinet panels stacked next to shipping cartons",
    concept: true,
  },
  showroom: {
    src: "/images/showroom.jpg",
    alt: "Showroom with three kitchen displays and a table of door samples",
    concept: true,
  },
} as const;

export type ImageKey = keyof typeof IMAGES;

export const COLLECTION_IMAGE: Record<"traditional-shaker" | "slim-shaker" | "flat", ImageKey> = {
  "traditional-shaker": "kitchen-oak-shaker",
  "slim-shaker": "kitchen-black-slim",
  flat: "kitchen-ivory-flat",
};

/**
 * Real Woodoo project photos used on the home page.
 *
 * Cleared for use by Woodoo on 2026-11-25, including edits. Every photo carries the same grade
 * (one white point, matched exposure, a soft highlight shoulder and calmer warm tones) so the set
 * reads as one shoot. The cabinetry itself is not retouched.
 * Originals and sources: /mnt/project-files/woodoo-dfw-real-photos/MANIFEST.md
 */
export const PHOTOS = {
  heroKitchen: {
    src: "/photos/hero-kitchen.jpg",
    width: 3600,
    height: 2395,
    alt: "Oak and white kitchen with a black-framed window, wall ovens and a marble counter in afternoon light",
  },
  heroKitchenTall: {
    src: "/photos/hero-kitchen-tall.jpg",
    width: 2699,
    height: 3600,
    alt: "Oak shaker kitchen with a white waterfall island, white stools and a brass pendant under a skylight",
  },
  islandOpenPlan: {
    src: "/photos/island-open-plan.jpg",
    width: 3600,
    height: 2395,
    alt: "Ivory Oak island with a marble waterfall top in an open kitchen under skylights",
  },
  islandOpenPlanTall: {
    src: "/photos/island-open-plan-tall.jpg",
    width: 2705,
    height: 3600,
    alt: "Ivory Oak island with a marble waterfall top in an open kitchen under skylights",
  },
  drawersGap: {
    src: "/photos/drawers-gap.jpg",
    width: 2700,
    height: 3600,
    alt: "Low view along a run of oak drawers, with the same thin, even gap between every front",
  },
  bath: {
    src: "/photos/bath.jpg",
    width: 3600,
    height: 2395,
    alt: "Bathroom with a floating oak vanity, a freestanding tub and a tall window",
  },
  trade: {
    src: "/photos/trade.jpg",
    width: 3600,
    height: 2400,
    alt: "Iron Black shaker base cabinets under oak uppers, with a brass faucet",
  },
  home: {
    src: "/photos/home.jpg",
    width: 3600,
    height: 2400,
    alt: "U-shaped kitchen with Frosty White shaker cabinets, oak drawers and a pro range",
  },
} as const;

/** One real kitchen per finish, in the order the finishes are listed on the site. */
export const FINISH_PHOTOS = [
  {
    finish: "ivory-oak",
    door: "Flat",
    src: "/photos/finish-ivory-oak.jpg",
    width: 3600,
    height: 2395,
    alt: "Ivory Oak flat-door island with marble top under skylights",
  },
  {
    finish: "premium-oak",
    door: "Slim Shaker",
    src: "/photos/finish-premium-oak.jpg",
    width: 2699,
    height: 3600,
    alt: "Premium Oak shaker island with a wine fridge",
  },
  {
    finish: "frosty-white",
    door: "Flat",
    src: "/photos/finish-frosty-white.jpg",
    width: 3600,
    height: 2415,
    alt: "Frosty White flat kitchen with a long waterfall island and an oak tall wall",
  },
  {
    finish: "iron-black",
    door: "Shaker",
    src: "/photos/finish-iron-black.jpg",
    width: 2700,
    height: 3600,
    alt: "Iron Black shaker island with stools and a white waterfall top",
  },
  {
    finish: "classic-walnut",
    door: "Traditional Shaker",
    src: "/photos/finish-classic-walnut.jpg",
    width: 3600,
    height: 2400,
    alt: "Classic Walnut shaker island with a stone waterfall, beside steel appliances",
  },
] as const;

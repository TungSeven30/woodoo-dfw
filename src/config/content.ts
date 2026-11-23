import { SITE_CONFIG } from "./site";

/**
 * Editable copy repository for the entire DFW site.
 * Grounded strictly in business-facts-summary.md (Section 1, Section 8, Nov 2026 column of Section 4).
 * Voice: short sentences, concrete nouns, zero exclamation marks, zero showroom filler, zero invented stats.
 */

export interface FilmSceneCopy {
  id: string;
  index: number;
  label: string;
  start: number;
  end: number;
  anchor: number;
  headline: string;
  subline: string;
  srDescription: string;
  isConceptRender?: boolean;
}

export const FILM_SCENES: FilmSceneCopy[] = [
  {
    id: "panel",
    index: 0,
    label: "00 · Panel",
    start: 0.0,
    end: 0.05,
    anchor: 0.02,
    headline: "It arrives flat.",
    subline: "European frameless cabinetry for Dallas–Fort Worth.",
    srDescription:
      "A single Premium Oak panel rests in dark space under warm raking light, showing continuous vertical wood grain.",
  },
  {
    id: "flat-pack",
    index: 1,
    label: "01 · Flat pack",
    start: 0.05,
    end: 0.15,
    anchor: 0.1,
    headline: "Every piece of a kitchen. Already here.",
    subline:
      "Sides, backs, shelves, doors, drawer fronts, toe kicks, and fillers — packed flat and cut to fit.",
    srDescription:
      "The camera pulls back to show dozens of cabinet components aligned in a compact flat-pack stack, each marked with an engraved part code.",
  },
  {
    id: "flight",
    index: 2,
    label: "02 · Assembly",
    start: 0.15,
    end: 0.3,
    anchor: 0.26,
    headline: "It leaves whole.",
    subline:
      "Ready-to-assemble flat-pack or assembled orders. Built in Malaysia. Supplied for Texas.",
    srDescription:
      "Flat-pack panels lift into space along coordinated paths and lock together sequentially into a complete frameless base cabinet.",
  },
  {
    id: "reveal",
    index: 3,
    label: "03 · 2 mm reveal",
    start: 0.3,
    end: 0.4,
    anchor: 0.35,
    headline: "Two millimetres. That's the whole gap.",
    subline:
      "Full-overlay doors align edge to edge with a uniform 2 mm reveal across every run.",
    srDescription:
      "Macro view between two adjacent doors showing the exact 2 mm reveal separating full-overlay panels.",
  },
  {
    id: "frameless",
    index: 4,
    label: "04 · Frameless",
    start: 0.4,
    end: 0.48,
    anchor: 0.44,
    headline: "No frame. Nothing between you and your shelf.",
    subline:
      "No face frame. No centre stile. Full-access interiors and factory-finished sides.",
    srDescription:
      "The cabinet doors open to reveal a completely unobstructed frameless interior, contrasted with a translucent wireframe of a traditional face-frame centre stile.",
  },
  {
    id: "kitchen",
    index: 5,
    label: "05 · Kitchen",
    start: 0.48,
    end: 0.65,
    anchor: 0.61,
    headline: "Then it becomes a kitchen.",
    subline:
      "Base cabinets, tall pantry, wall runs, and stacked uppers built for 8, 9, and 10 ft ceilings with 3-inch molding.",
    srDescription:
      "Multiple flat-packs assemble across the floor plan into a complete L-shaped kitchen in Premium Oak with stacked uppers and 3-inch molding. Concept render.",
    isConceptRender: true,
  },
  {
    id: "reconfigure",
    index: 6,
    label: "06 · Four rooms",
    start: 0.65,
    end: 0.82,
    anchor: 0.74,
    headline: "One system. Every room.",
    subline:
      "Kitchens, islands, and bath vanities — reconfigured across three door styles and five finishes.",
    srDescription:
      "Without cutting, the kitchen reconfigures from L-Shape in Premium Oak Traditional Shaker, to Galley in Iron Black Slim Shaker, to a 10-foot Island Kitchen in Classic Walnut Flat, and finally to a Bath Vanity and Linen Tower in Frosty White Flat. Concept render.",
    isConceptRender: true,
  },
  {
    id: "compose-inline",
    index: 7,
    label: "07 · Your turn",
    start: 0.82,
    end: 0.92,
    anchor: 0.88,
    headline: "Five finishes. Three door styles. Fewer than you expected, on purpose.",
    subline:
      "Choose a room, door profile, finish, and ceiling height right here. Open the studio for full control.",
    srDescription:
      "Overhead architectural plan view of the 3D room with live controls to test layout, collection, finish, and 8, 9, or 10 foot ceiling heights. Concept render.",
    isConceptRender: true,
  },
  {
    id: "split",
    index: 8,
    label: "08 · Next step",
    start: 0.92,
    end: 1.0,
    anchor: 0.98,
    headline: "Open the door that fits your project.",
    subline: "Direct paths for DFW trade partners and homeowners.",
    srDescription:
      "Two large 3D cabinet doors stand side by side: For the trade, leading to Send a plan and Trade accounts; and For my home, leading to Book a visit, the preview list, and kitchen composition.",
  },
];

export const RECONFIGURE_BEATS = [
  {
    tStart: 0.65,
    tEnd: 0.692,
    layout: "l-shape" as const,
    collection: "traditional-shaker" as const,
    finish: "premium-oak" as const,
    ceiling: 9 as const,
    line: "L-shape. Traditional Shaker in Premium Oak.",
  },
  {
    tStart: 0.692,
    tEnd: 0.735,
    layout: "galley" as const,
    collection: "slim-shaker" as const,
    finish: "iron-black" as const,
    ceiling: 9 as const,
    line: "Galley. Slim Shaker in Iron Black.",
  },
  {
    tStart: 0.735,
    tEnd: 0.778,
    layout: "island" as const,
    collection: "flat" as const,
    finish: "classic-walnut" as const,
    ceiling: 10 as const,
    line: "Island kitchen. Flat Classic Walnut stacked to ten feet.",
  },
  {
    tStart: 0.778,
    tEnd: 0.82,
    layout: "vanity" as const,
    collection: "flat" as const,
    finish: "frosty-white" as const,
    ceiling: 8 as const,
    line: "Bath vanity and linen tower. Flat Frosty White.",
  },
];

export const PROCESS_STEPS = [
  {
    number: "01",
    title: "Product inspiration",
    body: "Explore three door styles and five finishes online or in person. Fewer options make decisions clear.",
  },
  {
    number: "02",
    title: "Open account",
    body: "Builders, remodelers, and designers open a trade account. Homeowners book a consultation or join the preview list.",
  },
  {
    number: "03",
    title: "Design consultation",
    body: "Share room dimensions or architectural plans. A real person maps every cabinet box, filler, panel, and stacked upper to your ceiling height.",
  },
  {
    number: "04",
    title: "Quote and estimate",
    body: "Receive a clear, itemized cabinet list and transparent quote checked by our DFW team before you commit.",
  },
  {
    number: "05",
    title: "Place order",
    body: "Confirm your layout, finish, and delivery format — ready-to-assemble flat-pack or assembled.",
  },
  {
    number: "06",
    title: "Production and staging",
    body: "Components are pulled, inspected, and staged cleanly so your order ships complete.",
  },
  {
    number: "07",
    title: "Delivery, pickup and post-installation support",
    body: "Choose warehouse pickup, LTL freight, or white-glove delivery. Customers arrange their own installation. Your installer, your schedule. We stay with you after delivery for adjustments and warranty questions.",
  },
];

export const TRADE_BENEFITS = [
  {
    title: "Preferred trade pricing",
    body: "Structured pricing for independent DFW builders, remodelers, architects, and interior designers.",
  },
  {
    title: "Dedicated design consultant",
    body: "One person reviews your plans, checks fillers and clearances, and provides priority quoting.",
  },
  {
    title: "Complete kitchen supply",
    body: "Cabinet boxes, panels, toe kicks, trim, and 3-inch molding planned together so a missing filler does not hold up an installer.",
  },
  {
    title: "Flat-pack or assembled",
    body: "Order compact RTA flat-packs for job-site efficiency or fully assembled boxes ready for your crew.",
  },
  {
    title: "Planning resources & appliance coordination",
    body: "Clearances coordinated alongside partner appliance specifications and finish samples for client presentations.",
  },
  {
    title: "Early collection access",
    body: "Preview upcoming releases and feature completed projects on brand channels with client permission.",
  },
];

export const PRECISION_PILLARS = [
  {
    code: "SPEC 01 · FULL OVERLAY",
    title: "Two millimetres. That's the whole gap.",
    body: "Traditional framed cabinets leave wide strips of face frame exposed between doors. Frameless construction mounts full-overlay doors directly across the box, leaving a uniform 2 mm shadow reveal.",
  },
  {
    code: "SPEC 02 · FULL ACCESS",
    title: "No face frame. No centre stile.",
    body: "Without an inner lip or vertical centre divider blocking wide base cabinets, the entire opening is usable from wall to wall. Factory-finished exterior sides keep exposed ends clean.",
  },
  {
    code: "SPEC 03 · VERTICAL SYSTEM",
    title: "Built for 8, 9, and 10 ft ceilings.",
    body: "North Texas homes rarely stop at an eight-foot soffit. Modular wall cabinets pair with stacked upper boxes and 3-inch molding to meet 8, 9, and 10 ft ceilings cleanly.",
  },
  {
    code: "SPEC 04 · MANUFACTURED IN MALAYSIA",
    title: "Standardized factory precision, flat-packed for transit.",
    body: "Manufactured in Malaysia with specialist woodworking partners. Flat-pack geometry protects finished surfaces during freight and makes job-site staging straightforward.",
  },
];

export const FAQ_ITEMS = [
  {
    q: "What is the difference between frameless and framed cabinets?",
    a: "Framed cabinets attach a wooden face frame and often a vertical centre stile to the front of the box, narrowing the opening. Frameless European-style cabinets eliminate the face frame completely. Full-overlay doors cover the box with a 2 mm reveal, leaving a fully open interior and factory-finished sides.",
  },
  {
    q: "Which door styles and finishes are available?",
    a: "Three door styles across five finishes. Traditional Shaker comes in Premium Oak, Classic Walnut, Iron Black, and Frosty White. Slim Shaker comes in Premium Oak, Iron Black, and Frosty White. Flat comes in Ivory Oak, Classic Walnut, and Frosty White.",
  },
  {
    q: "How do sizes work for 8, 9, and 10-foot Texas ceilings?",
    a: "Proportions are engineered specifically for 8, 9, and 10 ft ceilings using stacked upper cabinet configurations finished with 3-inch molding. Share your wall measurements and we map the exact cabinet list for your ceiling height.",
  },
  {
    q: "Where are the cabinets manufactured?",
    a: "Cabinets are manufactured in Malaysia in partnership with specialist woodworking facilities, with headquarters and main inventory operations in Elk Grove Village, Illinois, supporting the upcoming Dallas–Fort Worth showroom and local warehouse.",
  },
  {
    q: "Do you supply cabinets ready-to-assemble or already assembled?",
    a: "Both options are available. You can order compact flat-pack RTA components for easier job-site transport, or fully assembled cabinets ready for your installer.",
  },
  {
    q: "Do you install cabinets?",
    a: "No. Customers arrange their own installation. Your installer, your schedule. We supply the design layout, cabinet package, delivery or pickup coordination, and post-installation support.",
  },
  {
    q: "How does delivery work in Dallas–Fort Worth?",
    a: "Orders support pickup once the DFW warehouse opens, LTL freight across the contiguous US, and white-glove delivery options. Specific DFW availability and scheduling are confirmed on every individual quote.",
  },
  {
    q: "Can builders and remodelers send architectural plans for a quote?",
    a: "Yes. Use Send a plan to upload PDF, DWG, DXF, or sketch photos. A person on our team reviews the drawings, prepares an itemized cabinet list, and follows up directly.",
  },
];

export const PLACEHOLDER_TESTIMONIALS = [
  {
    id: "placeholder-trade-1",
    role: "Trade Design Partner — Placeholder",
    author: "{{TESTIMONIAL_1_AUTHOR}}",
    quote:
      "{{TESTIMONIAL_1_QUOTE — Placeholder slot awaiting written permission from Chicago showroom partners or first completed DFW project release.}}",
  },
  {
    id: "placeholder-builder-2",
    role: "DFW Independent Builder — Placeholder",
    author: "{{TESTIMONIAL_2_AUTHOR}}",
    quote:
      "{{TESTIMONIAL_2_QUOTE — Placeholder slot reserved for verified DFW builder feedback following initial project deliveries.}}",
  },
  {
    id: "placeholder-homeowner-3",
    role: "DFW Homeowner — Placeholder",
    author: "{{TESTIMONIAL_3_AUTHOR}}",
    quote:
      "{{TESTIMONIAL_3_QUOTE — Placeholder slot reserved for verified DFW homeowner case study with signed photo release.}}",
  },
];

export const ABOUT_COPY = {
  eyebrow: "Chicago roots · Dallas–Fort Worth chapter",
  headline: "Built in Malaysia. Proven in Chicago. Opening in North Texas.",
  lead: `Kitchen buyers in Dallas–Fort Worth face two tired options: low-grade boxes that show their shortcuts on day one, or luxury European design studios priced far outside most budgets. ${SITE_CONFIG.BRAND_NAME} exists in the clear middle ground.`,
  sections: [
    {
      title: "Fewer finishes, deeper discipline",
      body: "Instead of hundreds of made-to-order door colours that slow down every remodel, the catalog holds tight to three door profiles and five finishes. Fewer decisions let you focus on layout, proportion, and natural light — and let our team give plain answers on availability.",
    },
    {
      title: "An Apple experience from start to finish",
      body: "Every homeowner and independent builder deserves straightforward pricing, verified part lists with nothing missing, and a single person who stays accountable from the first drawing through delivery and warranty follow-up.",
    },
    {
      title: "Showroom plus local warehouse",
      body: "Backed by the operating playbook and distribution network established in Elk Grove Village, Illinois, the Dallas–Fort Worth branch pairs a tactile showroom with local warehouse support for Richardson, Plano, Frisco, McKinney, Allen, Dallas, and Fort Worth.",
    },
    {
      title: "Your installer, your schedule",
      body: "We focus strictly on cabinetry precision, design support, and complete order fulfillment. Builders use their own crews and homeowners hire the installer they trust.",
    },
  ],
};

export const LOCAL_DFW_COMMUNITIES = [
  "Dallas",
  "Fort Worth",
  "Richardson",
  "Plano",
  "Frisco",
  "McKinney",
  "Allen",
  "Carrollton",
  "Addison",
  "Irving",
];

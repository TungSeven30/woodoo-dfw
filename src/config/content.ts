import { SITE_CONFIG } from "./site";

/**
 * Editable copy repository for the entire DFW site.
 * Grounded strictly in business-facts-summary.md (Section 1, Section 8, Nov 2026 column of Section 4).
 * Voice: architectural clarity, concrete physical nouns, zero exclamation marks, zero showroom filler, zero invented stats.
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
    subline: "European frameless cabinets, packed flat to the millimeter and supplied across Dallas–Fort Worth.",
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
      "Sides, backs, shelves, doors, drawer fronts, toe kicks, and fillers. Milled, labeled, and stacked flat before a single box goes up.",
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
      "Order flat-packed for tight job sites or assembled for faster hangs. Manufactured in Malaysia. Supplied for North Texas.",
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
    headline: "Two millimeters. That's the whole gap.",
    subline:
      "Framed cabinets leave a strip of wood between every pair of doors. Full-overlay doors close it to one even 2 mm line.",
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
    headline: "No frame. Nothing between you and the shelf.",
    subline:
      "No face frame and no center stile to split a wide platter. Finished sides outside, the full shelf width inside.",
    srDescription:
      "The cabinet doors open to reveal a completely unobstructed frameless interior, contrasted with a translucent wireframe of a traditional face-frame center stile.",
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
      "Base runs, a tall pantry, stacked uppers, and 3-inch molding, sized for 8, 9, and 10 ft ceilings.",
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
      "L-shape, galley, island, bath vanity. The same kit of parts, three door styles, five finishes.",
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
    headline: "Five finishes. Three doors. Try yours.",
    subline:
      "Change the layout, door, finish, and ceiling height right here, or open the full studio.",
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
    subline: "One door for the trade. One for homeowners.",
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
    body: "Study three door profiles and five finishes online or in person. A tight catalog lets you decide on proportion and light instead of drowning in hundreds of near-identical swatches.",
  },
  {
    number: "02",
    title: "Open account",
    body: "Builders, remodelers, architects, and designers open a trade account. Homeowners book a consultation or join the Dallas–Fort Worth showroom preview list.",
  },
  {
    number: "03",
    title: "Design consultation",
    body: "Share rough room dimensions or full architectural drawings. One person maps every cabinet box, filler strip, finished end panel, appliance clearance, and stacked upper to your ceiling height.",
  },
  {
    number: "04",
    title: "Quote and estimate",
    body: "Review a line-by-line cabinet schedule and plain-English quote verified by our DFW team before a single dollar moves.",
  },
  {
    number: "05",
    title: "Place order",
    body: "Lock your layout, finish, and delivery format — compact ready-to-assemble flat-packs or fully assembled boxes.",
  },
  {
    number: "06",
    title: "Production and staging",
    body: "Every box, door, toe kick, filler, and 3-inch molding length is pulled, checked against your schedule, and staged complete.",
  },
  {
    number: "07",
    title: "Delivery, pickup and post-installation support",
    body: "Take local warehouse pickup, LTL freight, or white-glove delivery. Customers arrange their own installation. Your installer, your schedule. We stay reachable after the last screw is driven for adjustments and warranty support.",
  },
];

export const TRADE_BENEFITS = [
  {
    title: "Preferred trade pricing",
    body: "Structured trade pricing built for independent DFW builders, custom remodelers, architects, and interior designers.",
  },
  {
    title: "One human estimator on every plan",
    body: "No automated black-box quote tools. A dedicated consultant checks wall clearances, filler strips, corner returns, and stacked upper heights by hand.",
  },
  {
    title: "Nothing missing on install morning",
    body: "Boxes, finished end panels, toe kicks, fillers, and 3-inch molding are audited together on one manifest so a missing trim piece never stalls a crew.",
  },
  {
    title: "Flat-pack or assembled by job site",
    body: "Pull compact flat-packs up tight stairs and narrow corridors, or order pre-assembled boxes when crew hours matter more than staging space.",
  },
  {
    title: "Appliance & sample coordination",
    body: "We check cutouts alongside partner appliance specifications and provide physical finish boards for client sign-off.",
  },
  {
    title: "Early collection access",
    body: "Preview upcoming releases ahead of public rollout and showcase finished builds on our channels with your client's approval.",
  },
];

export const PRECISION_PILLARS = [
  {
    code: "SPEC 01 · FULL OVERLAY",
    title: "Two millimeters. That's the whole gap.",
    body: "Traditional framed cabinets leave broad bands of face frame visible around every door. Frameless European geometry mounts full-overlay doors straight across the carcass, tightening the visual seam to an even 2 mm shadow line.",
  },
  {
    code: "SPEC 02 · FULL ACCESS",
    title: "No face frame. No center stile.",
    body: "Remove the inner frame lip and vertical center divider and a 36-inch cabinet finally behaves like 36 inches of storage. Wide trays slide straight in, and factory-finished exterior sides keep exposed ends crisp without extra skin panels.",
  },
  {
    code: "SPEC 03 · VERTICAL SYSTEM",
    title: "Built for 8, 9, and 10 ft ceilings.",
    body: "North Texas architecture rarely ends at an eight-foot drywall bulkhead. Modular wall cabinets pair with stacked upper boxes and 3-inch molding so cabinet runs meet 8, 9, and 10 ft ceilings cleanly.",
  },
  {
    code: "SPEC 04 · MANUFACTURED IN MALAYSIA",
    title: "Factory repeatability, packed flat for the road.",
    body: "Manufactured in Malaysia with specialist woodworking partners. Flat-pack geometry shields finished surfaces through freight and lets crews stage an entire kitchen in the footprint of a hallway.",
  },
];

export const FAQ_ITEMS = [
  {
    q: "What is the practical difference between frameless and framed cabinets?",
    a: "Framed cabinets nail a wooden border — and often a vertical center stile — across the front of the box, narrowing what fits through the opening. Frameless European-style cabinets drop the face frame altogether. Full-overlay doors cover the box edge to edge with a uniform 2 mm reveal, giving you unobstructed interior access and factory-finished exterior sides.",
  },
  {
    q: "Which door styles and finishes are available?",
    a: "Three door profiles across five finishes, chosen intentionally. Traditional Shaker is available in Premium Oak, Classic Walnut, Iron Black, and Frosty White. Slim Shaker is available in Premium Oak, Iron Black, and Frosty White. Flat is available in Ivory Oak, Classic Walnut, and Frosty White.",
  },
  {
    q: "How do proportions work for 8, 9, and 10-foot Texas ceilings?",
    a: "Wall runs are modular by design: standard heights for 8 ft rooms, plus stacked upper boxes crowned by confirmed 3-inch molding for 9 ft and 10 ft ceilings. Send us your ceiling elevation and wall lengths and our team maps the exact cabinet stack.",
  },
  {
    q: "Where are the cabinets manufactured and stocked?",
    a: "Cabinets are manufactured in Malaysia in partnership with specialist woodworking facilities, backed by headquarters and main inventory operations in Elk Grove Village, Illinois, supporting the upcoming Dallas–Fort Worth showroom and local warehouse.",
  },
  {
    q: "Can I order ready-to-assemble flat-packs or pre-assembled cabinets?",
    a: "Both formats are supported. Choose compact flat-pack RTA components for easier transport into tight spaces, or pre-assembled boxes ready for your installer to set and level.",
  },
  {
    q: "Do you handle cabinet installation?",
    a: "No. Customers arrange their own installation. Your installer, your schedule. We stay focused on accurate design planning, complete cabinetry supply, delivery or warehouse pickup coordination, and post-installation support.",
  },
  {
    q: "How do pickup and delivery work in Dallas–Fort Worth?",
    a: "Orders support warehouse pickup once the DFW location opens, LTL freight across the contiguous US, and white-glove delivery options. Exact delivery timing and logistics are confirmed in writing on each quote.",
  },
  {
    q: "Can builders and remodelers upload architectural plans directly?",
    a: "Yes. Open Send a plan to upload PDF, DWG, DXF, or hand-sketch photos. A real person on our DFW team checks every cabinet box, filler, and trim item by hand and follows up directly.",
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
  pullQuote:
    "Good architecture rarely comes from four hundred paint chips. It comes from holding a two-millimeter shadow line straight across an entire wall.",
  lead: `Anyone renovating a kitchen in Dallas–Fort Worth meets the same dead end: bargain boxes that show their shortcuts in the first winter, or bespoke European design studios priced out of reach for real projects. ${SITE_CONFIG.BRAND_NAME} occupies the clear middle ground — disciplined European frameless construction without the gallery markup.`,
  sections: [
    {
      chapter: "01 · THE DISCIPLINE OF RESTRAINT",
      title: "Three door styles. Five finishes. On purpose.",
      body: "Most showrooms hand you a wall of four hundred door colors, then ask you to wait months while each order is pieced together. We hold tight to three architectural door profiles — Traditional Shaker, Slim Shaker, and Flat — across five finishes that live quietly alongside stone, plaster, and Texas light. Fewer variables mean sharper quality control and plain answers on stock.",
    },
    {
      chapter: "02 · CLEAR PROCESS",
      title: "An Apple experience from sketch to delivery.",
      body: "Whether you build custom homes in Frisco or remodel a mid-century ranch in Richardson, you should never have to chase three people for an honest cabinet list. One named consultant checks every box, filler strip, finished end panel, and 3-inch crown return against your actual wall dimensions — then stays with you after delivery.",
    },
    {
      chapter: "03 · OPERATING BACKBONE",
      title: "Showroom plus local warehouse.",
      body: "Backed by the operating playbook and distribution network proven in Elk Grove Village, Illinois, our Dallas–Fort Worth branch pairs a tactile design showroom with local warehouse support serving Richardson, Plano, Frisco, McKinney, Allen, Dallas, and Fort Worth.",
    },
    {
      chapter: "04 · HONEST BOUNDARIES",
      title: "Your installer, your schedule.",
      body: "We do not run installation crews or inflate cabinet pricing to cover job-site overhead. Builders stay in command of their own trades; homeowners hire the carpenter or general contractor they trust. We focus entirely on precision cabinetry, exact takeoff schedules, and complete fulfillment.",
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

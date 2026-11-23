import { CeilingHeightFt, CollectionSlug, FinishSlug, LayoutId } from "./site";

export type CabinetType =
  | "base"
  | "drawer_base"
  | "sink_base"
  | "wall"
  | "tall"
  | "vanity"
  | "linen_tower"
  | "filler"
  | "end_panel";

export interface CabinetPlacement {
  id: string;
  skuPrefix: string;
  type: CabinetType;
  widthIn: number;
  heightIn?: number; // optional override; otherwise computed from type & ceiling
  depthIn?: number; // optional override
  /** Position of cabinet bottom-center on floor plan in inches (X right, Z forward toward viewer) */
  xIn: number;
  yIn?: number; // vertical base elevation in inches (0 for base/tall, 54 for wall)
  zIn: number;
  /** Yaw rotation in degrees (0 = faces +Z, 90 = faces +X, -90 = faces -X, 180 = faces -Z) */
  rotYDeg: number;
  doors?: 1 | 2;
  drawers?: number;
  /** Whether wall cabinet gets a stacked upper on 9/10 ft ceilings */
  stackable?: boolean;
  /** Whether this cabinet gets a countertop slab segment above it */
  hasCounter?: boolean;
}

export interface RoomLayoutSpec {
  id: LayoutId;
  name: string;
  shortName: string;
  roomType: "kitchen" | "bath";
  description: string;
  defaultCollection: CollectionSlug;
  defaultFinish: FinishSlug;
  defaultCeiling: CeilingHeightFt;
  footprintLabel: string;
  pendants: Array<{ xIn: number; zIn: number }>;
  cabinets: CabinetPlacement[];
}

/**
 * Five complete, data-driven architectural room layouts (L-Shape, Galley, Island, Bath Vanity, U-Shape).
 * All coordinates in inches relative to room center (0, 0).
 * Box sizes use PLACEHOLDER_DIMS stand-in 32 mm-system proportions until Woodoo catalog PDF is confirmed.
 */
export const ROOM_LAYOUTS: Record<LayoutId, RoomLayoutSpec> = {
  "l-shape": {
    id: "l-shape",
    name: "L-Shape Kitchen",
    shortName: "L-Shape",
    roomType: "kitchen",
    description:
      "Classic North Texas perimeter run with tall pantry, wide drawer bases, and stacked wall cabinets meeting the ceiling.",
    defaultCollection: "traditional-shaker",
    defaultFinish: "premium-oak",
    defaultCeiling: 9,
    footprintLabel: "11 ft × 9 ft perimeter",
    pendants: [
      { xIn: -18, zIn: -24 },
      { xIn: 24, zIn: -24 },
    ],
    cabinets: [
      // Back wall run (facing +Z, back against z = -54)
      { id: "L-TP1", skuPrefix: "TP30", type: "tall", widthIn: 30, xIn: -57, zIn: -42, rotYDeg: 0, doors: 2 },
      { id: "L-DB1", skuPrefix: "DB30", type: "drawer_base", widthIn: 30, xIn: -27, zIn: -42, rotYDeg: 0, drawers: 3, hasCounter: true },
      { id: "L-SB1", skuPrefix: "SB36", type: "sink_base", widthIn: 36, xIn: 6, zIn: -42, rotYDeg: 0, doors: 2, hasCounter: true },
      { id: "L-B1", skuPrefix: "B30", type: "base", widthIn: 30, xIn: 39, zIn: -42, rotYDeg: 0, doors: 2, drawers: 1, hasCounter: true },
      { id: "L-F1", skuPrefix: "FL03", type: "filler", widthIn: 3, xIn: 55.5, zIn: -42, rotYDeg: 0, hasCounter: true },

      // Right return wing (facing -X, back against x = +69)
      { id: "L-B2", skuPrefix: "B24", type: "base", widthIn: 24, xIn: 57, zIn: -18, rotYDeg: -90, doors: 2, drawers: 1, hasCounter: true },
      { id: "L-DB2", skuPrefix: "DB36", type: "drawer_base", widthIn: 36, xIn: 57, zIn: 12, rotYDeg: -90, drawers: 3, hasCounter: true },
      { id: "L-B3", skuPrefix: "B24", type: "base", widthIn: 24, xIn: 57, zIn: 42, rotYDeg: -90, doors: 2, drawers: 1, hasCounter: true },

      // Wall cabinets along back run (depth 12 -> center at z = -48)
      { id: "L-W1", skuPrefix: "W30", type: "wall", widthIn: 30, xIn: -27, yIn: 54, zIn: -48, rotYDeg: 0, doors: 2, stackable: true },
      { id: "L-W2", skuPrefix: "W36", type: "wall", widthIn: 36, xIn: 6, yIn: 54, zIn: -48, rotYDeg: 0, doors: 2, stackable: true },
      { id: "L-W3", skuPrefix: "W30", type: "wall", widthIn: 30, xIn: 39, yIn: 54, zIn: -48, rotYDeg: 0, doors: 2, stackable: true },
      // Wall cabinets along right wing (depth 12 -> center at x = +63)
      { id: "L-W4", skuPrefix: "W36", type: "wall", widthIn: 36, xIn: 63, yIn: 54, zIn: 12, rotYDeg: -90, doors: 2, stackable: true },
      { id: "L-W5", skuPrefix: "W24", type: "wall", widthIn: 24, xIn: 63, yIn: 54, zIn: 42, rotYDeg: -90, doors: 2, stackable: true },
    ],
  },

  galley: {
    id: "galley",
    name: "Galley Kitchen",
    shortName: "Galley",
    roomType: "kitchen",
    description:
      "Parallel architectural runs designed for tight circulation, uninterrupted lines, and high storage density.",
    defaultCollection: "slim-shaker",
    defaultFinish: "iron-black",
    defaultCeiling: 9,
    footprintLabel: "11 ft parallel runs",
    pendants: [
      { xIn: -26, zIn: 0 },
      { xIn: 26, zIn: 0 },
    ],
    cabinets: [
      // North run (facing +Z, center z = -34)
      { id: "G-TP1", skuPrefix: "TP24", type: "tall", widthIn: 24, xIn: -54, zIn: -34, rotYDeg: 0, doors: 2 },
      { id: "G-DB1", skuPrefix: "DB36", type: "drawer_base", widthIn: 36, xIn: -24, zIn: -34, rotYDeg: 0, drawers: 3, hasCounter: true },
      { id: "G-SB1", skuPrefix: "SB36", type: "sink_base", widthIn: 36, xIn: 12, zIn: -34, rotYDeg: 0, doors: 2, hasCounter: true },
      { id: "G-B1", skuPrefix: "B30", type: "base", widthIn: 30, xIn: 45, zIn: -34, rotYDeg: 0, doors: 2, drawers: 1, hasCounter: true },

      // North wall uppers (z = -40)
      { id: "G-W1", skuPrefix: "W36", type: "wall", widthIn: 36, xIn: -24, yIn: 54, zIn: -40, rotYDeg: 0, doors: 2, stackable: true },
      { id: "G-W2", skuPrefix: "W36", type: "wall", widthIn: 36, xIn: 12, yIn: 54, zIn: -40, rotYDeg: 0, doors: 2, stackable: true },
      { id: "G-W3", skuPrefix: "W30", type: "wall", widthIn: 30, xIn: 45, yIn: 54, zIn: -40, rotYDeg: 0, doors: 2, stackable: true },

      // South parallel run (facing -Z, center z = +34)
      { id: "G-B2", skuPrefix: "B30", type: "base", widthIn: 30, xIn: -45, zIn: 34, rotYDeg: 180, doors: 2, drawers: 1, hasCounter: true },
      { id: "G-DB2", skuPrefix: "DB36", type: "drawer_base", widthIn: 36, xIn: -12, zIn: 34, rotYDeg: 180, drawers: 3, hasCounter: true },
      { id: "G-B3", skuPrefix: "B36", type: "base", widthIn: 36, xIn: 24, zIn: 34, rotYDeg: 180, doors: 2, drawers: 1, hasCounter: true },
      { id: "G-TP2", skuPrefix: "TP24", type: "tall", widthIn: 24, xIn: 54, zIn: 34, rotYDeg: 180, doors: 2 },
    ],
  },

  island: {
    id: "island",
    name: "Island Kitchen",
    shortName: "Island",
    roomType: "kitchen",
    description:
      "Full back elevation stacked to 10 ft with 3-inch molding, anchored by a monolithic centre island.",
    defaultCollection: "flat",
    defaultFinish: "classic-walnut",
    defaultCeiling: 10,
    footprintLabel: "13 ft wall + 8 ft island",
    pendants: [
      { xIn: -28, zIn: 22 },
      { xIn: 0, zIn: 22 },
      { xIn: 28, zIn: 22 },
    ],
    cabinets: [
      // Back architectural wall (z = -44)
      { id: "I-TP1", skuPrefix: "TP30", type: "tall", widthIn: 30, xIn: -66, zIn: -44, rotYDeg: 0, doors: 2 },
      { id: "I-DB1", skuPrefix: "DB36", type: "drawer_base", widthIn: 36, xIn: -33, zIn: -44, rotYDeg: 0, drawers: 3, hasCounter: true },
      { id: "I-B1", skuPrefix: "B30", type: "base", widthIn: 30, xIn: 0, zIn: -44, rotYDeg: 0, doors: 2, drawers: 1, hasCounter: true },
      { id: "I-DB2", skuPrefix: "DB36", type: "drawer_base", widthIn: 36, xIn: 33, zIn: -44, rotYDeg: 0, drawers: 3, hasCounter: true },
      { id: "I-TP2", skuPrefix: "TP30", type: "tall", widthIn: 30, xIn: 66, zIn: -44, rotYDeg: 0, doors: 2 },

      // Back wall uppers (z = -50)
      { id: "I-W1", skuPrefix: "W36", type: "wall", widthIn: 36, xIn: -33, yIn: 54, zIn: -50, rotYDeg: 0, doors: 2, stackable: true },
      { id: "I-W2", skuPrefix: "W30", type: "wall", widthIn: 30, xIn: 0, yIn: 54, zIn: -50, rotYDeg: 0, doors: 2, stackable: true },
      { id: "I-W3", skuPrefix: "W36", type: "wall", widthIn: 36, xIn: 33, yIn: 54, zIn: -50, rotYDeg: 0, doors: 2, stackable: true },

      // Monolithic center island (facing +Z toward viewer, centered at z = +22)
      { id: "I-IS1", skuPrefix: "DB30", type: "drawer_base", widthIn: 30, xIn: -33, zIn: 22, rotYDeg: 0, drawers: 3, hasCounter: true },
      { id: "I-IS2", skuPrefix: "SB36", type: "sink_base", widthIn: 36, xIn: 0, zIn: 22, rotYDeg: 0, doors: 2, hasCounter: true },
      { id: "I-IS3", skuPrefix: "DB30", type: "drawer_base", widthIn: 30, xIn: 33, zIn: 22, rotYDeg: 0, drawers: 3, hasCounter: true },
    ],
  },

  vanity: {
    id: "vanity",
    name: "Bath Vanity & Linen Tower",
    shortName: "Bath Vanity",
    roomType: "bath",
    description:
      "Double-basin bath vanity paired with a tall linen tower — the same frameless construction scaled for primary baths.",
    defaultCollection: "flat",
    defaultFinish: "frosty-white",
    defaultCeiling: 8,
    footprintLabel: "8 ft bath elevation",
    pendants: [
      { xIn: -18, zIn: -14 },
      { xIn: 18, zIn: -14 },
    ],
    cabinets: [
      { id: "V-LT1", skuPrefix: "LT24", type: "linen_tower", widthIn: 24, depthIn: 21, xIn: -42, zIn: -18, rotYDeg: 0, doors: 2 },
      { id: "V-VN1", skuPrefix: "V30", type: "vanity", widthIn: 30, depthIn: 21, xIn: -15, zIn: -18, rotYDeg: 0, doors: 2, hasCounter: true },
      { id: "V-DB1", skuPrefix: "VDB18", type: "drawer_base", widthIn: 18, depthIn: 21, xIn: 9, zIn: -18, rotYDeg: 0, drawers: 3, hasCounter: true },
      { id: "V-VN2", skuPrefix: "V30", type: "vanity", widthIn: 30, depthIn: 21, xIn: 33, zIn: -18, rotYDeg: 0, doors: 2, hasCounter: true },
    ],
  },

  "u-shape": {
    id: "u-shape",
    name: "U-Shape Chef's Kitchen",
    shortName: "U-Shape",
    roomType: "kitchen",
    description:
      "Three-wall architectural wrap built for high-capacity North Texas family kitchens and custom remodels.",
    defaultCollection: "flat",
    defaultFinish: "ivory-oak",
    defaultCeiling: 9,
    footprintLabel: "11 ft × 10 ft U-wrap",
    pendants: [
      { xIn: -20, zIn: 4 },
      { xIn: 20, zIn: 4 },
    ],
    cabinets: [
      // Back wall (z = -46)
      { id: "U-DB1", skuPrefix: "DB30", type: "drawer_base", widthIn: 30, xIn: -33, zIn: -46, rotYDeg: 0, drawers: 3, hasCounter: true },
      { id: "U-SB1", skuPrefix: "SB36", type: "sink_base", widthIn: 36, xIn: 0, zIn: -46, rotYDeg: 0, doors: 2, hasCounter: true },
      { id: "U-DB2", skuPrefix: "DB30", type: "drawer_base", widthIn: 30, xIn: 33, zIn: -46, rotYDeg: 0, drawers: 3, hasCounter: true },
      // Back wall uppers (z = -52)
      { id: "U-W1", skuPrefix: "W30", type: "wall", widthIn: 30, xIn: -33, yIn: 54, zIn: -52, rotYDeg: 0, doors: 2, stackable: true },
      { id: "U-W2", skuPrefix: "W36", type: "wall", widthIn: 36, xIn: 0, yIn: 54, zIn: -52, rotYDeg: 0, doors: 2, stackable: true },
      { id: "U-W3", skuPrefix: "W30", type: "wall", widthIn: 30, xIn: 33, yIn: 54, zIn: -52, rotYDeg: 0, doors: 2, stackable: true },

      // Left wing (facing +X, x = -60)
      { id: "U-B1", skuPrefix: "B30", type: "base", widthIn: 30, xIn: -60, zIn: -12, rotYDeg: 90, doors: 2, drawers: 1, hasCounter: true },
      { id: "U-DB3", skuPrefix: "DB30", type: "drawer_base", widthIn: 30, xIn: -60, zIn: 18, rotYDeg: 90, drawers: 3, hasCounter: true },
      { id: "U-TP1", skuPrefix: "TP24", type: "tall", widthIn: 24, xIn: -60, zIn: 45, rotYDeg: 90, doors: 2 },

      // Right wing (facing -X, x = +60)
      { id: "U-B2", skuPrefix: "B30", type: "base", widthIn: 30, xIn: 60, zIn: -12, rotYDeg: -90, doors: 2, drawers: 1, hasCounter: true },
      { id: "U-DB4", skuPrefix: "DB30", type: "drawer_base", widthIn: 30, xIn: 60, zIn: 18, rotYDeg: -90, drawers: 3, hasCounter: true },
      { id: "U-W4", skuPrefix: "W30", type: "wall", widthIn: 30, xIn: 66, yIn: 54, zIn: -12, rotYDeg: -90, doors: 2, stackable: true },
      { id: "U-W5", skuPrefix: "W30", type: "wall", widthIn: 30, xIn: 66, yIn: 54, zIn: 18, rotYDeg: -90, doors: 2, stackable: true },
    ],
  },
};

export const LAYOUT_ORDER: LayoutId[] = [
  "l-shape",
  "galley",
  "island",
  "vanity",
  "u-shape",
];

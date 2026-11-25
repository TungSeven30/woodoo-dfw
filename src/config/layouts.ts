import { CeilingHeightFt, CollectionSlug, FinishSlug, LayoutId, SITE_CONFIG } from "./site";

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

/** Appliances, fixtures and plants drawn with the cabinets so a layout reads as a real room. */
export interface FixturePlacement {
  kind: "fridge" | "range" | "hood" | "sink" | "vessel-basin" | "plant-counter" | "plant-floor" | "fruit-bowl";
  /** Footprint center in inches, same frame as cabinets (X right, Z toward viewer). */
  xIn: number;
  zIn: number;
  /** Same convention as cabinets: 0 faces +Z, 90 faces +X, -90 faces -X, 180 faces -Z. */
  rotYDeg?: number;
  widthIn?: number;
  onCounter?: boolean;
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
  fixtures?: FixturePlacement[];
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
      "Two walls. A tall pantry, wide drawers, and wall cabinets stacked to the ceiling.",
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
      { id: "L-F1", skuPrefix: "FL03", type: "filler", widthIn: 3, xIn: 55.5, zIn: -42, rotYDeg: 0, hasCounter: true },

      // Right return wing (facing -X, back against x = +69)
      { id: "L-B2", skuPrefix: "B24", type: "base", widthIn: 24, xIn: 57, zIn: -18, rotYDeg: -90, doors: 2, drawers: 1, hasCounter: true },
      { id: "L-DB2", skuPrefix: "DB36", type: "drawer_base", widthIn: 36, xIn: 57, zIn: 12, rotYDeg: -90, drawers: 3, hasCounter: true },
      { id: "L-B3", skuPrefix: "B24", type: "base", widthIn: 24, xIn: 57, zIn: 42, rotYDeg: -90, doors: 2, drawers: 1, hasCounter: true },

      // Wall cabinets along back run (depth 12 -> center at z = -48)
      { id: "L-W1", skuPrefix: "W30", type: "wall", widthIn: 30, xIn: -27, yIn: 54, zIn: -48, rotYDeg: 0, doors: 2, stackable: true },
      { id: "L-W2", skuPrefix: "W36", type: "wall", widthIn: 36, xIn: 6, yIn: 54, zIn: -48, rotYDeg: 0, doors: 2, stackable: true },
      // Wall cabinets along right wing (depth 12 -> center at x = +63)
      { id: "L-W4", skuPrefix: "W36", type: "wall", widthIn: 36, xIn: 63, yIn: 54, zIn: 12, rotYDeg: -90, doors: 2, stackable: true },
      { id: "L-W5", skuPrefix: "W24", type: "wall", widthIn: 24, xIn: 63, yIn: 54, zIn: 42, rotYDeg: -90, doors: 2, stackable: true },
    ],
    fixtures: [
      { kind: "fridge", xIn: -93, zIn: -39.5, widthIn: 36 },
      { kind: "range", xIn: 39, zIn: -41.5, widthIn: 30 },
      { kind: "hood", xIn: 39, zIn: -44, widthIn: 30 },
      { kind: "sink", xIn: 6, zIn: -42, widthIn: 30 },
      { kind: "fruit-bowl", xIn: -27, zIn: -40 },
      { kind: "plant-counter", xIn: 60, zIn: 44, rotYDeg: -90 },
      { kind: "plant-floor", xIn: -96, zIn: 8 },
    ],
  },

  galley: {
    id: "galley",
    name: "Galley Kitchen",
    shortName: "Galley",
    roomType: "kitchen",
    description:
      "Two facing runs. The most storage for a narrow room.",
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
      { id: "G-TP2", skuPrefix: "TP24", type: "tall", widthIn: 24, xIn: 54, zIn: 34, rotYDeg: 180, doors: 2 },
    ],
    fixtures: [
      { kind: "fridge", xIn: -84, zIn: -31, widthIn: 36 },
      { kind: "range", xIn: 24, zIn: 33.5, rotYDeg: 180, widthIn: 36 },
      { kind: "hood", xIn: 24, zIn: 36, rotYDeg: 180, widthIn: 36 },
      { kind: "sink", xIn: 12, zIn: -34, widthIn: 30 },
      { kind: "plant-counter", xIn: 45, zIn: -38 },
      { kind: "fruit-bowl", xIn: -12, zIn: 32 },
      { kind: "plant-floor", xIn: -88, zIn: 22 },
    ],
  },

  island: {
    id: "island",
    name: "Island Kitchen",
    shortName: "Island",
    roomType: "kitchen",
    description:
      "A full back wall with an island in front of it.",
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
      { id: "I-DB2", skuPrefix: "DB36", type: "drawer_base", widthIn: 36, xIn: 33, zIn: -44, rotYDeg: 0, drawers: 3, hasCounter: true },

      // Back wall uppers (z = -50)
      { id: "I-W1", skuPrefix: "W36", type: "wall", widthIn: 36, xIn: -33, yIn: 54, zIn: -50, rotYDeg: 0, doors: 2, stackable: true },
      { id: "I-W3", skuPrefix: "W36", type: "wall", widthIn: 36, xIn: 33, yIn: 54, zIn: -50, rotYDeg: 0, doors: 2, stackable: true },

      // Monolithic center island (facing +Z toward viewer, centered at z = +22)
      { id: "I-IS1", skuPrefix: "DB30", type: "drawer_base", widthIn: 30, xIn: -33, zIn: 22, rotYDeg: 0, drawers: 3, hasCounter: true },
      { id: "I-IS2", skuPrefix: "SB36", type: "sink_base", widthIn: 36, xIn: 0, zIn: 22, rotYDeg: 0, doors: 2, hasCounter: true },
      { id: "I-IS3", skuPrefix: "DB30", type: "drawer_base", widthIn: 30, xIn: 33, zIn: 22, rotYDeg: 0, drawers: 3, hasCounter: true },
    ],
    fixtures: [
      { kind: "range", xIn: 0, zIn: -43.5, widthIn: 30 },
      { kind: "hood", xIn: 0, zIn: -46, widthIn: 30 },
      { kind: "fridge", xIn: 66, zIn: -41.5, widthIn: 30 },
      { kind: "sink", xIn: 0, zIn: 22, widthIn: 30 },
      { kind: "plant-counter", xIn: -36, zIn: 22 },
      { kind: "fruit-bowl", xIn: 33, zIn: 24 },
      { kind: "plant-floor", xIn: -104, zIn: -30 },
    ],
  },

  vanity: {
    id: "vanity",
    name: "Bath Vanity & Linen Tower",
    shortName: "Bath Vanity",
    roomType: "bath",
    description:
      "A double vanity and a tall linen tower, in the same doors as the kitchen.",
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
    fixtures: [
      { kind: "vessel-basin", xIn: -15, zIn: -17 },
      { kind: "vessel-basin", xIn: 33, zIn: -17 },
      { kind: "plant-counter", xIn: 9, zIn: -20 },
      { kind: "plant-floor", xIn: 68, zIn: -12 },
    ],
  },

  "u-shape": {
    id: "u-shape",
    name: "U-Shape Chef's Kitchen",
    shortName: "U-Shape",
    roomType: "kitchen",
    description:
      "Three walls of cabinets. The most counter and storage.",
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
      { id: "U-DB4", skuPrefix: "DB30", type: "drawer_base", widthIn: 30, xIn: 60, zIn: 18, rotYDeg: -90, drawers: 3, hasCounter: true },
      { id: "U-W5", skuPrefix: "W30", type: "wall", widthIn: 30, xIn: 66, yIn: 54, zIn: 18, rotYDeg: -90, doors: 2, stackable: true },
    ],
    fixtures: [
      { kind: "range", xIn: 59.5, zIn: -12, rotYDeg: -90, widthIn: 30 },
      { kind: "hood", xIn: 62, zIn: -12, rotYDeg: -90, widthIn: 30 },
      { kind: "fridge", xIn: 57.5, zIn: 51, rotYDeg: -90, widthIn: 36 },
      { kind: "sink", xIn: 0, zIn: -46, widthIn: 30 },
      { kind: "fruit-bowl", xIn: -33, zIn: -44 },
      { kind: "plant-counter", xIn: -62, zIn: 18, rotYDeg: 90 },
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

export interface LayoutScheduleItem {
  code: string;
  role: string;
  dimensionsLabel: string;
  quantity: number;
}

export interface LayoutScheduleSummary {
  cabinetCount: number;
  stackedUpperCount: number;
  moldingRuns: number;
  items: LayoutScheduleItem[];
}

/**
 * Pure zero-Three.js concept cabinet schedule builder for /compose.
 * Stand-in box dimensions reflect PLACEHOLDER_DIMS pending catalog verification.
 */
export function summarizeLayoutSchedule(
  layoutId: LayoutId,
  ceilingFt: CeilingHeightFt
): LayoutScheduleSummary {
  const layout = ROOM_LAYOUTS[layoutId];
  const dims = SITE_CONFIG.PLACEHOLDER_DIMS;
  const wallSpec = dims.wallHeightsByCeilingIn[ceilingFt];
  const grouped = new Map<string, LayoutScheduleItem>();
  let stackedUpperCount = 0;
  let moldingRuns = 0;

  const roleLabels: Record<CabinetType, string> = {
    base: "Base cabinet",
    drawer_base: "3-drawer base",
    sink_base: "Sink base",
    wall: "Wall cabinet",
    tall: "Tall pantry",
    vanity: "Bath vanity",
    linen_tower: "Linen tower",
    filler: "Filler strip",
    end_panel: "Finished end panel",
  };

  for (const cab of layout.cabinets) {
    const isWall = cab.type === "wall";
    const isTall = cab.type === "tall" || cab.type === "linen_tower";
    const defaultH = isWall
      ? wallSpec.mainWallIn
      : isTall
        ? Math.min(ceilingFt * 12 - 3, ceilingFt === 8 ? 84 : ceilingFt === 9 ? 96 : 105)
        : dims.baseHeightIn;
    const defaultD = isWall
      ? dims.wallDepthIn
      : cab.type === "vanity" || cab.type === "linen_tower"
        ? dims.vanityDepthIn
        : dims.baseDepthIn;

    const hIn = cab.heightIn ?? defaultH;
    const dIn = cab.depthIn ?? defaultD;
    const key = `${cab.skuPrefix}-${cab.widthIn}x${hIn}x${dIn}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.quantity += 1;
    } else {
      grouped.set(key, {
        code: cab.skuPrefix,
        role: roleLabels[cab.type],
        dimensionsLabel: `${cab.widthIn}" W × ${hIn}" H × ${dIn}" D`,
        quantity: 1,
      });
    }

    if (isWall && cab.stackable && wallSpec.stackedUpperIn > 0) {
      stackedUpperCount += 1;
      const uCode = `WU${cab.widthIn}${wallSpec.stackedUpperIn}`;
      const uKey = `STACK-${uCode}`;
      const uEx = grouped.get(uKey);
      if (uEx) {
        uEx.quantity += 1;
      } else {
        grouped.set(uKey, {
          code: uCode,
          role: "Stacked upper box",
          dimensionsLabel: `${cab.widthIn}" W × ${wallSpec.stackedUpperIn}" H × ${dIn}" D`,
          quantity: 1,
        });
      }
    }

    if (isWall || cab.type === "tall") {
      moldingRuns += 1;
    }
  }

  return {
    cabinetCount: layout.cabinets.length,
    stackedUpperCount,
    moldingRuns,
    items: Array.from(grouped.values()),
  };
}

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
  | "end_panel"
  /** A countertop slab with no cabinet under it (over a dishwasher, or the blind corner). */
  | "counter_span";

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
  /** Front overhang of the counter past the doors (default 1"). */
  counterOverhangIn?: number;
  /** Extra counter past the back of the box: island seating overhang. */
  counterBackExtraIn?: number;
}

export type FixtureKind =
  | "fridge"
  | "range"
  | "hood"
  | "sink"
  | "dishwasher"
  | "vessel-basin"
  | "mirror"
  | "stool"
  | "plant-counter"
  | "fruit-bowl";

/**
 * Appliances and fixtures drawn with the cabinets. Placed by the kitchen planner.
 * Origin: for wall appliances (fridge, range, hood, dishwasher, sink, basin, mirror) the centre of
 * the back edge on the wall line; for free items (stool, plant, bowl) their centre.
 */
export interface FixturePlacement {
  kind: FixtureKind;
  xIn: number;
  zIn: number;
  /** Same convention as cabinets: 0 faces +Z, 90 faces +X, -90 faces -X, 180 faces -Z. */
  rotYDeg?: number;
  widthIn?: number;
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
}

/**
 * The five room layouts. Cabinets and appliances are not listed here: the kitchen planner
 * (src/engine/kitchen-planner.ts) fills each layout to the visitor's wall lengths.
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
  },
};

export const LAYOUT_ORDER: LayoutId[] = [
  "l-shape",
  "galley",
  "island",
  "vanity",
  "u-shape",
];

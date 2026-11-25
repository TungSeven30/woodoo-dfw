import { SITE_CONFIG, type CeilingHeightFt, type LayoutId } from "@/config/site";
import type { CabinetPlacement, CabinetType, FixtureKind, FixturePlacement } from "@/config/layouts";

/**
 * Kitchen planner. It turns a layout and the visitor's wall lengths into cabinets and
 * appliances, the way a cabinet designer fills a wall: fixed appliances and sink first,
 * then standard cabinet widths in 3" steps, then fillers against the walls for what is left.
 *
 * Rules it follows (all sizes in inches):
 * - Base cabinets are 24" deep, doors add 3/4". Wall cabinets are 12" deep and start at 54".
 * - A corner is a blind corner: the back run owns the corner box, the return run starts at
 *   the back run's door face with a 3" filler so drawers and pulls clear each other.
 * - The range keeps at least 15" of counter on both sides. The hood is the range's width,
 *   centred over it, with wall cabinets on both sides.
 * - The sink keeps a dishwasher beside it and never sits in a corner.
 * - Pendants hang only over an island.
 * - Nothing may overlap: `checkPlan` proves it for any wall length and ceiling.
 *
 * Pure data, no three.js, so the test script and the quote form can use it too.
 */

const DIMS = SITE_CONFIG.PLACEHOLDER_DIMS;
const BASE_D = DIMS.baseDepthIn; // 24
const DOOR_T = 0.75;
const BASE_FACE = BASE_D + DOOR_T; // 24.75
const WALL_D = DIMS.wallDepthIn; // 12
const WALL_Y = 54;
const COUNTER_TOP = DIMS.baseHeightIn + DIMS.countertopThicknessIn; // 36
/** Back wall inner face for every room. */
export const BACK_WALL_Z = -54;
/** Clear floor between facing cabinet fronts. */
const AISLE = 42;
const GALLEY_AISLE = 48;
const STEP = 3;
const MAX_SCRIBE = 6;

export type WallKey = "back" | "side" | "length" | "island";

export interface WallSpec {
  key: WallKey;
  label: string;
  hint: string;
  defaultIn: number;
  minIn: number;
  maxIn: number;
}

/** Which walls the visitor can measure for each layout, and the range the planner supports. */
export const WALL_SPECS: Record<LayoutId, WallSpec[]> = {
  "l-shape": [
    { key: "back", label: "Back wall", hint: "Corner to the open end", defaultIn: 144, minIn: 138, maxIn: 216 },
    { key: "side", label: "Side wall", hint: "Corner to the open end", defaultIn: 108, minIn: 90, maxIn: 168 },
  ],
  galley: [{ key: "length", label: "Run length", hint: "Wall to the open end", defaultIn: 144, minIn: 108, maxIn: 216 }],
  island: [
    { key: "back", label: "Back wall", hint: "Wall to wall", defaultIn: 168, minIn: 144, maxIn: 240 },
    { key: "island", label: "Island", hint: "End to end", defaultIn: 96, minIn: 72, maxIn: 132 },
  ],
  vanity: [{ key: "back", label: "Vanity wall", hint: "Wall to wall", defaultIn: 108, minIn: 66, maxIn: 144 }],
  "u-shape": [
    { key: "back", label: "Back wall", hint: "Wall to wall", defaultIn: 132, minIn: 120, maxIn: 192 },
    { key: "side", label: "Side walls", hint: "Back wall to the open end", defaultIn: 120, minIn: 96, maxIn: 156 },
  ],
};

export type WallSizes = Partial<Record<WallKey, number>>;

export function defaultWalls(layoutId: LayoutId): Record<WallKey, number> {
  const out = {} as Record<WallKey, number>;
  for (const s of WALL_SPECS[layoutId]) out[s.key] = s.defaultIn;
  return out;
}

/** Clamp to the supported range and round to the nearest 1/4". */
export function resolveWalls(layoutId: LayoutId, walls?: WallSizes): Record<WallKey, number> {
  const out = {} as Record<WallKey, number>;
  for (const s of WALL_SPECS[layoutId]) {
    const raw = walls?.[s.key];
    const v = typeof raw === "number" && Number.isFinite(raw) ? raw : s.defaultIn;
    out[s.key] = Math.round(Math.min(s.maxIn, Math.max(s.minIn, v)) * 4) / 4;
  }
  return out;
}

export function formatFeetInches(inches: number): string {
  const q = Math.round(inches * 4) / 4;
  const ft = Math.floor(q / 12);
  const rem = q - ft * 12;
  const whole = Math.floor(rem);
  const frac = rem - whole;
  const fracStr = frac === 0.25 ? "¼" : frac === 0.5 ? "½" : frac === 0.75 ? "¾" : "";
  return `${ft}′ ${whole}${fracStr}″`;
}

/* ------------------------------------------------------------------ runs */

type SlotKind =
  | "flex"
  | "tall"
  | "fridge"
  | "range"
  | "sink"
  | "dw"
  | "filler"
  | "corner"
  | "end"
  | "vanity"
  | "vdrawer"
  | "linen";

interface Slot {
  kind: SlotKind;
  /** Fixed width. Flex slots use pref/min/max instead. */
  w?: number;
  pref?: number;
  min?: number;
  max?: number;
  /** Flex style: drawers or a door with one drawer. */
  style?: "drawer" | "door";
  /** Optional slots carry a drop rank; the highest rank goes first when the wall is short. */
  drop?: number;
  /** Where extra cabinets are added when a long wall runs out of standard widths. */
  grow?: boolean;
  /** Scribe filler that takes up what the 3" steps cannot. */
  absorb?: boolean;
  /** Second basin on a double vanity. */
  basin?: boolean;
}

interface RunFrame {
  id: string;
  /** Point on the wall face where the run starts. */
  ox: number;
  oz: number;
  /** Direction along the run. */
  dx: number;
  dz: number;
  /** Direction the doors face (into the room). */
  nx: number;
  nz: number;
  length: number;
  uppers: boolean;
  /** A free-standing island: no wall behind, seating on the back. */
  island?: boolean;
  /** Base depth for this run (bath vanities are shallower). */
  depth?: number;
}

interface SolvedSlot {
  slot: Slot;
  start: number;
  width: number;
}

function rotFromNormal(nx: number, nz: number): number {
  if (nz > 0.5) return 0;
  if (nz < -0.5) return 180;
  if (nx > 0.5) return 90;
  return -90;
}

const minWidth = (s: Slot) => (s.kind === "flex" || s.kind === "vdrawer" ? (s.min ?? 12) : (s.w ?? 0));

/**
 * Fit slots to a run length: drop optional slots until the minimums fit, set flex widths in
 * 3" steps as close to their preferred size as the wall allows, and give the remainder to
 * the scribe fillers. Throws when the wall cannot hold the required pieces.
 */
function solveRun(slotsIn: Slot[], length: number, runId: string): SolvedSlot[] {
  let slots = slotsIn.map((s) => ({ ...s }));
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  while (sum(slots.map(minWidth)) > length + 1e-6) {
    const candidates = slots.filter((s) => s.drop !== undefined).sort((a, b) => (b.drop ?? 0) - (a.drop ?? 0));
    if (!candidates.length) throw new Error(`Run ${runId}: ${length}" cannot hold the required cabinets`);
    slots = slots.filter((s) => s !== candidates[0]);
  }

  const isFlex = (s: Slot) => s.kind === "flex" || s.kind === "vdrawer";
  let widths = slots.map((s) => (isFlex(s) ? Math.min(s.max ?? 36, Math.max(minWidth(s), s.pref ?? 24)) : (s.w ?? 0)));

  // Shrink the widest flex cabinets in 3" steps until the run fits.
  const shrink = () => {
    for (let guard = 0; sum(widths) > length + 1e-6 && guard < 200; guard++) {
      let best = -1;
      for (let i = 0; i < slots.length; i++) {
        if (!isFlex(slots[i]) || widths[i] - STEP < minWidth(slots[i]) - 1e-6) continue;
        if (best < 0 || widths[i] > widths[best]) best = i;
      }
      if (best < 0) break;
      widths[best] -= STEP;
    }
  };
  shrink();

  // Grow the narrowest flex cabinets until less than one step is left; add a cabinet if all are at maximum.
  for (let guard = 0; length - sum(widths) >= STEP - 1e-6 && guard < 400; guard++) {
    let best = -1;
    for (let i = 0; i < slots.length; i++) {
      if (!isFlex(slots[i]) || widths[i] + STEP > (slots[i].max ?? 36) + 1e-6) continue;
      const score = widths[i] - (slots[i].pref ?? 24);
      const bestScore = best < 0 ? Infinity : widths[best] - (slots[best].pref ?? 24);
      if (best < 0 || score < bestScore) best = i;
    }
    if (best >= 0) {
      widths[best] += STEP;
      continue;
    }
    const left = length - sum(widths);
    const absorbers = slots.filter((s) => s.absorb).length;
    if (absorbers && left <= MAX_SCRIBE * absorbers + 1e-6) break;
    // Every flex cabinet is at its maximum and too much is left for a filler: add one more
    // cabinet next to the grow slot (or the last flex one) and let the others shrink to make room.
    let gi = slots.findIndex((s) => s.grow);
    if (gi < 0) gi = slots.map((s, i) => (isFlex(s) ? i : -1)).filter((i) => i >= 0).pop() ?? -1;
    if (gi < 0) break;
    const addW = minWidth(slots[gi]);
    const add: Slot = { ...slots[gi], drop: undefined, grow: false, pref: addW };
    slots = [...slots.slice(0, gi + 1), add, ...slots.slice(gi + 1)];
    widths = [...widths.slice(0, gi + 1), addW, ...widths.slice(gi + 1)];
    shrink();
  }

  const leftover = Math.round((length - sum(widths)) * 1000) / 1000;
  const absorbIdx = slots.map((s, i) => (s.absorb ? i : -1)).filter((i) => i >= 0);
  if (absorbIdx.length) {
    const each = leftover / absorbIdx.length;
    for (const i of absorbIdx) widths[i] += each;
  } else if (leftover > 1e-6) {
    const ends = slots.map((s, i) => (s.kind === "end" ? i : -1)).filter((i) => i >= 0);
    if (!ends.length) throw new Error(`Run ${runId}: ${leftover}" left with no filler to take it`);
    for (const i of ends) widths[i] += leftover / ends.length;
  }

  let at = 0;
  return slots.map((slot, i) => {
    const out = { slot, start: at, width: widths[i] };
    at += widths[i];
    return out;
  });
}

/* ------------------------------------------------------------------ plan */

export interface WallPlane {
  /** Centre of the wall face on the floor, in inches. */
  xIn: number;
  zIn: number;
  widthIn: number;
  /** Direction the wall faces, same convention as cabinets. */
  rotYDeg: number;
}

export interface StripPlacement {
  /** Centre on the wall face (or floor), in inches. */
  xIn: number;
  zIn: number;
  widthIn: number;
  rotYDeg: number;
  y0: number;
  y1: number;
}

export interface PendantPlacement {
  xIn: number;
  zIn: number;
  /** Centre of the shade. */
  yIn: number;
}

export interface PlannedRoom {
  layoutId: LayoutId;
  ceiling: CeilingHeightFt;
  ceilingIn: number;
  walls: Record<WallKey, number>;
  cabinets: CabinetPlacement[];
  fixtures: FixturePlacement[];
  pendants: PendantPlacement[];
  wallPlanes: WallPlane[];
  backsplash: StripPlacement[];
  /** Under-cabinet light strips, one per run of wall cabinets. */
  lightStrips: StripPlacement[];
  /** Soft floor shadow in front of each base run. */
  floorShadows: StripPlacement[];
  /** Island footprint (counter), if any. */
  island: { x0: number; x1: number; z0: number; z1: number } | null;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Room limits used by the collision check. Open sides are left at ±Infinity. */
  limits: { minX: number; maxX: number; minZ: number; maxZ: number };
  totals: { baseRunIn: number; wallRunIn: number; tallCount: number; counterSqFt: number };
}

const SKU: Record<string, string> = {
  tall: "TP",
  drawer: "DB",
  door: "B",
  sink: "SB",
  wall: "W",
  filler: "FL",
  corner: "BC",
  vanity: "V",
  vdrawer: "VDB",
  linen: "LT",
  end: "EP",
  fridgeWall: "WR",
  dw: "DW",
};

function topLine(ceiling: CeilingHeightFt): number {
  const ws = DIMS.wallHeightsByCeilingIn[ceiling];
  return WALL_Y + ws.mainWallIn + (ws.stackedUpperIn > 0 ? ws.stackedUpperIn + 0.08 : 0);
}

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

class PlanBuilder {
  cabinets: CabinetPlacement[] = [];
  fixtures: FixturePlacement[] = [];
  backsplash: StripPlacement[] = [];
  lightStrips: StripPlacement[] = [];
  floorShadows: StripPlacement[] = [];
  private n = 0;
  constructor(readonly ceiling: CeilingHeightFt) {}

  id(prefix: string) {
    this.n += 1;
    return `${prefix}${this.n}`;
  }

  /** Lay out one run of slots along a wall (or as an island). */
  run(frame: RunFrame, slots: Slot[]) {
    const solved = solveRun(slots, frame.length, frame.id);
    const rot = rotFromNormal(frame.nx, frame.nz);
    const depth = frame.depth ?? BASE_D;
    const at = (along: number, out: number) => ({
      x: round(frame.ox + frame.dx * along + frame.nx * out),
      z: round(frame.oz + frame.dz * along + frame.nz * out),
    });
    const ceilingIn = DIMS.ceilingHeightsIn[this.ceiling];
    const top = topLine(this.ceiling);

    let baseRun = 0;
    let splashStart = -1;
    let splashEnd = -1;
    const flushSplash = () => {
      if (splashStart >= 0 && splashEnd > splashStart + 0.5 && !frame.island) {
        const c = at((splashStart + splashEnd) / 2, 0);
        this.backsplash.push({ xIn: c.x, zIn: c.z, widthIn: round(splashEnd - splashStart), rotYDeg: rot, y0: COUNTER_TOP, y1: WALL_Y });
      }
      splashStart = -1;
      splashEnd = -1;
    };
    const extendSplash = (s: number, e: number) => {
      if (splashStart < 0) splashStart = s;
      splashEnd = e;
    };

    let upperStart = -1;
    let upperEnd = -1;
    const flushUppers = () => {
      if (upperStart >= 0 && upperEnd > upperStart + 0.5) {
        const c = at((upperStart + upperEnd) / 2, 0);
        this.lightStrips.push({ xIn: c.x, zIn: c.z, widthIn: round(upperEnd - upperStart), rotYDeg: rot, y0: WALL_Y - 0.5, y1: WALL_Y });
      }
      upperStart = -1;
      upperEnd = -1;
    };

    const addUpper = (s: SolvedSlot, kind: "wall" | "filler", opts: Partial<CabinetPlacement> = {}) => {
      if (!frame.uppers) return;
      const c = at(s.start + s.width / 2, WALL_D / 2);
      const isFiller = kind === "filler";
      this.cabinets.push({
        id: this.id(frame.id + "-U"),
        skuPrefix: isFiller ? `${SKU.filler}${Math.round(s.width)}` : `${SKU.wall}${Math.round(s.width)}`,
        type: isFiller ? "filler" : "wall",
        widthIn: round(s.width),
        xIn: c.x,
        yIn: WALL_Y,
        zIn: c.z,
        rotYDeg: rot,
        doors: s.width >= 24 ? 2 : 1,
        stackable: !isFiller,
        depthIn: WALL_D,
        heightIn: isFiller ? round(top - WALL_Y) : undefined,
        ...opts,
      });
      if (upperStart < 0) upperStart = s.start;
      upperEnd = s.start + s.width;
    };

    for (const s of solved) {
      const w = s.width;
      const mid = s.start + w / 2;
      const base = at(mid, depth / 2);
      const back = at(mid, 0);
      const k = s.slot.kind;
      const push = (c: Omit<CabinetPlacement, "id" | "xIn" | "zIn" | "rotYDeg">) =>
        this.cabinets.push({
          id: this.id(frame.id + "-"),
          xIn: base.x,
          zIn: base.z,
          rotYDeg: rot,
          ...(frame.depth ? { depthIn: frame.depth } : {}),
          ...c,
        });

      if (k === "flex") {
        const drawer = s.slot.style !== "door";
        push({
          skuPrefix: `${drawer ? SKU.drawer : SKU.door}${Math.round(w)}`,
          type: drawer ? "drawer_base" : "base",
          widthIn: round(w),
          drawers: drawer ? 3 : 1,
          doors: w >= 24 ? 2 : 1,
          hasCounter: true,
          counterBackExtraIn: frame.island ? 12 : undefined,
        });
        baseRun += w;
        extendSplash(s.start, s.start + w);
        addUpper(s, "wall");
      } else if (k === "sink") {
        push({ skuPrefix: `${SKU.sink}${Math.round(w)}`, type: "sink_base", widthIn: round(w), doors: 2, hasCounter: true, counterBackExtraIn: frame.island ? 12 : undefined });
        this.fixtures.push({ kind: "sink", xIn: back.x, zIn: back.z, rotYDeg: rot, widthIn: 30 });
        baseRun += w;
        extendSplash(s.start, s.start + w);
        addUpper(s, "wall");
      } else if (k === "dw") {
        push({ skuPrefix: SKU.dw, type: "counter_span", widthIn: round(w), hasCounter: true, counterBackExtraIn: frame.island ? 12 : undefined });
        this.fixtures.push({ kind: "dishwasher", xIn: back.x, zIn: back.z, rotYDeg: rot, widthIn: round(w - 0.375) });
        baseRun += w;
        extendSplash(s.start, s.start + w);
        addUpper(s, "wall");
      } else if (k === "filler") {
        push({ skuPrefix: `${SKU.filler}${Math.max(1, Math.round(w))}`, type: "filler", widthIn: round(w), hasCounter: true });
        baseRun += w;
        extendSplash(s.start, s.start + w);
        addUpper(s, "filler");
      } else if (k === "corner") {
        push({ skuPrefix: `${SKU.corner}`, type: "counter_span", widthIn: round(w), hasCounter: true, counterOverhangIn: 0 });
        baseRun += w;
        extendSplash(s.start, s.start + w);
        addUpper(s, "wall", { doors: 1 });
      } else if (k === "end") {
        push({ skuPrefix: SKU.end, type: "end_panel", widthIn: round(w), hasCounter: true, counterBackExtraIn: frame.island ? 12 : undefined });
        baseRun += w;
      } else if (k === "tall") {
        flushSplash();
        flushUppers();
        push({ skuPrefix: `${SKU.tall}${Math.round(w)}`, type: "tall", widthIn: round(w), doors: 2 });
      } else if (k === "fridge") {
        flushSplash();
        flushUppers();
        this.fixtures.push({ kind: "fridge", xIn: back.x, zIn: back.z, rotYDeg: rot, widthIn: round(w - 0.25) });
        if (frame.uppers) {
          const y = 72;
          const c = at(mid, BASE_D / 2);
          this.cabinets.push({
            id: this.id(frame.id + "-R"),
            skuPrefix: `${SKU.fridgeWall}${Math.round(w)}`,
            type: "wall",
            widthIn: round(w),
            xIn: c.x,
            yIn: y,
            zIn: c.z,
            rotYDeg: rot,
            doors: 2,
            stackable: false,
            depthIn: BASE_D,
            heightIn: round(top - y),
          });
        }
      } else if (k === "range") {
        flushUppers();
        this.fixtures.push({ kind: "range", xIn: back.x, zIn: back.z, rotYDeg: rot, widthIn: round(w - 0.125) });
        this.fixtures.push({ kind: "hood", xIn: back.x, zIn: back.z, rotYDeg: rot, widthIn: round(w) });
        extendSplash(s.start, s.start + w);
      } else if (k === "vanity") {
        push({ skuPrefix: `${SKU.vanity}${Math.round(w)}`, type: "vanity", widthIn: round(w), depthIn: depth, doors: 2, hasCounter: true });
        this.fixtures.push({ kind: "vessel-basin", xIn: back.x, zIn: back.z, rotYDeg: rot });
        this.fixtures.push({ kind: "mirror", xIn: back.x, zIn: back.z, rotYDeg: rot, widthIn: Math.min(24, round(w - 6)) });
        baseRun += w;
        extendSplash(s.start, s.start + w);
      } else if (k === "vdrawer") {
        push({ skuPrefix: `${SKU.vdrawer}${Math.round(w)}`, type: "drawer_base", widthIn: round(w), depthIn: depth, drawers: 3, hasCounter: true });
        baseRun += w;
        extendSplash(s.start, s.start + w);
      } else if (k === "linen") {
        flushSplash();
        push({ skuPrefix: `${SKU.linen}${Math.round(w)}`, type: "linen_tower", widthIn: round(w), depthIn: depth, doors: 2 });
      }
    }
    flushSplash();
    flushUppers();

    // A soft floor shadow along the whole run, in front of the toe kicks.
    if (baseRun > 0) {
      const c = at(frame.length / 2, depth + DOOR_T);
      this.floorShadows.push({ xIn: c.x, zIn: c.z, widthIn: round(frame.length), rotYDeg: rot, y0: 0, y1: 0 });
    }
    void ceilingIn;
    return solved;
  }
}

function wallPlane(x1: number, z1: number, x2: number, z2: number, rot: number): WallPlane {
  return { xIn: round((x1 + x2) / 2), zIn: round((z1 + z2) / 2), widthIn: round(Math.hypot(x2 - x1, z2 - z1)), rotYDeg: rot };
}

/** Plan a room for the given layout, wall lengths and ceiling. */
export function planRoom(layoutId: LayoutId, wallsIn: WallSizes | undefined, ceiling: CeilingHeightFt): PlannedRoom {
  const walls = resolveWalls(layoutId, wallsIn);
  const b = new PlanBuilder(ceiling);
  const Z0 = BACK_WALL_Z;
  const ceilingIn = DIMS.ceilingHeightsIn[ceiling];
  const planes: WallPlane[] = [];
  const pendants: PendantPlacement[] = [];
  let island: PlannedRoom["island"] = null;
  const limits = { minX: -Infinity, maxX: Infinity, minZ: Z0, maxZ: Infinity };

  const flex = (pref: number, extra: Partial<Slot> = {}): Slot => ({ kind: "flex", pref, min: 12, max: 36, style: "drawer", ...extra });

  if (layoutId === "l-shape") {
    const W = walls.back;
    const S = walls.side;
    limits.maxX = W / 2;
    b.run(
      { id: "LB", ox: -W / 2, oz: Z0, dx: 1, dz: 0, nx: 0, nz: 1, length: W, uppers: true },
      [
        { kind: "tall", w: 30, drop: 2 },
        { kind: "fridge", w: 36 },
        flex(24, { drop: 1, grow: true }),
        { kind: "sink", w: 36 },
        { kind: "dw", w: 24 },
        flex(18, { style: "door", min: 12, drop: 3 }),
        { kind: "filler", w: 3, absorb: true },
        { kind: "corner", w: BASE_FACE },
      ]
    );
    b.run(
      { id: "LR", ox: W / 2, oz: Z0 + BASE_FACE, dx: 0, dz: 1, nx: -1, nz: 0, length: S - BASE_FACE, uppers: true },
      [
        { kind: "filler", w: 3, absorb: true },
        flex(18, { min: 15 }),
        { kind: "range", w: 30 },
        flex(30, { min: 15 }),
        flex(24, { style: "door", drop: 1, grow: true }),
      ]
    );
    // Upper return in the corner: from the back uppers' face to where the side run's uppers begin.
    pushCornerUpperReturn(b, W / 2, Z0, -1, ceiling);
    planes.push(wallPlane(-W / 2 - 24, Z0, W / 2, Z0, 0));
    planes.push(wallPlane(W / 2, Z0, W / 2, Z0 + S + 24, -90));
  } else if (layoutId === "galley") {
    const L = walls.length;
    limits.minX = -L / 2;
    const zSouth = Z0 + BASE_FACE * 2 + GALLEY_AISLE;
    limits.maxZ = zSouth;
    b.run(
      { id: "GN", ox: -L / 2, oz: Z0, dx: 1, dz: 0, nx: 0, nz: 1, length: L, uppers: true },
      [
        { kind: "filler", w: 3, absorb: true },
        flex(30, { drop: 2 }),
        flex(18, { min: 15 }),
        { kind: "range", w: 30 },
        flex(18, { min: 15 }),
        flex(30, { style: "door", drop: 1, grow: true }),
      ]
    );
    b.run(
      { id: "GS", ox: -L / 2, oz: zSouth, dx: 1, dz: 0, nx: 0, nz: -1, length: L, uppers: false },
      [
        { kind: "filler", w: 3, absorb: true },
        { kind: "tall", w: 24, drop: 3 },
        { kind: "fridge", w: 36 },
        flex(24, { drop: 2, grow: true }),
        { kind: "sink", w: 36 },
        { kind: "dw", w: 24 },
        flex(18, { style: "door", min: 9, drop: 1 }),
      ]
    );
    planes.push(wallPlane(-L / 2, Z0, L / 2 + 24, Z0, 0));
    planes.push(wallPlane(-L / 2, zSouth, -L / 2, Z0, 90));
    planes.push(wallPlane(L / 2 + 24, zSouth, -L / 2, zSouth, 180));
  } else if (layoutId === "island") {
    const W = walls.back;
    const Li = walls.island;
    limits.minX = -W / 2;
    limits.maxX = W / 2;
    b.run(
      { id: "IB", ox: -W / 2, oz: Z0, dx: 1, dz: 0, nx: 0, nz: 1, length: W, uppers: true },
      [
        { kind: "filler", w: 3, absorb: true },
        { kind: "tall", w: 30, drop: 3 },
        { kind: "fridge", w: 36 },
        flex(30, { drop: 2 }),
        flex(18, { min: 15 }),
        { kind: "range", w: 36 },
        flex(18, { min: 15 }),
        flex(30, { drop: 1, grow: true }),
        { kind: "tall", w: 30, drop: 4 },
        { kind: "filler", w: 3, absorb: true },
      ]
    );
    // Island: doors face the back wall (the cook stands between), seating overhang toward the room.
    const islandFront = Z0 + BASE_FACE + AISLE; // door face
    const islandBack = islandFront + BASE_FACE; // back of the box
    b.run(
      { id: "IS", ox: -Li / 2, oz: islandBack, dx: 1, dz: 0, nx: 0, nz: -1, length: Li, uppers: false, island: true },
      [
        { kind: "end", w: 1.5 },
        flex(24, { drop: 2 }),
        { kind: "sink", w: 36 },
        { kind: "dw", w: 24 },
        flex(18, { drop: 1, grow: true }),
        { kind: "end", w: 1.5 },
      ]
    );
    const counterFront = islandFront - 1; // 1" overhang over the doors
    const counterBack = islandBack + 12;
    island = { x0: -Li / 2, x1: Li / 2, z0: counterFront, z1: counterBack };
    const zMid = (counterFront + counterBack) / 2;
    const count = Li >= 96 ? 3 : 2;
    for (let i = 0; i < count; i++) {
      pendants.push({ xIn: round(-Li / 2 + (Li / count) * (i + 0.5)), zIn: round(zMid), yIn: COUNTER_TOP + 32 });
    }
    // Stools tucked under the overhang.
    const stools = Math.max(2, Math.min(4, Math.floor((Li - 6) / 26)));
    for (let i = 0; i < stools; i++) {
      b.fixtures.push({ kind: "stool", xIn: round(-Li / 2 + (Li / stools) * (i + 0.5)), zIn: round(islandBack + 11), rotYDeg: 180 });
    }
    planes.push(wallPlane(-W / 2, Z0, W / 2, Z0, 0));
    planes.push(wallPlane(-W / 2, Z0 + 150, -W / 2, Z0, 90));
    planes.push(wallPlane(W / 2, Z0, W / 2, Z0 + 150, -90));
  } else if (layoutId === "u-shape") {
    const W = walls.back;
    const S = walls.side;
    limits.minX = -W / 2;
    limits.maxX = W / 2;
    b.run(
      { id: "UB", ox: -W / 2, oz: Z0, dx: 1, dz: 0, nx: 0, nz: 1, length: W, uppers: true },
      [
        { kind: "corner", w: BASE_FACE },
        { kind: "filler", w: 3, absorb: true },
        flex(18, { drop: 1, grow: true }),
        { kind: "sink", w: 36 },
        { kind: "dw", w: 24 },
        flex(18, { drop: 2 }),
        { kind: "filler", w: 3, absorb: true },
        { kind: "corner", w: BASE_FACE },
      ]
    );
    b.run(
      { id: "UL", ox: -W / 2, oz: Z0 + BASE_FACE, dx: 0, dz: 1, nx: 1, nz: 0, length: S - BASE_FACE, uppers: true },
      [
        { kind: "filler", w: 3, absorb: true },
        flex(24, { drop: 1, grow: true }),
        flex(18, { style: "door", drop: 2 }),
        { kind: "fridge", w: 36 },
        { kind: "tall", w: 24, drop: 3 },
      ]
    );
    b.run(
      { id: "UR", ox: W / 2, oz: Z0 + BASE_FACE, dx: 0, dz: 1, nx: -1, nz: 0, length: S - BASE_FACE, uppers: true },
      [
        { kind: "filler", w: 3, absorb: true },
        flex(18, { min: 15 }),
        { kind: "range", w: 30 },
        flex(18, { min: 15 }),
        flex(24, { style: "door", drop: 1, grow: true }),
      ]
    );
    pushCornerUpperReturn(b, W / 2, Z0, -1, ceiling);
    pushCornerUpperReturn(b, -W / 2, Z0, 1, ceiling);
    planes.push(wallPlane(-W / 2, Z0, W / 2, Z0, 0));
    planes.push(wallPlane(-W / 2, Z0 + S + 24, -W / 2, Z0, 90));
    planes.push(wallPlane(W / 2, Z0, W / 2, Z0 + S + 24, -90));
  } else {
    // Bath vanity in an alcove.
    const W = walls.back;
    limits.minX = -W / 2;
    limits.maxX = W / 2;
    const vd = DIMS.vanityDepthIn;
    b.run(
      { id: "VB", ox: -W / 2, oz: Z0, dx: 1, dz: 0, nx: 0, nz: 1, length: W, uppers: false, depth: vd },
      [
        { kind: "filler", w: 1.5, absorb: true },
        { kind: "linen", w: 24, drop: 2 },
        { kind: "vanity", w: 30 },
        { kind: "vdrawer", pref: 18, min: 12, max: 24, drop: 1, grow: true },
        { kind: "vanity", w: 30, drop: 3, basin: true },
        { kind: "filler", w: 1.5, absorb: true },
      ]
    );
    planes.push(wallPlane(-W / 2, Z0, W / 2, Z0, 0));
    planes.push(wallPlane(-W / 2, Z0 + 72, -W / 2, Z0, 90));
    planes.push(wallPlane(W / 2, Z0, W / 2, Z0 + 72, -90));
  }

  // Counter decor: a bowl and a small plant on the widest drawer bases, never under a hood.
  placeDecor(b, layoutId);

  // Bounds of everything on the floor, for the camera.
  const pts: Array<[number, number]> = [];
  for (const c of b.cabinets) pts.push([c.xIn, c.zIn]);
  for (const f of b.fixtures) pts.push([f.xIn, f.zIn]);
  const xs = pts.map((p) => p[0]);
  const zs = pts.map((p) => p[1]);
  const bounds = {
    minX: Math.min(...xs) - 12,
    maxX: Math.max(...xs) + 12,
    minZ: Math.min(...zs) - 12,
    maxZ: Math.max(...zs) + 12,
  };

  let baseRunIn = 0;
  let wallRunIn = 0;
  let tallCount = 0;
  let counterSqIn = 0;
  for (const c of b.cabinets) {
    const isUpper = (c.yIn ?? 0) > 0;
    if (c.type === "tall" || c.type === "linen_tower") tallCount++;
    else if (isUpper) wallRunIn += c.widthIn;
    else baseRunIn += c.widthIn;
    if (c.hasCounter) counterSqIn += c.widthIn * ((c.depthIn ?? BASE_D) + (c.counterOverhangIn ?? 1) + DOOR_T + (c.counterBackExtraIn ?? 0));
  }
  for (const f of b.fixtures) if (f.kind === "range") baseRunIn += (f.widthIn ?? 30) + 0.125;

  return {
    layoutId,
    ceiling,
    ceilingIn,
    walls,
    cabinets: b.cabinets,
    fixtures: b.fixtures,
    pendants,
    wallPlanes: planes,
    backsplash: b.backsplash,
    lightStrips: b.lightStrips,
    floorShadows: b.floorShadows,
    island,
    bounds,
    limits,
    totals: {
      baseRunIn: round(baseRunIn),
      wallRunIn: round(wallRunIn),
      tallCount,
      counterSqFt: Math.round((counterSqIn / 144) * 10) / 10,
    },
  };
}

/**
 * The return run's wall cabinets start where the back run's wall cabinets end (12 3/4" from the
 * back wall). Its base run starts later, at the base door face plus the corner filler. A wall
 * cabinet fills the gap so the corner reads as one continuous run of uppers.
 * side: -1 for a return on the right wall (facing -X), +1 for the left wall (facing +X).
 */
function pushCornerUpperReturn(b: PlanBuilder, wallX: number, Z0: number, side: -1 | 1, ceiling: CeilingHeightFt) {
  // Find the first base filler on that return run to know where its uppers begin.
  const rot = side === -1 ? -90 : 90;
  const run = b.cabinets.filter((c) => c.rotYDeg === rot && (c.yIn ?? 0) > 0);
  const firstUpperZ = run.length ? Math.min(...run.map((c) => c.zIn - c.widthIn / 2)) : Z0 + BASE_FACE;
  const start = Z0 + WALL_D + DOOR_T;
  const w = round(firstUpperZ - start);
  if (w < 1) return;
  b.cabinets.push({
    id: b.id(side === -1 ? "CR-U" : "CL-U"),
    skuPrefix: `W${Math.round(w)}`,
    type: "wall",
    widthIn: w,
    xIn: round(wallX + side * (WALL_D / 2)),
    yIn: WALL_Y,
    zIn: round(start + w / 2),
    rotYDeg: rot,
    doors: 1,
    stackable: true,
    depthIn: WALL_D,
  });
  // Light strip under it continues the run's light.
  b.lightStrips.push({
    xIn: round(wallX),
    zIn: round(start + w / 2),
    widthIn: w,
    rotYDeg: rot,
    y0: WALL_Y - 0.5,
    y1: WALL_Y,
  });
  void ceiling;
}

function placeDecor(b: PlanBuilder, layoutId: LayoutId) {
  const drawerBases = b.cabinets
    .filter((c) => c.type === "drawer_base" && (c.yIn ?? 0) === 0 && !c.counterBackExtraIn && c.widthIn >= 18)
    .sort((a, c) => c.widthIn - a.widthIn);
  const kinds: FixtureKind[] = layoutId === "vanity" ? ["plant-counter"] : ["fruit-bowl", "plant-counter"];
  const used = new Set<string>();
  for (const kind of kinds) {
    const cab = drawerBases.find((c) => !used.has(c.id));
    if (!cab) break;
    used.add(cab.id);
    // Toward the front of the counter so the wall cabinets above stay clear.
    const r = (cab.rotYDeg * Math.PI) / 180;
    const fwd = (cab.depthIn ?? BASE_D) / 2 - 7;
    b.fixtures.push({
      kind,
      xIn: round(cab.xIn + Math.sin(r) * fwd),
      zIn: round(cab.zIn + Math.cos(r) * fwd),
      rotYDeg: cab.rotYDeg,
    });
  }
}

/* ------------------------------------------------------------------ collisions */

export interface Box3In {
  id: string;
  label: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

/** Local extents of each fixture, origin at the back centre (wall side), +z toward the room. */
export function fixtureExtents(f: FixturePlacement, ceilingIn: number) {
  const w = f.widthIn ?? 30;
  switch (f.kind) {
    case "fridge":
      return { x0: -w / 2, x1: w / 2, y0: 0, y1: 70, z0: 0.5, z1: 28.5 };
    case "range":
      return { x0: -w / 2, x1: w / 2, y0: 0, y1: 39, z0: 0, z1: 28 };
    case "hood":
      return { x0: -w / 2, x1: w / 2, y0: 66, y1: ceilingIn, z0: 0, z1: 20 };
    case "dishwasher":
      return { x0: -w / 2, x1: w / 2, y0: 0.25, y1: 34.25, z0: 0.5, z1: 26.25 };
    case "sink":
      return { x0: -15.5, x1: 15.5, y0: COUNTER_TOP, y1: COUNTER_TOP + 16.5, z0: 2, z1: 22 };
    case "vessel-basin":
      return { x0: -10, x1: 10, y0: COUNTER_TOP, y1: COUNTER_TOP + 12.5, z0: 2, z1: 18 };
    case "mirror":
      return { x0: -w / 2, x1: w / 2, y0: 44, y1: 76, z0: 0, z1: 1 };
    case "stool":
      return { x0: -8, x1: 8, y0: 0, y1: 30, z0: -8, z1: 8 };
    case "plant-counter":
      return { x0: -6.5, x1: 6.5, y0: COUNTER_TOP, y1: COUNTER_TOP + 16, z0: -6.5, z1: 6.5 };
    case "fruit-bowl":
      return { x0: -6, x1: 6, y0: COUNTER_TOP, y1: COUNTER_TOP + 5.5, z0: -6, z1: 6 };
    default:
      return { x0: -6, x1: 6, y0: 0, y1: 12, z0: -6, z1: 6 };
  }
}

function transformBox(
  local: { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number },
  x: number,
  z: number,
  rotYDeg: number
) {
  const r = (rotYDeg * Math.PI) / 180;
  const c = Math.round(Math.cos(r));
  const s = Math.round(Math.sin(r));
  const xs: number[] = [];
  const zs: number[] = [];
  for (const lx of [local.x0, local.x1]) {
    for (const lz of [local.z0, local.z1]) {
      xs.push(x + lx * c + lz * s);
      zs.push(z - lx * s + lz * c);
    }
  }
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: local.y0, y1: local.y1, z0: Math.min(...zs), z1: Math.max(...zs) };
}

export function cabinetHeightIn(c: CabinetPlacement, ceiling: CeilingHeightFt): number {
  if (c.heightIn) return c.heightIn;
  const ws = DIMS.wallHeightsByCeilingIn[ceiling];
  if (c.type === "wall") return ws.mainWallIn + (c.stackable && ws.stackedUpperIn > 0 ? ws.stackedUpperIn + 0.08 : 0);
  if (c.type === "linen_tower") return Math.min(84, DIMS.ceilingHeightsIn[ceiling] - 6);
  if (c.type === "tall") return DIMS.ceilingHeightsIn[ceiling] - DIMS.confirmedMoldingInches;
  return DIMS.baseHeightIn;
}

/** World boxes for every solid thing in the room (counters excluded: they are meant to touch). */
export function planBoxes(plan: PlannedRoom): Box3In[] {
  const out: Box3In[] = [];
  for (const c of plan.cabinets) {
    if (c.type === "counter_span") continue; // only a counter slab; the appliance under it is checked
    const d = c.depthIn ?? (c.type === "wall" ? WALL_D : BASE_D);
    const h = cabinetHeightIn(c, plan.ceiling);
    const y0 = c.yIn ?? 0;
    const local = { x0: -c.widthIn / 2, x1: c.widthIn / 2, y0, y1: y0 + h, z0: -d / 2, z1: d / 2 + DOOR_T };
    out.push({ id: c.id, label: `${c.skuPrefix} (${c.type})`, ...transformBox(local, c.xIn, c.zIn, c.rotYDeg) });
  }
  for (const [i, f] of plan.fixtures.entries()) {
    out.push({
      id: `fx${i}`,
      label: f.kind,
      ...transformBox(fixtureExtents(f, plan.ceilingIn), f.xIn, f.zIn, f.rotYDeg ?? 0),
    });
  }
  for (const [i, p] of plan.pendants.entries()) {
    const r = 3.6;
    out.push({ id: `pd${i}`, label: "pendant", x0: p.xIn - r, x1: p.xIn + r, y0: p.yIn - r, y1: plan.ceilingIn, z0: p.zIn - r, z1: p.zIn + r });
  }
  return out;
}

export interface PlanIssue {
  rule: string;
  detail: string;
}

/**
 * Prove the plan is buildable: nothing overlaps, everything is inside the walls and under the
 * ceiling, the hood is centred over the range at the range's width, the range and sink have
 * counter on both sides, and pendants hang only over the island.
 */
export function checkPlan(plan: PlannedRoom): PlanIssue[] {
  const issues: PlanIssue[] = [];
  const tol = 0.01;
  const boxes = planBoxes(plan);
  for (let i = 0; i < boxes.length; i++) {
    const a = boxes[i];
    if (a.x0 < plan.limits.minX - tol || a.x1 > plan.limits.maxX + tol || a.z0 < plan.limits.minZ - tol || a.z1 > plan.limits.maxZ + tol) {
      issues.push({ rule: "inside-walls", detail: `${a.label} goes through a wall` });
    }
    if (a.y1 > plan.ceilingIn + tol) issues.push({ rule: "under-ceiling", detail: `${a.label} goes through the ceiling` });
    for (let j = i + 1; j < boxes.length; j++) {
      const b = boxes[j];
      const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
      const oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      const oz = Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0);
      if (ox > tol && oy > tol && oz > tol) {
        issues.push({ rule: "overlap", detail: `${a.label} overlaps ${b.label} by ${ox.toFixed(2)}×${oy.toFixed(2)}×${oz.toFixed(2)}"` });
      }
    }
  }

  const ranges = plan.fixtures.filter((f) => f.kind === "range");
  const hoods = plan.fixtures.filter((f) => f.kind === "hood");
  for (const r of ranges) {
    const h = hoods.find((x) => Math.abs(x.xIn - r.xIn) < 0.01 && Math.abs(x.zIn - r.zIn) < 0.01 && x.rotYDeg === r.rotYDeg);
    if (!h) issues.push({ rule: "hood-centred", detail: "range has no hood centred over it" });
    else if (Math.abs((h.widthIn ?? 0) - (r.widthIn ?? 0)) > 0.5) issues.push({ rule: "hood-width", detail: "hood is not the range's width" });
    for (const side of [-1, 1]) {
      const land = counterBeside(plan, r, side);
      if (land < 15 - tol) issues.push({ rule: "range-landing", detail: `only ${land}" of counter beside the range` });
    }
  }
  for (const s of plan.fixtures.filter((f) => f.kind === "sink")) {
    const run = Math.max(counterBeside(plan, s, -1, 18), counterBeside(plan, s, 1, 18));
    if (run < 18 - tol) issues.push({ rule: "sink-landing", detail: `sink has only ${run}" of counter beside it` });
  }
  for (const p of plan.pendants) {
    const isl = plan.island;
    if (!isl || p.xIn < isl.x0 || p.xIn > isl.x1 || p.zIn < isl.z0 || p.zIn > isl.z1) {
      issues.push({ rule: "pendant-island", detail: "pendant is not over an island" });
    }
  }
  return issues;
}

/** Counter length directly beside a fixture on one side (stops at anything without a counter). */
function counterBeside(plan: PlannedRoom, f: FixturePlacement, side: -1 | 1, fixtureHalf?: number): number {
  const rot = f.rotYDeg ?? 0;
  const r = (rot * Math.PI) / 180;
  const ax = Math.round(Math.cos(r));
  const az = -Math.round(Math.sin(r));
  const half = fixtureHalf ?? (f.widthIn ?? 30) / 2;
  // Cabinets on the same run (same rotation, base level).
  const run = plan.cabinets
    .filter((c) => c.rotYDeg === rot && (c.yIn ?? 0) === 0)
    .map((c) => {
      const along = (c.xIn - f.xIn) * ax + (c.zIn - f.zIn) * az;
      return { c, a0: along - c.widthIn / 2, a1: along + c.widthIn / 2 };
    })
    .filter((e) => {
      // same run line: the cabinet's back sits on the fixture's wall line
      const r2 = (e.c.rotYDeg * Math.PI) / 180;
      const backX = e.c.xIn - Math.sin(r2) * ((e.c.depthIn ?? BASE_D) / 2);
      const backZ = e.c.zIn - Math.cos(r2) * ((e.c.depthIn ?? BASE_D) / 2);
      return Math.abs((backX - f.xIn) * -az + (backZ - f.zIn) * ax) < 1;
    })
    .sort((a, b) => a.a0 - b.a0);
  let edge = side * half;
  let total = 0;
  for (let guard = 0; guard < 50; guard++) {
    const next = run.find((e) => (side > 0 ? Math.abs(e.a0 - edge) < 0.6 : Math.abs(e.a1 - edge) < 0.6));
    if (!next || !next.c.hasCounter || next.c.type === "counter_span" && next.c.skuPrefix === "BC") {
      // the corner box counts as counter but nothing beyond it on this run
      if (next && next.c.hasCounter) total += next.c.widthIn;
      break;
    }
    total += next.c.widthIn;
    edge = side > 0 ? next.a1 : next.a0;
  }
  return Math.round(total * 100) / 100;
}

/* ------------------------------------------------------------------ schedule */

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
  appliances: string[];
}

const ROLE_LABELS: Record<CabinetType, string> = {
  base: "Base cabinet",
  drawer_base: "3-drawer base",
  sink_base: "Sink base",
  wall: "Wall cabinet",
  tall: "Tall pantry",
  vanity: "Bath vanity",
  linen_tower: "Linen tower",
  filler: "Filler strip",
  end_panel: "Finished end panel",
  counter_span: "Counter only",
};

function fmtIn(n: number) {
  const q = Math.round(n * 4) / 4;
  const whole = Math.floor(q);
  const frac = q - whole;
  return `${whole}${frac === 0.25 ? "¼" : frac === 0.5 ? "½" : frac === 0.75 ? "¾" : ""}"`;
}

/** Cabinet schedule for the cabinet list and the quote request. */
export function summarizePlan(plan: PlannedRoom): LayoutScheduleSummary {
  const ws = DIMS.wallHeightsByCeilingIn[plan.ceiling];
  const grouped = new Map<string, LayoutScheduleItem>();
  let stackedUpperCount = 0;
  let moldingRuns = 0;
  let cabinetCount = 0;
  const add = (key: string, item: Omit<LayoutScheduleItem, "quantity">) => {
    const ex = grouped.get(key);
    if (ex) ex.quantity += 1;
    else grouped.set(key, { ...item, quantity: 1 });
  };
  for (const c of plan.cabinets) {
    if (c.type === "counter_span") continue;
    const h = c.type === "wall" && c.stackable ? ws.mainWallIn : cabinetHeightIn(c, plan.ceiling);
    const d = c.depthIn ?? (c.type === "wall" ? WALL_D : BASE_D);
    const role = c.skuPrefix.startsWith("WR") ? "Wall cabinet over fridge" : ROLE_LABELS[c.type];
    const dims = c.type === "filler" || c.type === "end_panel" ? `${fmtIn(c.widthIn)} W × ${fmtIn(h)} H` : `${fmtIn(c.widthIn)} W × ${fmtIn(h)} H × ${fmtIn(d)} D`;
    add(`${c.skuPrefix}|${dims}|${role}`, { code: c.skuPrefix, role, dimensionsLabel: dims });
    if (c.type !== "filler" && c.type !== "end_panel") cabinetCount++;
    if (c.type === "wall" && c.stackable && ws.stackedUpperIn > 0) {
      stackedUpperCount++;
      const code = `WU${Math.round(c.widthIn)}${ws.stackedUpperIn}`;
      add(`STACK-${code}`, { code, role: "Stacked upper", dimensionsLabel: `${fmtIn(c.widthIn)} W × ${ws.stackedUpperIn}" H × ${fmtIn(d)} D` });
    }
    if (c.type === "wall" || c.type === "tall") moldingRuns++;
  }
  const appliances: string[] = [];
  for (const f of plan.fixtures) {
    if (f.kind === "fridge") appliances.push(`Refrigerator opening ${fmtIn((f.widthIn ?? 36) + 0.25)} W`);
    if (f.kind === "range") appliances.push(`Range opening ${fmtIn((f.widthIn ?? 30) + 0.125)} W`);
    if (f.kind === "dishwasher") appliances.push(`Dishwasher opening ${fmtIn((f.widthIn ?? 24) + 0.375)} W`);
  }
  return {
    cabinetCount,
    stackedUpperCount,
    moldingRuns,
    items: Array.from(grouped.values()).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })),
    appliances,
  };
}

/* ------------------------------------------------------------------ url */

/** Wall sizes as short URL parameters, e.g. back=144&side=108. */
export function wallsToParams(layoutId: LayoutId, walls: WallSizes): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of WALL_SPECS[layoutId]) {
    const v = walls[s.key];
    if (typeof v === "number") out[s.key] = String(v);
  }
  return out;
}

export function wallsFromParams(layoutId: LayoutId, get: (k: string) => string | null): Record<WallKey, number> {
  const raw: WallSizes = {};
  for (const s of WALL_SPECS[layoutId]) {
    const v = get(s.key);
    if (v !== null && v !== "" && Number.isFinite(Number(v))) raw[s.key] = Number(v);
  }
  return resolveWalls(layoutId, raw);
}

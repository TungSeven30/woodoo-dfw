import * as THREE from "three";
import { CabinetPanelSpec } from "./cabinet-generator";

export interface MorphPair {
  id: string;
  partCode: string;
  category: CabinetPanelSpec["category"];
  geometryKindFrom: CabinetPanelSpec["geometryKind"];
  geometryKindTo: CabinetPanelSpec["geometryKind"];
  materialZone: CabinetPanelSpec["materialZone"];
  sizeFrom: [number, number, number];
  sizeTo: [number, number, number];
  posFrom: [number, number, number];
  posTo: [number, number, number];
  quatFrom: [number, number, number, number];
  quatTo: [number, number, number, number];
  /** Vertical arc height in meters for collision-avoiding curved flight */
  arcHeight: number;
  /** Lateral arc bend in meters so passing panels keep clean sightlines */
  arcSide: number;
  /** Normalized stagger start [0..0.4] */
  staggerStart: number;
  /** Normalized duration [0.45..0.65] */
  duration: number;
  /** Whether this panel exits offscreen (fade out at end) or enters from offscreen (fade in at start) */
  mode: "morph" | "enter" | "exit";
  hingeSideTo: "left" | "right" | null;
}

/**
 * Exact Kuhn-Munkres (Hungarian) Algorithm for minimum-cost bipartite matching.
 * Given an N x M rectangular cost matrix (N <= M padded to square), returns assignment row -> col.
 */
export function solveHungarian(cost: number[][]): number[] {
  const nRows = cost.length;
  if (nRows === 0) return [];
  const nCols = cost[0].length;
  const n = Math.max(nRows, nCols);

  // Build 1-indexed padded square matrix
  const a: number[][] = Array.from({ length: n + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => {
      if (i === 0 || j === 0) return 0;
      if (i <= nRows && j <= nCols) return cost[i - 1][j - 1];
      return 0;
    })
  );

  const u = new Float64Array(n + 1);
  const v = new Float64Array(n + 1);
  const p = new Int32Array(n + 1);
  const way = new Int32Array(n + 1);

  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Float64Array(n + 1).fill(Infinity);
    const used = new Uint8Array(n + 1);

    do {
      used[j0] = 1;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;

      for (let j = 1; j <= n; j++) {
        if (!used[j]) {
          const cur = a[i0][j] - u[i0] - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
      }

      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);

    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  const assignment = new Array<number>(nRows).fill(-1);
  for (let j = 1; j <= n; j++) {
    if (p[j] >= 1 && p[j] <= nRows && j <= nCols) {
      assignment[p[j] - 1] = j - 1;
    }
  }
  return assignment;
}

function panelDistance(a: [number, number, number], b: [number, number, number]): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function sizeDiff(a: [number, number, number], b: [number, number, number]): number {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}

function categoryGroup(cat: CabinetPanelSpec["category"]): number {
  switch (cat) {
    case "door":
      return 0;
    case "drawer":
      return 0; // doors and drawer fronts share the same front-panel family cleanly
    case "carcass":
      return 1;
    case "shelf":
      return 1;
    case "back":
      return 2;
    case "toekick":
      return 3;
    case "molding":
      return 4;
    case "counter":
      return 5;
    case "hardware":
      return 6;
  }
}

/**
 * Computes an optimal, collision-avoiding panel morph plan from Layout A -> Layout B
 * using exact Hungarian assignment per material zone, with altitude-stratified flight lanes.
 */
export function buildLayoutMorph(
  fromPanels: CabinetPanelSpec[],
  toPanels: CabinetPanelSpec[]
): MorphPair[] {
  const zones: CabinetPanelSpec["materialZone"][] = ["wood", "interior", "counter", "metal"];
  const pairs: MorphPair[] = [];

  for (const zone of zones) {
    const src = fromPanels.filter((p) => p.materialZone === zone);
    const dst = toPanels.filter((p) => p.materialZone === zone);

    const matchedDst = new Set<number>();
    const matchedSrc = new Set<number>();

    if (src.length > 0 && dst.length > 0) {
      // Build rectangular cost matrix (src x dst)
      const cost: number[][] = src.map((a) =>
        dst.map((b) => {
          const catPenalty =
            a.category === b.category
              ? 0
              : categoryGroup(a.category) === categoryGroup(b.category)
                ? 2.2
                : 14.0;
          const dimCost = sizeDiff(a.size, b.size) * 4.5;
          const spatialCost = panelDistance(a.assembledPos, b.assembledPos) * 1.1;
          return catPenalty + dimCost + spatialCost;
        })
      );

      const assign = solveHungarian(cost);
      assign.forEach((dstIdx, srcIdx) => {
        if (dstIdx >= 0 && dstIdx < dst.length && cost[srcIdx][dstIdx] < 13.5) {
          matchedSrc.add(srcIdx);
          matchedDst.add(dstIdx);
          const a = src[srcIdx];
          const b = dst[dstIdx];
          const travel = panelDistance(a.assembledPos, b.assembledPos);
          // Stratify altitude lanes by panel category + deterministic hash so crossing panels pass cleanly over/under
          const laneTier =
            b.category === "counter"
              ? 1.55
              : b.category === "molding"
                ? 1.35
                : b.category === "door" || b.category === "drawer"
                  ? 0.9 + ((srcIdx % 4) * 0.14)
                  : 0.45 + ((srcIdx % 4) * 0.12);
          const arcHeight = travel < 0.08 ? 0.05 : Math.min(1.9, laneTier + travel * 0.18);
          const arcSide = ((srcIdx % 2 === 0 ? 1 : -1) * Math.min(0.45, travel * 0.14));
          const staggerStart = Math.min(0.36, (b.waveOrder * 0.24) + (b.dockOrder * 0.12));

          pairs.push({
            id: `M-${a.id}->${b.id}`,
            partCode: b.partCode,
            category: b.category,
            geometryKindFrom: a.geometryKind,
            geometryKindTo: b.geometryKind,
            materialZone: zone,
            sizeFrom: a.size,
            sizeTo: b.size,
            posFrom: a.assembledPos,
            posTo: b.assembledPos,
            quatFrom: a.assembledQuat,
            quatTo: b.assembledQuat,
            arcHeight,
            arcSide,
            staggerStart,
            duration: 0.56,
            mode: "morph",
            hingeSideTo: b.hingeSide,
          });
        }
      });
    }

    // Unmatched source panels cleanly fold out to off-screen flat-pack stacks
    src.forEach((a, srcIdx) => {
      if (matchedSrc.has(srcIdx)) return;
      const exitX = a.assembledPos[0] < 0 ? -5.8 : 5.8;
      const exitPos: [number, number, number] = [exitX, 0.25 + (srcIdx % 12) * 0.03, a.assembledPos[2] - 0.6];
      pairs.push({
        id: `EXIT-${a.id}`,
        partCode: a.partCode,
        category: a.category,
        geometryKindFrom: a.geometryKind,
        geometryKindTo: a.geometryKind,
        materialZone: zone,
        sizeFrom: a.size,
        sizeTo: a.size,
        posFrom: a.assembledPos,
        posTo: exitPos,
        quatFrom: a.assembledQuat,
        quatTo: a.flatQuat,
        arcHeight: 0.55 + (srcIdx % 4) * 0.15,
        arcSide: a.assembledPos[0] < 0 ? -0.35 : 0.35,
        staggerStart: Math.min(0.25, a.waveOrder * 0.2),
        duration: 0.45,
        mode: "exit",
        hingeSideTo: null,
      });
    });

    // Unmatched destination panels fly in from off-screen flat-pack stacks
    dst.forEach((b, dstIdx) => {
      if (matchedDst.has(dstIdx)) return;
      const enterX = b.assembledPos[0] < 0 ? -5.8 : 5.8;
      const enterPos: [number, number, number] = [enterX, 0.25 + (dstIdx % 12) * 0.03, b.assembledPos[2] - 0.6];
      pairs.push({
        id: `ENTER-${b.id}`,
        partCode: b.partCode,
        category: b.category,
        geometryKindFrom: b.geometryKind,
        geometryKindTo: b.geometryKind,
        materialZone: zone,
        sizeFrom: b.size,
        sizeTo: b.size,
        posFrom: enterPos,
        posTo: b.assembledPos,
        quatFrom: b.flatQuat,
        quatTo: b.assembledQuat,
        arcHeight: 0.75 + (dstIdx % 4) * 0.16,
        arcSide: b.assembledPos[0] < 0 ? -0.3 : 0.3,
        staggerStart: 0.18 + Math.min(0.28, b.waveOrder * 0.2 + b.dockOrder * 0.08),
        duration: 0.52,
        mode: "enter",
        hingeSideTo: b.hingeSide,
      });
    });
  }

  return pairs;
}

/**
 * Fast-out, slow-in flight easing with a single crisp, high-damping overshoot on dock.
 * Matches Section 8 Motion Language ("fast-out, slow-in curve with a small, damped overshoot").
 */
export function easeDockSpring(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  // Base fast-out slow-in cubic/quartic blend
  const inv = 1 - t;
  const base = 1 - inv * inv * inv;
  // Subtle single damped settle oscillation only in final 28% (peak overshoot ~1.8%)
  if (t > 0.72) {
    const u = (t - 0.72) / 0.28;
    const damp = Math.exp(-5.5 * u) * Math.sin(u * Math.PI * 1.4) * 0.022;
    return base + damp;
  }
  return base;
}

const _p0 = new THREE.Vector3();
const _p1 = new THREE.Vector3();
const _p2 = new THREE.Vector3();
const _p3 = new THREE.Vector3();
const _qA = new THREE.Quaternion();
const _qB = new THREE.Quaternion();

/**
 * Evaluates a panel's curved cubic-Bézier flight transform & scale at normalized local progress u in [0, 1].
 */
export function evalCurvedFlight(
  posFrom: [number, number, number],
  posTo: [number, number, number],
  quatFrom: [number, number, number, number],
  quatTo: [number, number, number, number],
  arcHeight: number,
  arcSide: number,
  rawU: number,
  outPos: THREE.Vector3,
  outQuat: THREE.Quaternion
): void {
  const u = Math.max(0, Math.min(1, rawU));
  const e = easeDockSpring(u);
  const clampedE = Math.max(0, Math.min(1.03, e));

  _p0.set(posFrom[0], posFrom[1], posFrom[2]);
  _p3.set(posTo[0], posTo[1], posTo[2]);

  // Midpoint lift arc so moving panels never drag across counters or collide at cabinet elevation
  const midY = Math.max(_p0.y, _p3.y) + arcHeight;
  _p1.set(
    THREE.MathUtils.lerp(_p0.x, _p3.x, 0.33) + arcSide * 0.7,
    THREE.MathUtils.lerp(_p0.y, midY, 0.85),
    THREE.MathUtils.lerp(_p0.z, _p3.z, 0.33) + arcSide * 0.4
  );
  _p2.set(
    THREE.MathUtils.lerp(_p0.x, _p3.x, 0.68) + arcSide * 0.5,
    THREE.MathUtils.lerp(_p3.y, midY, 0.8),
    THREE.MathUtils.lerp(_p0.z, _p3.z, 0.68) - arcSide * 0.2
  );

  // Cubic Bézier evaluation
  const t = Math.max(0, Math.min(1, clampedE));
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  outPos.set(
    mt2 * mt * _p0.x + 3 * mt2 * t * _p1.x + 3 * mt * t2 * _p2.x + t2 * t * _p3.x,
    mt2 * mt * _p0.y + 3 * mt2 * t * _p1.y + 3 * mt * t2 * _p2.y + t2 * t * _p3.y,
    mt2 * mt * _p0.z + 3 * mt2 * t * _p1.z + 3 * mt * t2 * _p2.z + t2 * t * _p3.z
  );

  // Add subtle mechanical dock settle along final arrival vector during overshoot
  if (e > 1) {
    const over = e - 1;
    outPos.y -= over * 0.08;
  }

  _qA.set(quatFrom[0], quatFrom[1], quatFrom[2], quatFrom[3]);
  _qB.set(quatTo[0], quatTo[1], quatTo[2], quatTo[3]);
  outQuat.copy(_qA).slerp(_qB, Math.max(0, Math.min(1, t)));
}

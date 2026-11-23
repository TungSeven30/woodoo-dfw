import * as THREE from "three";
import {
  CeilingHeightFt,
  CollectionSlug,
  FinishSlug,
  LayoutId,
  SITE_CONFIG,
} from "@/config/site";
import { CabinetPlacement, ROOM_LAYOUTS } from "@/config/layouts";

export const IN_TO_M = 0.0254;
export const MM_TO_M = 0.001;
/** Confirmed exact frameless reveal between adjacent full-overlay doors & drawers */
export const REVEAL_M = SITE_CONFIG.PLACEHOLDER_DIMS.confirmedRevealMm * MM_TO_M; // 0.002 m

export type PanelCategory =
  | "carcass"
  | "back"
  | "shelf"
  | "door"
  | "drawer"
  | "toekick"
  | "molding"
  | "counter"
  | "hardware";

export type PanelGeometryKind =
  | "box"
  | "door-traditional-shaker"
  | "door-slim-shaker"
  | "door-flat"
  | "hardware-pin"
  | "hardware-hinge";

export interface CabinetPanelSpec {
  id: string;
  partCode: string;
  cabinetId: string;
  category: PanelCategory;
  geometryKind: PanelGeometryKind;
  /** Width (X), Height (Y), Depth (Z) in meters in the panel's local coordinate frame */
  size: [number, number, number];
  /** World assembled center position in meters */
  assembledPos: [number, number, number];
  /** World assembled quaternion [x, y, z, w] */
  assembledQuat: [number, number, number, number];
  /** Flat-pack resting center position in meters (stacked horizontally along Y) */
  flatPos: [number, number, number];
  /** Flat-pack resting quaternion [x, y, z, w] */
  flatQuat: [number, number, number, number];
  /** Sequence order inside cabinet assembly [0..1] */
  dockOrder: number;
  /** Wave delay for multi-cabinet rooms [0..1] */
  waveOrder: number;
  /** Hinge side for animated opening in Scenes 4 & 8 */
  hingeSide: "left" | "right" | null;
  /** Interior shelf index (0, 1, ...) for vertical re-spacing animation in Scene 4 */
  shelfIndex: number | null;
  /** Material zone: wood veneer exterior, satin maple interior, honed stone counter, or brushed steel hardware */
  materialZone: "wood" | "interior" | "counter" | "metal";
  /** Altitude lane offset in meters to prevent visible flight collisions */
  laneOffset: number;
  /** Whether this panel belongs to the primary hero cabinet (Scenes 0-4) */
  isHeroCabinet?: boolean;
}

const _v = new THREE.Vector3();
const _qCab = new THREE.Quaternion();
const _qLocal = new THREE.Quaternion();
const _qFinal = new THREE.Quaternion();
const _euler = new THREE.Euler();

function doorGeometryForCollection(col: CollectionSlug): PanelGeometryKind {
  if (col === "traditional-shaker") return "door-traditional-shaker";
  if (col === "slim-shaker") return "door-slim-shaker";
  return "door-flat";
}

function toWorld(
  cabPos: [number, number, number],
  cabRotYRad: number,
  localPos: [number, number, number],
  localEuler?: [number, number, number]
): { pos: [number, number, number]; quat: [number, number, number, number] } {
  _qCab.setFromAxisAngle(new THREE.Vector3(0, 1, 0), cabRotYRad);
  _v.set(localPos[0], localPos[1], localPos[2]).applyQuaternion(_qCab);
  _v.x += cabPos[0];
  _v.y += cabPos[1];
  _v.z += cabPos[2];
  if (localEuler) {
    _euler.set(localEuler[0], localEuler[1], localEuler[2]);
    _qLocal.setFromEuler(_euler);
    _qFinal.copy(_qCab).multiply(_qLocal);
  } else {
    _qFinal.copy(_qCab);
  }
  return {
    pos: [_v.x, _v.y, _v.z],
    quat: [_qFinal.x, _qFinal.y, _qFinal.z, _qFinal.w],
  };
}

/**
 * Generates all component panels for a single parametric frameless cabinet.
 * Uses exact 2.0 mm full-overlay reveal and zero face frame / zero center stile.
 */
export function generateCabinetPanels(
  placement: CabinetPlacement,
  collection: CollectionSlug,
  ceilingFt: CeilingHeightFt,
  options: {
    waveOrder?: number;
    mergeSmallParts?: boolean;
    isHeroCabinet?: boolean;
    flatPackOrigin?: [number, number, number];
  } = {}
): CabinetPanelSpec[] {
  const dims = SITE_CONFIG.PLACEHOLDER_DIMS;
  const T = dims.carcassThicknessMm * MM_TO_M; // 0.019 m
  const BACK_T = dims.backPanelThicknessMm * MM_TO_M; // 0.006 m
  const DOOR_T = 0.019;
  const MOLD_H = dims.confirmedMoldingInches * IN_TO_M; // 0.0762 m (confirmed 3-inch molding)
  const TK_H = dims.toeKickHeightIn * IN_TO_M; // 0.1143 m
  const TK_RECESS = dims.toeKickRecessIn * IN_TO_M; // 0.08255 m

  const wallSpec = dims.wallHeightsByCeilingIn[ceilingFt];
  const ceilingM = dims.ceilingHeightsIn[ceilingFt] * IN_TO_M;

  const wM = placement.widthIn * IN_TO_M;
  const isBaseLike =
    placement.type === "base" ||
    placement.type === "drawer_base" ||
    placement.type === "sink_base" ||
    placement.type === "vanity" ||
    placement.type === "filler";
  const isWall = placement.type === "wall";
  const isTall = placement.type === "tall" || placement.type === "linen_tower";

  let hIn = placement.heightIn;
  if (!hIn) {
    if (isBaseLike) hIn = dims.baseHeightIn;
    else if (isWall) hIn = wallSpec.mainWallIn;
    else if (placement.type === "linen_tower") hIn = Math.min(84, dims.ceilingHeightsIn[ceilingFt] - 6);
    else if (isTall) hIn = dims.ceilingHeightsIn[ceilingFt] - dims.confirmedMoldingInches;
    else hIn = dims.baseHeightIn;
  }

  let dIn = placement.depthIn;
  if (!dIn) {
    if (isWall) dIn = dims.wallDepthIn;
    else if (placement.type === "vanity" || placement.type === "linen_tower") dIn = dims.vanityDepthIn;
    else dIn = dims.baseDepthIn;
  }

  const hM = hIn * IN_TO_M;
  const dM = dIn * IN_TO_M;
  const rotY = (placement.rotYDeg * Math.PI) / 180;
  const cabPos: [number, number, number] = [
    placement.xIn * IN_TO_M,
    (placement.yIn ?? 0) * IN_TO_M,
    placement.zIn * IN_TO_M,
  ];
  const waveOrder = options.waveOrder ?? 0;
  const mergeSmall = Boolean(options.mergeSmallParts);
  const doorKind = doorGeometryForCollection(collection);
  const panels: CabinetPanelSpec[] = [];

  const addPanel = (
    suffix: string,
    category: PanelCategory,
    geometryKind: PanelGeometryKind,
    size: [number, number, number],
    localPos: [number, number, number],
    dockOrder: number,
    extra: Partial<CabinetPanelSpec> = {}
  ) => {
    const { pos, quat } = toWorld(cabPos, rotY, localPos);
    panels.push({
      id: `${placement.id}-${suffix}`,
      partCode: `${placement.skuPrefix}-${suffix}`,
      cabinetId: placement.id,
      category,
      geometryKind,
      size,
      assembledPos: pos,
      assembledQuat: quat,
      flatPos: [0, 0, 0],
      flatQuat: [0, 0, 0, 1],
      dockOrder,
      waveOrder,
      hingeSide: extra.hingeSide ?? null,
      shelfIndex: extra.shelfIndex ?? null,
      materialZone: extra.materialZone ?? "wood",
      laneOffset: 0.25 + dockOrder * 1.1,
      isHeroCabinet: options.isHeroCabinet,
    });
  };

  // Filler strip (simple solid finished face + side return)
  if (placement.type === "filler") {
    const bodyH = hM - TK_H;
    addPanel(
      "FILL",
      "carcass",
      "box",
      [wM - REVEAL_M, bodyH, DOOR_T],
      [0, TK_H + bodyH / 2, dM / 2 + DOOR_T / 2],
      0.55,
      { materialZone: "wood" }
    );
    addPanel(
      "TK",
      "toekick",
      "box",
      [wM, TK_H, T],
      [0, TK_H / 2, dM / 2 - TK_RECESS],
      0.35,
      { materialZone: "wood" }
    );
    if (placement.hasCounter) {
      const cH = dims.countertopThicknessIn * IN_TO_M;
      const cOver = dims.countertopOverhangIn * IN_TO_M;
      addPanel(
        "CTR",
        "counter",
        "box",
        [wM + 0.004, cH, dM + cOver + DOOR_T],
        [0, hM + cH / 2, (cOver + DOOR_T) / 2],
        0.95,
        { materialZone: "counter" }
      );
    }
    return assignFlatPackStack(panels, options.flatPackOrigin ?? [cabPos[0], 0, cabPos[2]]);
  }

  // Box height above toe kick (wall boxes start at y = 0 local)
  const bottomElev = isWall ? 0 : TK_H;
  const boxH = hM - bottomElev;
  const innerW = Math.max(0.06, wM - 2 * T);
  const innerD = Math.max(0.1, dM - BACK_T - 0.012);

  // 1. Carcass Left & Right Sides (factory-finished exterior sides!)
  addPanel(
    "SIDE-L",
    "carcass",
    "box",
    [T, boxH, dM],
    [-wM / 2 + T / 2, bottomElev + boxH / 2, 0],
    0.06,
    { materialZone: "wood" }
  );
  addPanel(
    "SIDE-R",
    "carcass",
    "box",
    [T, boxH, dM],
    [wM / 2 - T / 2, bottomElev + boxH / 2, 0],
    0.11,
    { materialZone: "wood" }
  );

  // 2. Carcass Bottom Deck & Top Panel/Stretcher
  addPanel(
    "BOT",
    "carcass",
    "box",
    [innerW, T, dM - 0.004],
    [0, bottomElev + T / 2, 0],
    0.16,
    { materialZone: "interior" }
  );
  addPanel(
    "TOP",
    "carcass",
    "box",
    [innerW, T, isBaseLike ? 0.14 : dM - 0.004],
    [0, bottomElev + boxH - T / 2, isBaseLike ? -dM / 2 + 0.08 : 0],
    0.2,
    { materialZone: "interior" }
  );
  if (isBaseLike) {
    addPanel(
      "STR-F",
      "carcass",
      "box",
      [innerW, T, 0.09],
      [0, bottomElev + boxH - T / 2, dM / 2 - 0.055],
      0.22,
      { materialZone: "interior" }
    );
  }

  // 3. Recessed Back Panel (slides into carcass dado groove in Scene 2; factory-finished wood on exposed galley/peninsula backs)
  const exposedBack = Math.abs(placement.rotYDeg) === 180;
  addPanel(
    "BACK",
    "back",
    "box",
    [exposedBack ? wM - 0.002 : innerW + 0.008, exposedBack ? boxH : boxH - 2 * T + 0.008, exposedBack ? T : BACK_T],
    [0, bottomElev + boxH / 2, exposedBack ? -dM / 2 + T / 2 : -dM / 2 + BACK_T / 2 + 0.008],
    0.28,
    { materialZone: exposedBack ? "wood" : "interior" }
  );

  // 4. Recessed Toe Kick Plinth (base, vanity, tall)
  if (!isWall) {
    addPanel(
      "TK",
      "toekick",
      "box",
      [wM - 0.001, TK_H, T],
      [0, TK_H / 2, dM / 2 - TK_RECESS],
      0.36,
      { materialZone: "wood" }
    );
  }

  // 5. Interior Shelves (full access, no center stile!) + stylized pins on hero/Tier A
  const shelfCount =
    placement.type === "drawer_base"
      ? 0
      : placement.type === "tall" || placement.type === "linen_tower"
        ? 4
        : isWall
          ? 2
          : options.isHeroCabinet
            ? 2
            : 1;

  for (let i = 0; i < shelfCount; i++) {
    const frac = (i + 1) / (shelfCount + 1);
    const shelfY = bottomElev + T + frac * (boxH - 2 * T - (placement.drawers ? 0.16 : 0));
    addPanel(
      `SHLF-${i + 1}`,
      "shelf",
      "box",
      [innerW - 0.004, T, innerD - 0.02],
      [0, shelfY, -0.008],
      0.46 + i * 0.04,
      { materialZone: "interior", shelfIndex: i }
    );

    if (options.isHeroCabinet && !mergeSmall) {
      // Stylized metallic shelf pins visible during Scene 2 & Scene 4
      const pinOffsets: Array<[number, number]> = [
        [-innerW / 2 + 0.004, -innerD / 2 + 0.08],
        [-innerW / 2 + 0.004, innerD / 2 - 0.08],
        [innerW / 2 - 0.004, -innerD / 2 + 0.08],
        [innerW / 2 - 0.004, innerD / 2 - 0.08],
      ];
      pinOffsets.forEach(([px, pz], idx) => {
        addPanel(
          `PIN-${i + 1}${idx + 1}`,
          "hardware",
          "hardware-pin",
          [0.012, 0.008, 0.008],
          [px, shelfY - T / 2 - 0.004, pz],
          0.42 + i * 0.02,
          { materialZone: "metal" }
        );
      });
    }
  }

  // 6. Full-Overlay Fronts (EXACT 2.0 mm reveal!)
  const frontZ = dM / 2 + DOOR_T / 2 + 0.0015; // 1.5 mm bumper stand-off off carcass face
  const totalFrontW = wM - REVEAL_M; // 1 mm inset each side => 2.0 mm gap between neighboring boxes

  if (placement.type === "drawer_base") {
    const count = placement.drawers ?? 3;
    // Standard European 3-drawer proportion: top shallow (22%), middle (39%), bottom deep (39%)
    const ratios =
      count === 3 ? [0.22, 0.39, 0.39] : Array.from({ length: count }, () => 1 / count);
    const usableH = boxH - (count - 1) * REVEAL_M;
    let cursorY = bottomElev + boxH;
    ratios.forEach((ratio, idx) => {
      const dh = usableH * ratio;
      const centerY = cursorY - dh / 2;
      addPanel(
        `DRW-${idx + 1}`,
        "drawer",
        doorKind,
        [totalFrontW, dh, DOOR_T],
        [0, centerY, frontZ],
        0.72 + idx * 0.06,
        { materialZone: "wood" }
      );
      cursorY -= dh + REVEAL_M;
    });
  } else if (isTall) {
    // Tall pantry / linen tower: lower tall section (42%) + upper section (58%) split by exact 2.0 mm reveal
    const lowerH = (boxH - REVEAL_M) * 0.42;
    const upperH = boxH - REVEAL_M - lowerH;
    const numDoors = placement.doors ?? 2;
    const eachW = numDoors === 2 ? (wM - 2 * REVEAL_M) / 2 : totalFrontW;
    const xOffsets = numDoors === 2 ? [-wM / 4, wM / 4] : [0];

    xOffsets.forEach((ox, di) => {
      const side: "left" | "right" = numDoors === 2 ? (di === 0 ? "left" : "right") : "left";
      addPanel(
        `DR-LO-${di === 0 ? "L" : "R"}`,
        "door",
        doorKind,
        [eachW, lowerH, DOOR_T],
        [ox, bottomElev + lowerH / 2, frontZ],
        0.74 + di * 0.05,
        { materialZone: "wood", hingeSide: side }
      );
      addPanel(
        `DR-HI-${di === 0 ? "L" : "R"}`,
        "door",
        doorKind,
        [eachW, upperH, DOOR_T],
        [ox, bottomElev + lowerH + REVEAL_M + upperH / 2, frontZ],
        0.82 + di * 0.05,
        { materialZone: "wood", hingeSide: side }
      );
    });
  } else {
    // Base, Sink Base, Vanity, Wall
    const hasTopDrawer =
      (placement.type === "base" && (placement.drawers ?? 0) > 0) ||
      placement.type === "sink_base";
    const topDrawerH = hasTopDrawer ? 0.155 : 0; // ~6.1" top drawer / false front
    const doorAreaH = hasTopDrawer ? boxH - topDrawerH - REVEAL_M : boxH;

    if (hasTopDrawer) {
      addPanel(
        placement.type === "sink_base" ? "APRON" : "DRW-1",
        "drawer",
        doorKind,
        [totalFrontW, topDrawerH, DOOR_T],
        [0, bottomElev + boxH - topDrawerH / 2, frontZ],
        0.72,
        { materialZone: "wood" }
      );
    }

    const numDoors = placement.doors ?? (placement.widthIn >= 24 ? 2 : 1);
    const eachW = numDoors === 2 ? (wM - 2 * REVEAL_M) / 2 : totalFrontW;
    const xOffsets = numDoors === 2 ? [-wM / 4, wM / 4] : [0];

    xOffsets.forEach((ox, di) => {
      const side: "left" | "right" = numDoors === 2 ? (di === 0 ? "left" : "right") : "left";
      if (options.isHeroCabinet && !mergeSmall) {
        // Stylized concealed European cup hinges seated before doors swing on
        const hx = side === "left" ? -wM / 2 + T + 0.01 : wM / 2 - T - 0.01;
        [0.18, 0.82].forEach((hyFrac, hi) => {
          addPanel(
            `HNG-${di === 0 ? "L" : "R"}${hi + 1}`,
            "hardware",
            "hardware-hinge",
            [0.022, 0.048, 0.036],
            [hx, bottomElev + doorAreaH * hyFrac, dM / 2 - 0.022],
            0.62 + di * 0.03 + hi * 0.02,
            { materialZone: "metal" }
          );
        });
      }

      addPanel(
        `DR-${di === 0 ? "L" : "R"}`,
        "door",
        doorKind,
        [eachW, doorAreaH, DOOR_T],
        [ox, bottomElev + doorAreaH / 2, frontZ],
        0.78 + di * 0.06,
        { materialZone: "wood", hingeSide: side }
      );
    });
  }

  // 7. Stacked Upper Wall Box for 9 ft and 10 ft Ceilings + Confirmed 3-inch Crown Molding
  if (isWall && placement.stackable && wallSpec.stackedUpperIn > 0) {
    const stackH = wallSpec.stackedUpperIn * IN_TO_M;
    const stackBaseY = boxH + REVEAL_M;
    const stackInnerW = Math.max(0.06, wM - 2 * T);
    addPanel(
      "UPR-L",
      "carcass",
      "box",
      [T, stackH, dM],
      [-wM / 2 + T / 2, stackBaseY + stackH / 2, 0],
      0.86,
      { materialZone: "wood" }
    );
    addPanel(
      "UPR-R",
      "carcass",
      "box",
      [T, stackH, dM],
      [wM / 2 - T / 2, stackBaseY + stackH / 2, 0],
      0.87,
      { materialZone: "wood" }
    );
    addPanel(
      "UPR-B",
      "carcass",
      "box",
      [stackInnerW, T, dM - 0.004],
      [0, stackBaseY + T / 2, 0],
      0.88,
      { materialZone: "interior" }
    );
    addPanel(
      "UPR-T",
      "carcass",
      "box",
      [stackInnerW, T, dM - 0.004],
      [0, stackBaseY + stackH - T / 2, 0],
      0.88,
      { materialZone: "interior" }
    );
    const numDoors = placement.doors ?? 2;
    const eachW = numDoors === 2 ? (wM - 2 * REVEAL_M) / 2 : totalFrontW;
    const xOffsets = numDoors === 2 ? [-wM / 4, wM / 4] : [0];
    xOffsets.forEach((ox, di) => {
      addPanel(
        `UPR-DR-${di === 0 ? "L" : "R"}`,
        "door",
        doorKind,
        [eachW, stackH, DOOR_T],
        [ox, stackBaseY + stackH / 2, frontZ],
        0.9 + di * 0.02,
        { materialZone: "wood", hingeSide: di === 0 ? "left" : "right" }
      );
    });
  }

  // Confirmed 3-inch crown molding crowning wall & tall cabinets up to ceiling
  if (isWall || placement.type === "tall") {
    const topOfBoxY =
      isWall && placement.stackable && wallSpec.stackedUpperIn > 0
        ? boxH + REVEAL_M + wallSpec.stackedUpperIn * IN_TO_M
        : boxH;
    const moldingY = Math.min(
      topOfBoxY + MOLD_H / 2,
      ceilingM - cabPos[1] - MOLD_H / 2 + 0.002
    );
    addPanel(
      "CRN-3IN",
      "molding",
      "box",
      [wM + 0.002, MOLD_H, dM + DOOR_T + 0.018],
      [0, moldingY, (DOOR_T + 0.018) / 2],
      0.94,
      { materialZone: "wood" }
    );
  }

  // Honed quartzite countertop slab above counter-bearing bases/vanities
  if (placement.hasCounter) {
    const cH = dims.countertopThicknessIn * IN_TO_M;
    const cOver = dims.countertopOverhangIn * IN_TO_M;
    addPanel(
      "CTR",
      "counter",
      "box",
      [wM + 0.003, cH, dM + cOver + DOOR_T],
      [0, hM + cH / 2, (cOver + DOOR_T) / 2],
      0.97,
      { materialZone: "counter" }
    );
  }

  return assignFlatPackStack(
    panels,
    options.flatPackOrigin ?? [cabPos[0], 0, cabPos[2]]
  );
}

/**
 * Arranges a cabinet's panels into a tight, architectural flat-pack stack ("sliced loaf of material")
 * sorted largest footprint at bottom to crisp doors on top.
 */
function assignFlatPackStack(
  panels: CabinetPanelSpec[],
  origin: [number, number, number]
): CabinetPanelSpec[] {
  const flatQ = new THREE.Quaternion();
  const woodAndBoxes = panels.filter((p) => p.category !== "hardware");
  const hardware = panels.filter((p) => p.category === "hardware");

  const stackOrder = [...woodAndBoxes].sort((a, b) => {
    const areaA = a.size[0] * a.size[1] + a.size[0] * a.size[2] + a.size[1] * a.size[2];
    const areaB = b.size[0] * b.size[1] + b.size[0] * b.size[2] + b.size[1] * b.size[2];
    return areaB - areaA;
  });

  let cursorY = 0.02; // slight shadow plinth off floor
  for (const p of stackOrder) {
    const [sx, sy, sz] = p.size;
    // Rotate smallest axis onto world Y so every panel lies genuinely flat!
    let thickness = sy;
    if (sx <= sy && sx <= sz) {
      flatQ.setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
      thickness = sx;
    } else if (sz <= sx && sz <= sy) {
      flatQ.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
      thickness = sz;
    } else {
      flatQ.identity();
      thickness = sy;
    }

    p.flatPos = [origin[0], origin[1] + cursorY + thickness / 2, origin[2]];
    p.flatQuat = [flatQ.x, flatQ.y, flatQ.z, flatQ.w];
    cursorY += thickness + 0.004; // 4 mm crisp shadow reveal between stacked panels
  }

  // Lay metallic hinges & shelf pins cleanly side-by-side along the top architectural tray (never a vertical tower!)
  hardware.forEach((hw, idx) => {
    const col = idx % 6;
    const row = Math.floor(idx / 6);
    hw.flatPos = [
      origin[0] - 0.22 + col * 0.088,
      origin[1] + cursorY + 0.012,
      origin[2] - 0.06 + row * 0.09,
    ];
    hw.flatQuat = [0, 0, 0, 1];
  });

  return panels;
}

/**
 * Generates our signature Hero Base Cabinet (36" Traditional Shaker B36) centered at [0, 0, 0]
 * for Scenes 0 (single panel), 1 (flat-pack stack), 2 (flight & dock), 3 (2 mm reveal macro), and 4 (frameless interior).
 */
export function generateHeroCabinet(
  collection: CollectionSlug = "traditional-shaker",
  ceilingFt: CeilingHeightFt = 9,
  mergeSmallParts = false
): CabinetPanelSpec[] {
  const heroPlacement: CabinetPlacement = {
    id: "HERO-B36",
    skuPrefix: "B36",
    type: "base",
    widthIn: 36,
    heightIn: 34.5,
    depthIn: 24,
    xIn: 0,
    yIn: 0,
    zIn: 0,
    rotYDeg: 0,
    doors: 2,
    drawers: 1,
    hasCounter: false,
  };
  return generateCabinetPanels(heroPlacement, collection, ceilingFt, {
    waveOrder: 0,
    mergeSmallParts,
    isHeroCabinet: true,
    flatPackOrigin: [0, 0, 0],
  });
}

/**
 * Generates the complete panel list for any of the five room layouts.
 */
export function generateLayoutPanels(
  layoutId: LayoutId,
  collection: CollectionSlug,
  _finish: FinishSlug,
  ceilingFt: CeilingHeightFt,
  mergeSmallParts = false
): CabinetPanelSpec[] {
  const layout = ROOM_LAYOUTS[layoutId];
  const all: CabinetPanelSpec[] = [];

  // Order wave naturally: base/vanity runs -> tall pantry -> wall cabinets -> stacked uppers -> counters
  const priority = (t: CabinetPlacement["type"]) => {
    if (t === "base" || t === "drawer_base" || t === "sink_base" || t === "vanity" || t === "filler") return 0;
    if (t === "tall" || t === "linen_tower") return 1;
    return 2;
  };

  const sortedCabs = [...layout.cabinets].sort((a, b) => {
    const dp = priority(a.type) - priority(b.type);
    if (dp !== 0) return dp;
    return a.xIn - b.xIn;
  });

  const total = Math.max(1, sortedCabs.length - 1);
  sortedCabs.forEach((cab, idx) => {
    const waveOrder = idx / total;
    // Off-screen flat-pack staging origin to left or right wing depending on cabinet X
    const wingX = cab.xIn < 0 ? -4.2 : 4.2;
    const wingZ = cab.zIn * IN_TO_M * 0.5;
    const cabPanels = generateCabinetPanels(cab, collection, ceilingFt, {
      waveOrder,
      mergeSmallParts,
      flatPackOrigin: [wingX, 0, wingZ],
    });
    all.push(...cabPanels);
  });

  return all;
}

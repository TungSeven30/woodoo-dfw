import * as THREE from "three";
import { ROOM_LAYOUTS, type FixturePlacement } from "@/config/layouts";
import { SITE_CONFIG, type CeilingHeightFt, type LayoutId } from "@/config/site";

/**
 * Appliances, fixtures and plants that make a cabinet layout read as a lived-in room:
 * refrigerator, range and hood, sink and faucet, vessel basins, plants and a fruit bowl.
 * All sizes are in inches (converted to meters here). Simple shapes, few draw calls.
 */

const IN = 0.0254;
const COUNTER_TOP_IN =
  SITE_CONFIG.PLACEHOLDER_DIMS.baseHeightIn + SITE_CONFIG.PLACEHOLDER_DIMS.countertopThicknessIn;

export interface RoomPropMaterials {
  steel: THREE.MeshStandardMaterial;
  darkSteel: THREE.MeshStandardMaterial;
  blackGlass: THREE.MeshStandardMaterial;
  iron: THREE.MeshStandardMaterial;
  ceramic: THREE.MeshStandardMaterial;
  terracotta: THREE.MeshStandardMaterial;
  soil: THREE.MeshStandardMaterial;
  leaf: THREE.MeshStandardMaterial;
  stem: THREE.MeshStandardMaterial;
  porcelain: THREE.MeshStandardMaterial;
  fruit: THREE.MeshStandardMaterial;
}

export function createRoomPropMaterials(): RoomPropMaterials {
  return {
    steel: new THREE.MeshStandardMaterial({ color: "#b4b7b9", metalness: 0.9, roughness: 0.34 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: "#6f7376", metalness: 0.8, roughness: 0.36 }),
    blackGlass: new THREE.MeshStandardMaterial({ color: "#0c0c0d", metalness: 0.2, roughness: 0.12 }),
    iron: new THREE.MeshStandardMaterial({ color: "#1c1b1a", metalness: 0.45, roughness: 0.55 }),
    ceramic: new THREE.MeshStandardMaterial({ color: "#ebe5da", roughness: 0.55 }),
    terracotta: new THREE.MeshStandardMaterial({ color: "#b06f4f", roughness: 0.8 }),
    soil: new THREE.MeshStandardMaterial({ color: "#3a2c22", roughness: 1 }),
    leaf: new THREE.MeshStandardMaterial({ color: "#4f6d3b", roughness: 0.62, side: THREE.DoubleSide }),
    stem: new THREE.MeshStandardMaterial({ color: "#5c4a35", roughness: 0.9 }),
    porcelain: new THREE.MeshStandardMaterial({ color: "#f3f1ec", roughness: 0.22 }),
    fruit: new THREE.MeshStandardMaterial({ color: "#d98a2b", roughness: 0.48 }),
  };
}

export function setRoomPropEnvMap(mats: RoomPropMaterials, env: THREE.Texture | null): void {
  for (const m of Object.values(mats)) {
    if (m.envMap !== env) {
      m.envMap = env;
      m.envMapIntensity = 0.9;
      m.needsUpdate = true;
    }
  }
}

/** Small seeded random so plants look the same on every visit. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Builder {
  readonly group = new THREE.Group();
  constructor(readonly mats: RoomPropMaterials) {}

  /** Box sized and placed in inches; (x, y, z) is the box center. */
  box(mat: keyof RoomPropMaterials, w: number, h: number, d: number, x: number, y: number, z: number, shadow = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w * IN, h * IN, d * IN), this.mats[mat]);
    m.position.set(x * IN, y * IN, z * IN);
    m.castShadow = shadow;
    m.receiveShadow = true;
    this.group.add(m);
    return m;
  }

  cyl(mat: keyof RoomPropMaterials, rTop: number, rBottom: number, h: number, x: number, y: number, z: number, seg = 24, open = false) {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(rTop * IN, rBottom * IN, h * IN, seg, 1, open),
      this.mats[mat]
    );
    m.position.set(x * IN, y * IN, z * IN);
    m.castShadow = true;
    m.receiveShadow = true;
    this.group.add(m);
    return m;
  }
}

function buildFridge(b: Builder, w: number) {
  const h = 70;
  const d = 29;
  const gap = 0.25;
  b.box("steel", w, h - 1, d - 1.2, 0, h / 2 + 0.5, -0.6);
  const doorH = h * 0.6;
  const drawerH = h - doorH - 4;
  // French doors
  for (const side of [-1, 1]) {
    b.box("steel", w / 2 - gap, doorH, 1.2, side * (w / 4), h - doorH / 2, d / 2 - 0.6);
    b.cyl("darkSteel", 0.4, 0.4, doorH * 0.7, side * 1.6, h - doorH / 2, d / 2 + 1.1, 12);
  }
  // Freezer drawer
  b.box("steel", w - gap * 2, drawerH, 1.2, 0, drawerH / 2 + 3.5, d / 2 - 0.6);
  const bar = b.cyl("darkSteel", 0.4, 0.4, w * 0.7, 0, drawerH + 1.5, d / 2 + 1.1, 12);
  bar.rotation.z = Math.PI / 2;
  // Toe kick
  b.box("iron", w - 2, 3, 2, 0, 1.5, d / 2 - 3, false);
}

function buildRange(b: Builder, w: number) {
  const top = COUNTER_TOP_IN;
  const d = 25;
  b.box("steel", w, top - 1, d - 1, 0, (top - 1) / 2, -0.5);
  // Oven door with glass window and handle
  b.box("steel", w - 0.6, 22, 1, 0, 14, d / 2 - 0.2);
  b.box("blackGlass", w - 8, 11, 0.3, 0, 15, d / 2 + 0.4, false);
  const handle = b.cyl("darkSteel", 0.45, 0.45, w - 6, 0, 25.5, d / 2 + 1.6, 12);
  handle.rotation.z = Math.PI / 2;
  // Control strip and knobs
  b.box("steel", w, 5, 2, 0, top - 4, d / 2 - 0.2);
  for (let i = 0; i < 5; i++) {
    const k = b.cyl("iron", 0.8, 0.9, 1.2, -w / 2 + 4 + i * ((w - 8) / 4), top - 4, d / 2 + 1.2, 16);
    k.rotation.x = Math.PI / 2;
  }
  // Glass cooktop with cast-iron grates and burner caps
  b.box("blackGlass", w - 0.4, 0.6, d - 3, 0, top - 0.7, -1.5, false);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const gx = sx * (w / 4);
      const gz = -1.5 + sz * ((d - 3) / 4);
      b.box("iron", w / 2 - 1.4, 0.5, 0.5, gx, top + 0.3, gz, false);
      b.box("iron", 0.5, 0.5, (d - 3) / 2 - 1.4, gx, top + 0.3, gz, false);
      b.cyl("iron", 1.6, 1.8, 0.6, gx, top + 0.05, gz, 18);
    }
  }
}

function buildHood(b: Builder, w: number, ceilingIn: number) {
  const d = 20;
  const bottom = 66;
  // Canopy: a slim box with a tapered frustum on top
  b.box("steel", w, 3, d, 0, bottom + 1.5, 0);
  // A 4-sided cylinder turned 45° is a square frustum: full width at the bottom, ~70% at the top.
  const taperGeo = new THREE.CylinderGeometry(0.5, Math.SQRT1_2, 1, 4, 1);
  taperGeo.rotateY(Math.PI / 4);
  const taper = new THREE.Mesh(taperGeo, b.mats.steel);
  taper.scale.set(w * IN, 8 * IN, d * IN);
  taper.position.set(0, (bottom + 3 + 4) * IN, 0);
  taper.castShadow = true;
  b.group.add(taper);
  // Chimney up to the ceiling, set against the back
  const chimneyBottom = bottom + 11;
  const chimneyH = Math.max(6, ceilingIn - chimneyBottom);
  b.box("steel", 11, chimneyH, 10, 0, chimneyBottom + chimneyH / 2, -d / 2 + 5);
}

function buildSink(b: Builder, w: number) {
  const top = COUNTER_TOP_IN;
  // Undermount basin read: steel rim and a dark well, flush with the counter top
  b.box("darkSteel", w, 0.15, 17, 0, top + 0.08, 1, false);
  b.box("iron", w - 1.5, 0.16, 15.5, 0, top + 0.1, 1, false);
  buildFaucet(b, 0, top, -8.5, 13);
}

function buildFaucet(b: Builder, x: number, baseY: number, z: number, height: number) {
  b.cyl("steel", 0.9, 1.1, 1, x, baseY + 0.5, z, 16);
  b.cyl("steel", 0.5, 0.55, height, x, baseY + height / 2, z, 12);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(3.2 * IN, 0.5 * IN, 10, 20, Math.PI), b.mats.steel);
  arc.position.set(x * IN, (baseY + height) * IN, (z + 3.2) * IN);
  arc.rotation.y = Math.PI / 2;
  arc.castShadow = true;
  b.group.add(arc);
  b.cyl("steel", 0.55, 0.55, 2.5, x, baseY + height - 1.25, z + 6.4, 12);
}

function buildVesselBasin(b: Builder) {
  const top = SITE_CONFIG.PLACEHOLDER_DIMS.vanityHeightIn + SITE_CONFIG.PLACEHOLDER_DIMS.countertopThicknessIn;
  const bowl = b.cyl("porcelain", 8, 6, 5, 0, top + 2.5, 1, 36, true);
  bowl.scale.x = 1.25;
  const inner = b.cyl("ceramic", 6.4, 6.4, 0.3, 0, top + 0.6, 1, 32);
  inner.scale.x = 1.25;
  buildFaucet(b, 0, top, -8, 12);
}

function buildPlant(b: Builder, size: "counter" | "floor", seed: number, baseY: number) {
  const r = rng(seed);
  const potR = size === "counter" ? 3.4 : 8;
  const potH = size === "counter" ? 5 : 15;
  b.cyl(size === "counter" ? "ceramic" : "terracotta", potR, potR * 0.82, potH, 0, baseY + potH / 2, 0, 28);
  b.cyl("soil", potR * 0.92, potR * 0.92, 0.4, 0, baseY + potH - 0.3, 0, 20);

  const leafCount = size === "counter" ? 34 : 90;
  const crownLow = baseY + potH + (size === "counter" ? 1 : 14);
  const crownHigh = baseY + potH + (size === "counter" ? 13 : 52);
  const spread = size === "counter" ? 6 : 15;
  const leafLen = size === "counter" ? 2.6 : 5.2;

  if (size === "floor") {
    b.cyl("stem", 0.6, 0.8, crownHigh - baseY - potH - 4, 0, (baseY + potH + crownHigh - 4) / 2, 0, 8);
  }

  const leafGeo = new THREE.SphereGeometry(1, 10, 6);
  leafGeo.scale(leafLen * 0.5 * IN, 0.06 * IN, leafLen * 0.24 * IN);
  leafGeo.translate(leafLen * 0.45 * IN, 0, 0);
  const leaves = new THREE.InstancedMesh(leafGeo, b.mats.leaf, leafCount);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < leafCount; i++) {
    const h = crownLow + (crownHigh - crownLow) * Math.pow(r(), 0.8);
    const frac = (h - crownLow) / Math.max(1, crownHigh - crownLow);
    // Wider in the middle of the crown, narrower at the top
    const rad = spread * (0.25 + 0.75 * Math.sin(Math.PI * Math.min(1, frac * 0.9 + 0.1))) * (0.4 + 0.6 * r());
    const ang = r() * Math.PI * 2;
    p.set(Math.cos(ang) * rad * 0.35 * IN, h * IN, Math.sin(ang) * rad * 0.35 * IN);
    e.set((r() - 0.5) * 0.6, -ang, -0.25 + r() * 0.9 - frac * 0.3);
    q.setFromEuler(e);
    const sc = 0.7 + r() * 0.6;
    s.set(sc, sc, sc);
    m.compose(p, q, s);
    leaves.setMatrixAt(i, m);
  }
  leaves.castShadow = true;
  leaves.receiveShadow = true;
  b.group.add(leaves);
}

function buildFruitBowl(b: Builder, seed: number) {
  const r = rng(seed);
  const top = COUNTER_TOP_IN;
  b.cyl("ceramic", 5.2, 3, 2.6, 0, top + 1.3, 0, 32, true);
  b.cyl("ceramic", 3, 3, 0.3, 0, top + 0.15, 0, 24);
  const geo = new THREE.SphereGeometry(1.45 * IN, 16, 12);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + r();
    const fruit = new THREE.Mesh(geo, b.mats.fruit);
    fruit.position.set(Math.cos(a) * 2.1 * IN, (top + 2.4 + (i === 4 ? 1.4 : 0)) * IN, Math.sin(a) * 2.1 * IN);
    if (i === 4) fruit.position.set(0, (top + 3.6) * IN, 0);
    fruit.castShadow = true;
    b.group.add(fruit);
  }
}

function buildFixture(mats: RoomPropMaterials, f: FixturePlacement, ceilingIn: number, seed: number): THREE.Group {
  const b = new Builder(mats);
  const w = f.widthIn ?? 30;
  switch (f.kind) {
    case "fridge":
      buildFridge(b, w);
      break;
    case "range":
      buildRange(b, w);
      break;
    case "hood":
      buildHood(b, w, ceilingIn);
      break;
    case "sink":
      buildSink(b, f.widthIn ?? 28);
      break;
    case "vessel-basin":
      buildVesselBasin(b);
      break;
    case "plant-counter":
      buildPlant(b, "counter", seed, f.onCounter === false ? 0 : COUNTER_TOP_IN);
      break;
    case "plant-floor":
      buildPlant(b, "floor", seed, 0);
      break;
    case "fruit-bowl":
      buildFruitBowl(b, seed);
      break;
  }
  const g = b.group;
  g.position.set(f.xIn * IN, 0, f.zIn * IN);
  g.rotation.y = THREE.MathUtils.degToRad(f.rotYDeg ?? 0);
  g.userData.kind = f.kind;
  return g;
}

/** Builds all fixtures for a layout. Dispose the result with disposeRoomProps when replaced. */
export function buildRoomProps(
  mats: RoomPropMaterials,
  layoutId: LayoutId,
  ceiling: CeilingHeightFt
): THREE.Group {
  const root = new THREE.Group();
  root.name = "roomProps";
  const ceilingIn = SITE_CONFIG.PLACEHOLDER_DIMS.ceilingHeightsIn[ceiling];
  (ROOM_LAYOUTS[layoutId].fixtures ?? []).forEach((f, i) => {
    root.add(buildFixture(mats, f, ceilingIn, 1013 + i * 97));
  });
  return root;
}

/** Scale each fixture about its own base, so they rise into place instead of popping. */
export function setRoomPropsAppear(root: THREE.Group, amount: number): void {
  const a = THREE.MathUtils.clamp(amount, 0, 1);
  root.visible = a > 0.01;
  const eased = a * a * (3 - 2 * a);
  for (const child of root.children) {
    child.scale.set(1, Math.max(0.001, eased), 1);
  }
}

export function disposeRoomProps(root: THREE.Group): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
  });
  root.removeFromParent();
}

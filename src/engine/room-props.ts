import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { FixturePlacement } from "@/config/layouts";
import { SITE_CONFIG } from "@/config/site";
import type { PlannedRoom, StripPlacement } from "./kitchen-planner";
import { ROOM_COLORS } from "./room-look";

/**
 * Appliances, fixtures and the room shell for a planned kitchen or bath.
 * Appliances are modelled at real size from the planner's openings: a counter-depth French-door
 * refrigerator, a pro-style range with cast-iron grates, a chimney hood, a dishwasher, an
 * undermount sink with a pull-down faucet. All sizes in inches, converted to meters here.
 *
 * Every wall appliance is built with its origin at the centre of its back edge (on the wall
 * line) and extends toward +z, so it sits inside the extents the planner checks for collisions.
 * Every texture is drawn on a canvas at start-up: nothing extra to download.
 */

const IN = 0.0254;
const COUNTER_TOP_IN =
  SITE_CONFIG.PLACEHOLDER_DIMS.baseHeightIn + SITE_CONFIG.PLACEHOLDER_DIMS.countertopThicknessIn;

export interface RoomPropMaterials {
  steel: THREE.MeshPhysicalMaterial;
  steelTrim: THREE.MeshPhysicalMaterial;
  glass: THREE.MeshPhysicalMaterial;
  castIron: THREE.MeshStandardMaterial;
  blackMatte: THREE.MeshStandardMaterial;
  sinkWell: THREE.MeshStandardMaterial;
  ceramic: THREE.MeshStandardMaterial;
  porcelain: THREE.MeshPhysicalMaterial;
  terracotta: THREE.MeshStandardMaterial;
  soil: THREE.MeshStandardMaterial;
  leaf: THREE.MeshStandardMaterial;
  fruit: THREE.MeshStandardMaterial;
  oak: THREE.MeshStandardMaterial;
  mirror: THREE.MeshPhysicalMaterial;
  bronze: THREE.MeshPhysicalMaterial;
  ledWarm: THREE.MeshBasicMaterial;
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  return [c, ctx];
}

/** Fine horizontal grain for brushed stainless: drives roughness so highlights streak. */
function makeBrushedTexture(): THREE.Texture {
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = "#7a7a7a";
  ctx.fillRect(0, 0, 256, 256);
  let seed = 7;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 2600; i++) {
    const y = r() * 256;
    const g = 100 + Math.floor(r() * 70);
    ctx.strokeStyle = `rgba(${g},${g},${g},${0.25 + r() * 0.35})`;
    ctx.lineWidth = 0.6 + r() * 0.8;
    ctx.beginPath();
    const x = r() * 256;
    ctx.moveTo(x - 40 - r() * 120, y);
    ctx.lineTo(x + 40 + r() * 120, y + (r() - 0.5) * 0.6);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

/** Top view of a stainless bowl: dark at the walls, a soft floor, a drain. Reads as depth from above. */
function makeSinkTexture(): THREE.Texture {
  const [c, ctx] = canvas(512, 300);
  const g = ctx.createLinearGradient(0, 0, 0, 300);
  g.addColorStop(0, "#4a4d50");
  g.addColorStop(0.18, "#7e8285");
  g.addColorStop(0.6, "#9a9ea1");
  g.addColorStop(1, "#5d6164");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 300);
  // Inner walls: shade toward each edge.
  const edge = (x0: number, y0: number, x1: number, y1: number) => {
    const lg = ctx.createLinearGradient(x0, y0, x1, y1);
    lg.addColorStop(0, "rgba(20,22,24,0.75)");
    lg.addColorStop(1, "rgba(20,22,24,0)");
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, 512, 300);
  };
  edge(0, 0, 46, 0);
  edge(512, 0, 466, 0);
  edge(0, 0, 0, 40);
  edge(0, 300, 0, 262);
  // Rim highlight.
  ctx.strokeStyle = "rgba(225,228,230,0.9)";
  ctx.lineWidth = 5;
  ctx.strokeRect(3, 3, 506, 294);
  // Drain.
  ctx.fillStyle = "#2b2d2f";
  ctx.beginPath();
  ctx.arc(256, 170, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#b9bdc0";
  ctx.lineWidth = 3;
  ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Vertical fade used for under-cabinet glow and soft floor shadows. Opaque at v = 1. */
function makeFadeTexture(power: number): THREE.Texture {
  const [c, ctx] = canvas(4, 128);
  const img = ctx.createImageData(4, 128);
  for (let y = 0; y < 128; y++) {
    const v = Math.pow(1 - y / 127, power);
    for (let x = 0; x < 4; x++) {
      const i = (y * 4 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.round(v * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function createRoomPropMaterials(): RoomPropMaterials {
  const brushed = typeof document !== "undefined" ? makeBrushedTexture() : null;
  const steel = new THREE.MeshPhysicalMaterial({
    color: "#c9ccce",
    metalness: 1,
    roughness: 0.42,
    roughnessMap: brushed,
    anisotropy: 0.65,
    envMapIntensity: 1.15,
  });
  const steelTrim = new THREE.MeshPhysicalMaterial({ color: "#a6aaad", metalness: 1, roughness: 0.3, envMapIntensity: 1.1 });
  return {
    steel,
    steelTrim,
    glass: new THREE.MeshPhysicalMaterial({
      color: "#0b0c0e",
      metalness: 0.1,
      roughness: 0.04,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      envMapIntensity: 1.4,
    }),
    castIron: new THREE.MeshStandardMaterial({ color: "#1b1a19", metalness: 0.35, roughness: 0.72 }),
    blackMatte: new THREE.MeshStandardMaterial({ color: "#121212", roughness: 0.85 }),
    sinkWell: new THREE.MeshStandardMaterial({
      map: typeof document !== "undefined" ? makeSinkTexture() : null,
      metalness: 0.55,
      roughness: 0.38,
      envMapIntensity: 0.9,
    }),
    ceramic: new THREE.MeshStandardMaterial({ color: "#ebe5da", roughness: 0.55 }),
    porcelain: new THREE.MeshPhysicalMaterial({ color: "#f6f4f0", roughness: 0.16, clearcoat: 0.6, clearcoatRoughness: 0.1 }),
    terracotta: new THREE.MeshStandardMaterial({ color: "#b06f4f", roughness: 0.8 }),
    soil: new THREE.MeshStandardMaterial({ color: "#3a2c22", roughness: 1 }),
    leaf: new THREE.MeshStandardMaterial({ color: "#4f6d3b", roughness: 0.62, side: THREE.DoubleSide }),
    fruit: new THREE.MeshStandardMaterial({ color: "#d98a2b", roughness: 0.48 }),
    oak: new THREE.MeshStandardMaterial({ color: "#b38b5e", roughness: 0.55 }),
    mirror: new THREE.MeshPhysicalMaterial({ color: "#e4e8ea", metalness: 1, roughness: 0.02, envMapIntensity: 1.3 }),
    bronze: new THREE.MeshPhysicalMaterial({ color: "#6b553b", metalness: 0.9, roughness: 0.3, clearcoat: 0.25 }),
    ledWarm: new THREE.MeshBasicMaterial({ color: "#fff0d2" }),
  };
}

export function setRoomPropEnvMap(mats: RoomPropMaterials, env: THREE.Texture | null): void {
  for (const m of Object.values(mats)) {
    if ((m as THREE.MeshBasicMaterial).isMeshBasicMaterial) continue;
    const sm = m as THREE.MeshStandardMaterial;
    if (sm.envMap !== env) {
      sm.envMap = env;
      sm.needsUpdate = true;
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

type MatKey = keyof RoomPropMaterials;

class Builder {
  readonly group = new THREE.Group();
  constructor(readonly mats: RoomPropMaterials) {}

  /** Box from min corner to max corner, in inches. */
  boxMinMax(mat: MatKey, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, shadow = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry((x1 - x0) * IN, (y1 - y0) * IN, (z1 - z0) * IN), this.mats[mat]);
    m.position.set(((x0 + x1) / 2) * IN, ((y0 + y1) / 2) * IN, ((z0 + z1) / 2) * IN);
    m.castShadow = shadow;
    m.receiveShadow = true;
    this.group.add(m);
    return m;
  }

  cyl(mat: MatKey, rTop: number, rBottom: number, h: number, x: number, y: number, z: number, seg = 24, open = false) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop * IN, rBottom * IN, h * IN, seg, 1, open), this.mats[mat]);
    m.position.set(x * IN, y * IN, z * IN);
    m.castShadow = true;
    m.receiveShadow = true;
    this.group.add(m);
    return m;
  }

  /** Cylinder lying along Z (knobs, standoffs), from z0 to z1. */
  cylZ(mat: MatKey, r: number, x: number, y: number, z0: number, z1: number, seg = 18) {
    const m = this.cyl(mat, r, r, z1 - z0, x, y, (z0 + z1) / 2, seg);
    m.rotation.x = Math.PI / 2;
    return m;
  }

  /** Cylinder lying along X (bar handles). */
  cylX(mat: MatKey, r: number, x0: number, x1: number, y: number, z: number, seg = 18) {
    const m = this.cyl(mat, r, r, x1 - x0, (x0 + x1) / 2, y, z, seg);
    m.rotation.z = Math.PI / 2;
    return m;
  }

  /** Bar handle on two standoffs, horizontal or vertical. */
  barHandle(horizontal: boolean, cx: number, cy: number, length: number, zFace: number, standoff = 1.6) {
    const r = 0.45;
    const zBar = zFace + standoff;
    if (horizontal) {
      this.cylX("steelTrim", r, cx - length / 2, cx + length / 2, cy, zBar);
      for (const s of [-1, 1]) this.cylZ("steelTrim", 0.32, cx + s * (length / 2 - 1.2), cy, zFace, zBar);
    } else {
      this.cyl("steelTrim", r, r, length, cx, cy, zBar, 18);
      for (const s of [-1, 1]) this.cylZ("steelTrim", 0.32, cx, cy + s * (length / 2 - 1.2), zFace, zBar);
    }
  }
}

function buildFridge(b: Builder, w: number) {
  const h = 70;
  // Cabinet body and a dark gasket plane so the door gaps read.
  b.boxMinMax("steel", -w / 2, 4, 0.5, w / 2, h, 24.4);
  b.boxMinMax("blackMatte", -w / 2 + 0.1, 4, 24.4, w / 2 - 0.1, h - 0.1, 24.5, false);
  // French doors and freezer drawer, 1/8" gaps.
  const gap = 0.125;
  const doorY0 = 30.25;
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? -w / 2 : gap / 2;
    const x1 = s < 0 ? -gap / 2 : w / 2;
    b.boxMinMax("steel", x0, doorY0, 24.5, x1, h, 26);
    b.barHandle(false, s * 1.9, doorY0 + 21, 30, 26);
  }
  b.boxMinMax("steel", -w / 2, 4.25, 24.5, w / 2, doorY0 - gap, 26);
  b.barHandle(true, 0, doorY0 - 3.2, w - 9, 26);
  // Toe grille, recessed.
  b.boxMinMax("blackMatte", -w / 2 + 1, 0.4, 21.5, w / 2 - 1, 3.8, 22, false);
  for (let i = 0; i < 12; i++) {
    const x = -w / 2 + 3 + (i * (w - 6)) / 11;
    b.boxMinMax("steelTrim", x - 0.12, 0.8, 22, x + 0.12, 3.4, 22.2, false);
  }
}

function buildRange(b: Builder, w: number) {
  const top = 35.5;
  const burners = w >= 34 ? 6 : 4;
  // Body and recessed kick.
  b.boxMinMax("steel", -w / 2, 4, 0, w / 2, top, 25);
  b.boxMinMax("blackMatte", -w / 2 + 0.6, 0, 1, w / 2 - 0.6, 4, 22.5, false);
  // Oven door with a framed window and a tube handle on standoffs.
  b.boxMinMax("steel", -w / 2 + 0.25, 5, 25, w / 2 - 0.25, 26.6, 26.25);
  b.boxMinMax("glass", -w / 2 + 4.5, 11.5, 26.25, w / 2 - 4.5, 21.5, 26.4, false);
  b.boxMinMax("blackMatte", -w / 2 + 3.6, 10.6, 26.15, w / 2 - 3.6, 22.4, 26.3, false);
  b.barHandle(true, 0, 24.8, w - 5, 26.25, 1.1);
  // Control panel with knobs on skirts.
  b.boxMinMax("steel", -w / 2, 27, 25, w / 2, top - 0.2, 26.5);
  const knobs = burners + 1;
  for (let i = 0; i < knobs; i++) {
    const x = -w / 2 + 3 + (i * (w - 6)) / (knobs - 1);
    b.cylZ("blackMatte", 1.15, x, 31.2, 26.5, 26.65, 24);
    b.cylZ("steelTrim", 0.95, x, 31.2, 26.65, 27.6, 24);
    b.boxMinMax("blackMatte", x - 0.09, 31.4, 27.6, x + 0.09, 32.05, 27.65, false);
  }
  // Cooktop deck, sealed burners, continuous cast-iron grates, low backguard.
  b.boxMinMax("steel", -w / 2, top, 0, w / 2, top + 0.25, 25);
  b.boxMinMax("steel", -w / 2, top, 0, w / 2, top + 3, 1.2);
  const cols = burners / 2;
  const zMid = 12.5;
  const colW = w / cols;
  for (let c = 0; c < cols; c++) {
    const cx = -w / 2 + colW * (c + 0.5);
    for (const sz of [-1, 1]) {
      const cz = zMid + sz * 5.8;
      b.cyl("steelTrim", 2.1, 2.3, 0.5, cx, top + 0.5, cz, 28);
      b.cyl("castIron", 1.45, 1.5, 0.45, cx, top + 0.95, cz, 24);
    }
  }
  // Grates: one per pair of columns, a frame and a lattice of fingers.
  const gratesN = cols === 3 ? 3 : 2;
  const gW = w / gratesN;
  const y0 = top + 0.9;
  const y1 = top + 1.5;
  for (let g = 0; g < gratesN; g++) {
    const gx0 = -w / 2 + g * gW + 0.3;
    const gx1 = gx0 + gW - 0.6;
    const gz0 = 2;
    const gz1 = 23.5;
    const bar = 0.42;
    b.boxMinMax("castIron", gx0, y0, gz0, gx1, y1, gz0 + bar, false);
    b.boxMinMax("castIron", gx0, y0, gz1 - bar, gx1, y1, gz1, false);
    b.boxMinMax("castIron", gx0, y0, gz0, gx0 + bar, y1, gz1, false);
    b.boxMinMax("castIron", gx1 - bar, y0, gz0, gx1, y1, gz1, false);
    b.boxMinMax("castIron", gx0, y0, zMid - bar / 2, gx1, y1, zMid + bar / 2, false);
    for (let i = 1; i < 4; i++) {
      const x = gx0 + ((gx1 - gx0) * i) / 4;
      b.boxMinMax("castIron", x - bar / 2, y0, gz0, x + bar / 2, y1, gz1, false);
    }
  }
}

/** Square frustum box: full size at the bottom, narrower and set back at the top (back faces flush). */
function frustumGeometry(wBot: number, dBot: number, wTop: number, dTop: number, h: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(1, 1, 1);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const top = p.getY(i) > 0;
    const x = p.getX(i) * (top ? wTop : wBot);
    const zFront = top ? dTop : dBot;
    const z = p.getZ(i) > 0 ? zFront : 0;
    p.setXYZ(i, x * IN, (top ? h : 0) * IN, z * IN);
  }
  g.computeVertexNormals();
  return g;
}

function buildHood(b: Builder, w: number, ceilingIn: number) {
  const bottom = 66.25;
  const d = 20;
  // Liner with baffle filters and two warm task lights underneath.
  b.boxMinMax("steel", -w / 2, bottom, 0, w / 2, bottom + 3.5, d);
  b.boxMinMax("steelTrim", -w / 2 + 1.5, bottom - 0.05, 2, w / 2 - 1.5, bottom + 0.05, d - 2, false);
  for (let i = 0; i < 5; i++) {
    const x = -w / 2 + 3 + (i * (w - 6)) / 4;
    b.boxMinMax("blackMatte", x - 0.1, bottom - 0.06, 3, x + 0.1, bottom + 0.06, d - 3, false);
  }
  for (const s of [-1, 1]) b.cyl("ledWarm", 0.9, 0.9, 0.12, s * (w / 4), bottom - 0.02, d - 4, 18);
  // Canopy taper and chimney to the ceiling.
  const taperH = 9;
  const chimneyW = Math.max(10, w * 0.4);
  const taper = new THREE.Mesh(frustumGeometry(w, d, chimneyW, 11, taperH), b.mats.steel);
  taper.position.set(0, (bottom + 3.5) * IN, 0);
  taper.castShadow = true;
  taper.receiveShadow = true;
  b.group.add(taper);
  const cy0 = bottom + 3.5 + taperH;
  if (ceilingIn - cy0 > 0.5) {
    b.boxMinMax("steel", -chimneyW / 2, cy0, 0, chimneyW / 2, ceilingIn, 11);
    // A fine seam where the telescoping chimney sections meet.
    const seam = cy0 + (ceilingIn - cy0) * 0.45;
    b.boxMinMax("blackMatte", -chimneyW / 2 - 0.02, seam, 0, chimneyW / 2 + 0.02, seam + 0.12, 11.02, false);
  }
}

function buildDishwasher(b: Builder, w: number) {
  b.boxMinMax("blackMatte", -w / 2, 4, 0.5, w / 2, 34.2, 24.6, false);
  b.boxMinMax("steel", -w / 2, 4, 24.6, w / 2, 34.2, 25.6);
  b.barHandle(true, 0, 31.2, w - 5, 25.6, 1.4);
  b.boxMinMax("blackMatte", -w / 2 + 0.3, 0.3, 21.5, w / 2 - 0.3, 3.9, 22, false);
}

function buildFaucet(b: Builder, x: number, baseY: number, z: number, height: number, reach: number, mat: MatKey = "steelTrim") {
  b.cyl(mat, 1.15, 1.25, 0.6, x, baseY + 0.3, z, 24);
  const colH = height - reach / 2;
  b.cyl(mat, 0.62, 0.68, colH, x, baseY + colH / 2, z, 18);
  const arc = new THREE.Mesh(new THREE.TorusGeometry((reach / 2) * IN, 0.55 * IN, 12, 24, Math.PI), b.mats[mat]);
  arc.position.set(x * IN, (baseY + colH) * IN, (z + reach / 2) * IN);
  arc.rotation.y = -Math.PI / 2;
  arc.castShadow = true;
  b.group.add(arc);
  b.cyl(mat, 0.6, 0.6, 3.2, x, baseY + colH - 1.6, z + reach, 18);
  // Side lever.
  const lever = b.cyl(mat, 0.25, 0.25, 3, x + 1.4, baseY + colH * 0.55, z, 12);
  lever.rotation.z = Math.PI / 2.6;
}

function buildSink(b: Builder) {
  const top = COUNTER_TOP_IN;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(30 * IN, 17 * IN).rotateX(-Math.PI / 2), b.mats.sinkWell);
  plane.position.set(0, (top + 0.02) * IN, 12 * IN);
  plane.receiveShadow = true;
  b.group.add(plane);
  buildFaucet(b, 0, top, 3.4, 16, 7);
}

function buildVesselBasin(b: Builder) {
  const top = COUNTER_TOP_IN;
  const pts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(4.5, 0.05),
    new THREE.Vector2(7, 1.2),
    new THREE.Vector2(7.9, 3.4),
    new THREE.Vector2(8, 4.8),
    new THREE.Vector2(7.65, 4.8),
    new THREE.Vector2(7.5, 3.5),
    new THREE.Vector2(6.6, 1.6),
    new THREE.Vector2(4, 0.7),
    new THREE.Vector2(0, 0.6),
  ].map((v) => v.multiplyScalar(IN));
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), b.mats.porcelain);
  bowl.scale.x = 1.24;
  bowl.position.set(0, top * IN, 10 * IN);
  bowl.castShadow = true;
  bowl.receiveShadow = true;
  b.group.add(bowl);
  buildFaucet(b, 0, top, 3, 12, 6.5, "bronze");
}

function buildMirror(b: Builder, w: number) {
  b.boxMinMax("bronze", -w / 2, 44, 0, w / 2, 76, 0.6);
  b.boxMinMax("mirror", -w / 2 + 0.7, 44.7, 0.6, w / 2 - 0.7, 75.3, 0.9, false);
}

function buildStool(b: Builder) {
  const seat = 26;
  b.cyl("oak", 7.4, 7.2, 1.6, 0, seat - 0.8, 0, 32);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const leg = b.cyl("oak", 0.55, 0.65, seat - 1.6, Math.cos(a) * 5.2, (seat - 1.6) / 2, Math.sin(a) * 5.2, 12);
    leg.rotation.set(Math.sin(a) * 0.07, 0, -Math.cos(a) * 0.07);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(5.6 * IN, 0.28 * IN, 8, 32), b.mats.steelTrim);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 9 * IN;
  b.group.add(ring);
}

function buildPlant(b: Builder, seed: number, baseY: number) {
  const r = rng(seed);
  const potR = 3.4;
  const potH = 5;
  b.cyl("ceramic", potR, potR * 0.82, potH, 0, baseY + potH / 2, 0, 28);
  b.cyl("soil", potR * 0.92, potR * 0.92, 0.4, 0, baseY + potH - 0.3, 0, 20);
  const leafCount = 34;
  const crownLow = baseY + potH + 1;
  const crownHigh = baseY + potH + 8.5;
  const spread = 6;
  const leafLen = 2.6;
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
    fruit.position.set(Math.cos(a) * 2.1 * IN, (top + 2.4) * IN, Math.sin(a) * 2.1 * IN);
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
    case "dishwasher":
      buildDishwasher(b, w);
      break;
    case "sink":
      buildSink(b);
      break;
    case "vessel-basin":
      buildVesselBasin(b);
      break;
    case "mirror":
      buildMirror(b, w);
      break;
    case "stool":
      buildStool(b);
      break;
    case "plant-counter":
      buildPlant(b, seed, COUNTER_TOP_IN);
      break;
    case "fruit-bowl":
      buildFruitBowl(b, seed);
      break;
  }
  const g = mergeByMaterial(b.group);
  g.position.set(f.xIn * IN, 0, f.zIn * IN);
  g.rotation.y = THREE.MathUtils.degToRad(f.rotYDeg ?? 0);
  g.userData.kind = f.kind;
  return g;
}

/**
 * Bake each appliance into one mesh per material: a range is ~60 parts but only 5 materials,
 * so this cuts its draw calls (and shadow draw calls) by an order of magnitude on phones.
 */
function mergeByMaterial(group: THREE.Group): THREE.Group {
  group.updateMatrixWorld(true);
  const buckets = new Map<THREE.Material, { geos: THREE.BufferGeometry[]; shadow: boolean }>();
  const keep: THREE.Object3D[] = [];
  for (const child of group.children) {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || (mesh as unknown as THREE.InstancedMesh).isInstancedMesh || Array.isArray(mesh.material)) {
      keep.push(child);
      continue;
    }
    const geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    for (const name of Object.keys(geo.attributes)) {
      if (name !== "position" && name !== "normal" && name !== "uv") geo.deleteAttribute(name);
    }
    if (!geo.attributes.uv) {
      geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    }
    geo.applyMatrix4(mesh.matrix);
    const mat = mesh.material as THREE.Material;
    const bucket = buckets.get(mat) ?? { geos: [], shadow: false };
    bucket.geos.push(geo);
    bucket.shadow = bucket.shadow || mesh.castShadow;
    buckets.set(mat, bucket);
    mesh.geometry.dispose();
  }
  const out = new THREE.Group();
  for (const k of keep) out.add(k);
  for (const [mat, { geos, shadow }] of buckets) {
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) continue;
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = shadow;
    m.receiveShadow = true;
    out.add(m);
  }
  return out;
}

/* ------------------------------------------------------------------ room shell */

export interface RoomShellResources {
  wall: THREE.MeshStandardMaterial;
  splash: THREE.MeshStandardMaterial;
  glow: THREE.MeshBasicMaterial;
  floorShadow: THREE.MeshBasicMaterial;
}

export function createRoomShellResources(marble: THREE.Texture | null, env: THREE.Texture | null): RoomShellResources {
  const fadeGlow = typeof document !== "undefined" ? makeFadeTexture(1.6) : null;
  const fadeShadow = typeof document !== "undefined" ? makeFadeTexture(2.2) : null;
  return {
    // One-sided: a wall between the camera and the room is not drawn, like a dollhouse.
    wall: new THREE.MeshStandardMaterial({ color: ROOM_COLORS.wall, roughness: 0.92, side: THREE.FrontSide }),
    splash: new THREE.MeshStandardMaterial({ color: "#ffffff", map: marble, roughness: 0.22, envMap: env, envMapIntensity: 0.6 }),
    glow: new THREE.MeshBasicMaterial({
      color: "#ffd9a6",
      alphaMap: fadeGlow,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    floorShadow: new THREE.MeshBasicMaterial({
      color: "#2b2117",
      alphaMap: fadeShadow,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    }),
  };
}

/** Place a plane on a wall strip (wall faces rotYDeg; plane sits `offset` inches off the wall). */
function stripMesh(s: StripPlacement, mat: THREE.Material, offset: number, y0 = s.y0, y1 = s.y1): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(s.widthIn * IN, (y1 - y0) * IN);
  const m = new THREE.Mesh(geo, mat);
  const r = THREE.MathUtils.degToRad(s.rotYDeg);
  m.position.set((s.xIn + Math.sin(r) * offset) * IN, ((y0 + y1) / 2) * IN, (s.zIn + Math.cos(r) * offset) * IN);
  m.rotation.y = r;
  return m;
}

/**
 * Walls, stone backsplash, under-cabinet LED strips with their glow, and soft floor shadows.
 * Rebuilt whenever the plan changes; dispose with disposeRoomProps.
 */
export function buildRoomShell(res: RoomShellResources, mats: RoomPropMaterials, plan: PlannedRoom): THREE.Group {
  const root = new THREE.Group();
  root.name = "roomShell";
  const H = plan.ceilingIn;
  // Walls rise past the ceiling line into the backdrop, and the back wall runs well past the
  // room, so the room reads as a set photographed from outside, not as cardboard flats.
  const wallH = Math.max(H, 212);
  for (const w of plan.wallPlanes) {
    const back = w.rotYDeg === 0;
    const width = back ? w.widthIn + 480 : w.widthIn;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(width * IN, wallH * IN), res.wall);
    m.position.set(w.xIn * IN, (wallH / 2) * IN, w.zIn * IN);
    m.rotation.y = THREE.MathUtils.degToRad(w.rotYDeg);
    m.receiveShadow = true;
    root.add(m);
  }
  for (const s of plan.backsplash) {
    const m = stripMesh(s, res.splash, 0.06);
    m.receiveShadow = true;
    root.add(m);
  }
  for (const s of plan.lightStrips) {
    // The diffuser under the cabinet front, then its warm wash down the backsplash.
    const r = THREE.MathUtils.degToRad(s.rotYDeg);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.01, (s.widthIn - 2) * IN), 0.25 * IN, 0.7 * IN), mats.ledWarm);
    bar.position.set((s.xIn + Math.sin(r) * 9.5) * IN, (s.y1 - 0.2) * IN, (s.zIn + Math.cos(r) * 9.5) * IN);
    bar.rotation.y = r;
    root.add(bar);
    const glow = stripMesh({ ...s, widthIn: s.widthIn - 1 }, res.glow, 0.1, COUNTER_TOP_IN, s.y1);
    glow.renderOrder = 2;
    root.add(glow);
  }
  for (const s of plan.floorShadows) {
    const depth = 9;
    const geo = new THREE.PlaneGeometry(s.widthIn * IN, depth * IN);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, res.floorShadow);
    const r = THREE.MathUtils.degToRad(s.rotYDeg);
    // Fade from dark at the toe kick to clear 9" out.
    m.position.set((s.xIn + Math.sin(r) * (depth / 2 - 3.25)) * IN, 0.02 * IN, (s.zIn + Math.cos(r) * (depth / 2 - 3.25)) * IN);
    m.rotation.y = r;
    m.renderOrder = 1;
    root.add(m);
  }
  return root;
}

/** Builds all fixtures for a planned room. Dispose the result with disposeRoomProps when replaced. */
export function buildRoomProps(mats: RoomPropMaterials, plan: PlannedRoom): THREE.Group {
  const root = new THREE.Group();
  root.name = "roomProps";
  plan.fixtures.forEach((f, i) => {
    root.add(buildFixture(mats, f, plan.ceilingIn, 1013 + i * 97));
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

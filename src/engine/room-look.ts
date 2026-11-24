import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * The look of the furnished rooms, shared by the scroll film and the compose studio.
 * It matches the concept photos: warm white plaster, pale wide-plank oak, white marble with
 * soft grey veining, and late daylight through a window. Every texture is drawn on a canvas
 * at start-up, so there is nothing extra to download.
 */
export const ROOM_COLORS = {
  wall: "#ebe5dc",
  fog: "#d9d1c5",
  horizon: "#e4ddd2",
  hemiSky: "#fbf7f0",
  hemiGround: "#9c8d7a",
} as const;

/** Small seeded random so every visit draws the same marble and the same floor. */
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

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  return [c, ctx];
}

function finishTexture(
  tex: THREE.Texture,
  renderer: THREE.WebGLRenderer,
  repeat: [number, number],
  srgb = true
): THREE.Texture {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** One vein: a wandering line, drawn as a soft wide halo and a fine dark core. */
function drawVein(ctx: CanvasRenderingContext2D, r: () => number, size: number, strength: number) {
  const pts: [number, number][] = [];
  let x = r() * size;
  let y = -40;
  let ang = Math.PI / 2 + (r() - 0.5) * 1.1;
  while (y < size + 40 && pts.length < 400) {
    pts.push([x, y]);
    ang += (r() - 0.5) * 0.5;
    ang = THREE.MathUtils.clamp(ang, 0.35, Math.PI - 0.35);
    x += Math.cos(ang) * 9;
    y += Math.sin(ang) * 9;
  }
  const stroke = (w: number, a: number) => {
    ctx.lineWidth = w;
    ctx.strokeStyle = `rgba(118,112,104,${a})`;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const [px, py] = pts[i];
      // Draw the vein three times across the tile edge so the texture repeats without a seam.
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  };
  for (const dx of [-size, 0, size]) {
    ctx.save();
    ctx.translate(dx, 0);
    stroke(18 * strength, 0.035);
    stroke(6 * strength, 0.1);
    stroke(1.6 * strength, 0.42 * strength);
    ctx.restore();
  }
}

/** Warm white marble with a few soft grey veins, like the counters in the concept photos. */
export function makeMarbleTexture(renderer: THREE.WebGLRenderer, repeat: [number, number] = [1, 1]): THREE.Texture {
  const size = 1024;
  const [c, ctx] = canvas(size);
  const r = rng(7);
  ctx.fillStyle = "#efebe5";
  ctx.fillRect(0, 0, size, size);
  // Low-contrast clouding
  for (let i = 0; i < 70; i++) {
    const x = r() * size;
    const y = r() * size;
    const rad = 80 + r() * 260;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const tone = r() < 0.5 ? "232,228,222" : "246,244,240";
    g.addColorStop(0, `rgba(${tone},0.35)`);
    g.addColorStop(1, `rgba(${tone},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  drawVein(ctx, r, size, 1.0);
  drawVein(ctx, r, size, 0.7);
  drawVein(ctx, r, size, 0.45);
  drawVein(ctx, r, size, 0.35);
  return finishTexture(new THREE.CanvasTexture(c), renderer, repeat);
}

/**
 * Pale wide-plank oak floor: staggered planks with their own tone, fine grain lines and a
 * thin shadow at each seam.
 */
export function makeOakFloorTexture(renderer: THREE.WebGLRenderer, repeat: [number, number]): THREE.Texture {
  const size = 1024;
  const [c, ctx] = canvas(size);
  const r = rng(21);
  const planks = 6;
  const pw = size / planks;
  for (let col = 0; col < planks; col++) {
    let y = -r() * size;
    while (y < size) {
      const len = size * (0.45 + r() * 0.5);
      const shade = 0.92 + r() * 0.14;
      const base = [196 * shade, 168 * shade, 132 * shade].map((v) => Math.round(Math.min(255, v)));
      const x0 = col * pw;
      // Draw each plank twice when it crosses the tile edge so the floor repeats cleanly.
      for (const oy of [0, size]) {
        const yy = y - oy;
        ctx.fillStyle = `rgb(${base.join(",")})`;
        ctx.fillRect(x0, yy, pw, len);
        // Grain: long, slightly wavy strokes along the plank
        for (let g = 0; g < 26; g++) {
          const gx = x0 + 3 + r() * (pw - 6);
          const dark = r() < 0.6;
          ctx.strokeStyle = dark ? `rgba(120,92,62,${0.05 + r() * 0.1})` : `rgba(255,240,220,${0.05 + r() * 0.08})`;
          ctx.lineWidth = 0.6 + r() * 1.6;
          ctx.beginPath();
          ctx.moveTo(gx, yy);
          const wob = (r() - 0.5) * 6;
          ctx.bezierCurveTo(gx + wob, yy + len * 0.33, gx - wob, yy + len * 0.66, gx + (r() - 0.5) * 3, yy + len);
          ctx.stroke();
        }
        // End seam
        ctx.fillStyle = "rgba(70,52,36,0.45)";
        ctx.fillRect(x0, yy + len - 1.5, pw, 1.5);
      }
      y += len;
    }
    // Long seam
    ctx.fillStyle = "rgba(70,52,36,0.5)";
    ctx.fillRect(col * pw, 0, 1.5, size);
  }
  return finishTexture(new THREE.CanvasTexture(c), renderer, repeat);
}

/**
 * Light cookie for a spot light: a four-pane window, so late daylight lands on the wall and
 * the counter in soft-edged panes, as it does in the photos.
 */
export function makeWindowCookie(): THREE.Texture {
  const size = 256;
  const [c, ctx] = canvas(size);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, size, size);
  ctx.filter = "blur(3px)";
  ctx.fillStyle = "#fff";
  const m = 34;
  const bar = 9;
  const w = (size - m * 2 - bar) / 2;
  for (const ix of [0, 1]) {
    for (const iy of [0, 1]) {
      ctx.fillRect(m + ix * (w + bar), m + iy * (w + bar), w, w);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * A bright interior to reflect: steel, glass, marble and the floor pick up soft window-like
 * highlights instead of a dark studio.
 */
export function makeRoomEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  pmrem.dispose();
  return env;
}

/**
 * Eased edges for box-built parts (cabinet boxes, doors, counters). Real panels have a small
 * rounded edge that catches the light; flat boxes look like a 3D sketch without it. This bends
 * the shading normal over the last ~2 mm of each face toward the edge, using the part's own
 * size from its instance matrix, so no extra geometry is needed. Call it from onBeforeCompile.
 */
export function applyEdgeBevel(shader: { vertexShader: string; fragmentShader: string }): void {
  shader.vertexShader = shader.vertexShader
    .replace(
      "#include <common>",
      `#include <common>
      varying vec3 vBevelLocal;
      varying vec3 vBevelScale;
      varying vec3 vBevelAxX;
      varying vec3 vBevelAxY;
      varying vec3 vBevelAxZ;`
    )
    .replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      vBevelLocal = position;
      mat3 bevelM = mat3(1.0);
      #ifdef USE_INSTANCING
        bevelM = mat3(instanceMatrix);
      #endif
      vBevelScale = vec3(length(bevelM[0]), length(bevelM[1]), length(bevelM[2]));
      mat3 bevelMV = mat3(modelViewMatrix);
      vBevelAxX = bevelMV * bevelM[0];
      vBevelAxY = bevelMV * bevelM[1];
      vBevelAxZ = bevelMV * bevelM[2];`
    );
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>
      varying vec3 vBevelLocal;
      varying vec3 vBevelScale;
      varying vec3 vBevelAxX;
      varying vec3 vBevelAxY;
      varying vec3 vBevelAxZ;`
    )
    .replace(
      "#include <normal_fragment_maps>",
      `#include <normal_fragment_maps>
      {
        vec3 bd = (0.5 - abs(vBevelLocal)) * vBevelScale;
        float bw = 0.0024;
        vec3 w = (1.0 - clamp(bd / bw, 0.0, 1.0));
        // The axis closest to zero is the face itself, not an edge.
        if (bd.x <= bd.y && bd.x <= bd.z) w.x = 0.0;
        else if (bd.y <= bd.z) w.y = 0.0;
        else w.z = 0.0;
        if (w.x + w.y + w.z > 0.0) {
          vec3 dir = normalize(vBevelAxX) * sign(vBevelLocal.x) * w.x
                   + normalize(vBevelAxY) * sign(vBevelLocal.y) * w.y
                   + normalize(vBevelAxZ) * sign(vBevelLocal.z) * w.z;
          normal = normalize(normal + dir * 1.1);
        }
      }`
    );
}

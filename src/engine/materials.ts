import * as THREE from "three";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { FINISHES, FINISH_ORDER, FinishSlug } from "@/config/site";

export interface FinishTextureSet {
  diff: THREE.Texture;
  nor: THREE.Texture;
  rough: THREE.Texture;
  upgraded: boolean;
}

export interface LightWipeUniforms {
  uPrevMap: { value: THREE.Texture };
  uWipeProgress: { value: number };
  uWipeIntensity: { value: number };
  uWipeAngle: { value: THREE.Vector2 };
  uWipeGlowColor: { value: THREE.Color };
  uEdgeTint: { value: THREE.Color };
  uGrainDrawOn: { value: number };
  uTime: { value: number };
}

export interface WoodMaterialSystem {
  woodMaterial: THREE.MeshPhysicalMaterial;
  interiorMaterial: THREE.MeshStandardMaterial;
  counterMaterial: THREE.MeshPhysicalMaterial;
  metalMaterial: THREE.MeshStandardMaterial;
  bronzeMaterial: THREE.MeshPhysicalMaterial;
  ghostWireframeMaterial: THREE.MeshBasicMaterial;
  wipeUniforms: LightWipeUniforms;
  currentFinish: FinishSlug;
  prevFinish: FinishSlug;
  envMap: THREE.Texture | null;
  setFinishImmediate: (finish: FinishSlug) => void;
  setFinishTransition: (from: FinishSlug, to: FinishSlug, progress: number) => void;
  setGrainDrawOn: (progress: number) => void;
  loadFinishHiRes: (finish: FinishSlug) => Promise<void>;
  loadAllHiResInBackground: () => void;
  dispose: () => void;
}

function configureTexture(tex: THREE.Texture, isSRGB: boolean): THREE.Texture {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = isSRGB ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates an instant solid fallback 2x2 DataTexture matching the real swatch hex
 * so shaders compile on Frame 0 with zero black flashes before even the 256px WebP arrives.
 */
function makeSolidDataTexture(hex: string, isSRGB: boolean): THREE.DataTexture {
  const c = new THREE.Color(hex);
  const data = new Uint8Array(4 * 4);
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);
  for (let i = 0; i < 4; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, 2, 2, THREE.RGBAFormat);
  configureTexture(tex, isSRGB);
  return tex;
}

/**
 * Creates a crisp engraved part-code canvas texture (for Scene 1 flat-pack close-up).
 */
export function createEngravedCodeTexture(partCode: string, dimensionsLabel: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, 512, 128);
    ctx.strokeStyle = "rgba(42, 31, 22, 0.55)";
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 14, 492, 100);
    ctx.fillStyle = "rgba(35, 25, 17, 0.78)";
    ctx.font = "600 34px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(partCode, 28, 60);
    ctx.fillStyle = "rgba(35, 25, 17, 0.52)";
    ctx.font = "500 21px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(dimensionsLabel, 28, 96);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Creates the progressive PBR material bank with real KTX2/Basis loading,
 * warm studio HDRI reflections, edge-banding shading, Scene 0 grain draw-on,
 * and the physical world-space Light-Wipe finish transition shader.
 */
const _edgeTo = new THREE.Color();

export function createWoodMaterialSystem(
  renderer: THREE.WebGLRenderer,
  onScene0Ready?: () => void
): WoodMaterialSystem {
  const texLoader = new THREE.TextureLoader();
  const uploadNow = (...textures: THREE.Texture[]) => {
    for (const t of textures) {
      try {
        renderer.initTexture(t);
      } catch {
        // Upload on first use instead.
      }
    }
  };
  let ktx2Loader: KTX2Loader | null = null;
  try {
    ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath("/basis/");
    ktx2Loader.detectSupport(renderer);
  } catch {
    ktx2Loader = null;
  }

  const bank: Record<FinishSlug, FinishTextureSet> = {} as Record<FinishSlug, FinishTextureSet>;
  const flatNor = makeSolidDataTexture("#8080ff", false);
  const midRough = makeSolidDataTexture("#787878", false);

  for (const slug of FINISH_ORDER) {
    const spec = FINISHES[slug];
    bank[slug] = {
      diff: makeSolidDataTexture(spec.swatchHex, true),
      nor: flatNor,
      rough: midRough,
      upgraded: false,
    };
  }

  const wipeUniforms: LightWipeUniforms = {
    uPrevMap: { value: bank["premium-oak"].diff },
    uWipeProgress: { value: 1.0 },
    uWipeIntensity: { value: 0.0 },
    uWipeAngle: { value: new THREE.Vector2(0.84, 0.54) },
    uWipeGlowColor: { value: new THREE.Color("#ffdba8") },
    uEdgeTint: { value: new THREE.Color(FINISHES["premium-oak"].edgeHex) },
    uGrainDrawOn: { value: 1.0 },
    uTime: { value: 0 },
  };

  const woodMaterial = new THREE.MeshPhysicalMaterial({
    map: bank["premium-oak"].diff,
    normalMap: bank["premium-oak"].nor,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap: bank["premium-oak"].rough,
    roughness: 0.88,
    metalness: 0.02,
    clearcoat: 0.2,
    clearcoatRoughness: 0.42,
    envMapIntensity: 0.85,
  });

  woodMaterial.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, wipeUniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vWipeWorldPos;
        varying vec3 vEdgeLocalNormal;
        varying vec2 vRevealUv;`
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vEdgeLocalNormal = normal;
        vRevealUv = uv;`
      )
      .replace(
        "#include <worldpos_vertex>",
        `#include <worldpos_vertex>
        vec4 wipeWp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wipeWp = instanceMatrix * wipeWp;
        #endif
        wipeWp = modelMatrix * wipeWp;
        vWipeWorldPos = wipeWp.xyz;`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform sampler2D uPrevMap;
        uniform float uWipeProgress;
        uniform float uWipeIntensity;
        uniform vec2 uWipeAngle;
        uniform vec3 uWipeGlowColor;
        uniform vec3 uEdgeTint;
        uniform float uGrainDrawOn;
        varying vec3 vWipeWorldPos;
        varying vec3 vEdgeLocalNormal;
        varying vec2 vRevealUv;`
      )
      .replace(
        "#include <map_fragment>",
        `#ifdef USE_MAP
          vec4 nextTex = texture2D( map, vMapUv );
          vec4 prevTex = texture2D( uPrevMap, vMapUv );

          // World-space physical light-wipe wavefront sweeping across the room
          float wipeCoord = dot(vWipeWorldPos.xz, uWipeAngle) + vWipeWorldPos.y * 0.22;
          float wipeFront = mix(-3.6, 3.6, uWipeProgress);
          float wipeMask = 1.0 - smoothstep(wipeFront - 0.22, wipeFront + 0.22, wipeCoord);

          vec4 blendedWood = mix(prevTex, nextTex, wipeMask);

          // Scene 0 grain draw-on effect (left-to-right across the floating oak panel)
          if (uGrainDrawOn < 0.999) {
            float drawEdge = smoothstep(uGrainDrawOn - 0.14, uGrainDrawOn + 0.02, vRevealUv.x);
            vec3 rawTimber = vec3(0.08, 0.07, 0.06);
            blendedWood.rgb = mix(blendedWood.rgb, rawTimber, drawEdge * 0.85);
          }

          // Subtle edge-banding tonal difference on panel side edges (non-Z face normals)
          float edgeFactor = clamp(1.0 - abs(vEdgeLocalNormal.z), 0.0, 1.0) * 0.22;
          blendedWood.rgb = mix(blendedWood.rgb, blendedWood.rgb * 0.86 + uEdgeTint * 0.14, edgeFactor);

          diffuseColor *= blendedWood;
        #endif`
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        if (uWipeIntensity > 0.001) {
          float wipeCoordE = dot(vWipeWorldPos.xz, uWipeAngle) + vWipeWorldPos.y * 0.22;
          float wipeFrontE = mix(-3.6, 3.6, uWipeProgress);
          float distBand = (wipeCoordE - wipeFrontE) / 0.18;
          float lightBand = exp(-distBand * distBand) * uWipeIntensity;
          totalEmissiveRadiance += uWipeGlowColor * lightBand * 1.15;
        }`
      );
  };

  // Warm satin maple/birch frameless cabinet interior
  const interiorMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#dfd5c5"),
    roughness: 0.62,
    metalness: 0.02,
    envMapIntensity: 0.55,
  });

  // Honed architectural Taj Mahal / warm quartzite countertop slab
  const counterMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#e8e2d7"),
    roughness: 0.34,
    metalness: 0.02,
    clearcoat: 0.32,
    clearcoatRoughness: 0.28,
    envMapIntensity: 0.9,
  });

  // Brushed dark nickel / steel concealed hardware & pins
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#9c9891"),
    roughness: 0.32,
    metalness: 0.82,
    envMapIntensity: 1.0,
  });

  // Warm brushed architectural bronze pulls & gooseneck fixtures
  const bronzeMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#6b553b"),
    roughness: 0.27,
    metalness: 0.88,
    clearcoat: 0.28,
    clearcoatRoughness: 0.22,
    envMapIntensity: 1.25,
  });

  // Scene 4 ghosted face-frame comparison wireframe
  const ghostWireframeMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#d18d43"),
    wireframe: true,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });

  const system: WoodMaterialSystem = {
    woodMaterial,
    interiorMaterial,
    counterMaterial,
    metalMaterial,
    bronzeMaterial,
    ghostWireframeMaterial,
    wipeUniforms,
    currentFinish: "premium-oak",
    prevFinish: "premium-oak",
    envMap: null,

    setFinishImmediate(finish: FinishSlug) {
      const set = bank[finish];
      // Called every frame by the render loops: skip when nothing changed.
      if (
        system.currentFinish === finish &&
        system.prevFinish === finish &&
        woodMaterial.map === set.diff &&
        wipeUniforms.uWipeProgress.value === 1.0
      ) {
        return;
      }
      const hadMaps = Boolean(woodMaterial.map && woodMaterial.normalMap && woodMaterial.roughnessMap);
      system.prevFinish = finish;
      system.currentFinish = finish;
      const spec = FINISHES[finish];
      woodMaterial.map = set.diff;
      woodMaterial.normalMap = set.nor;
      woodMaterial.roughnessMap = set.rough;
      woodMaterial.clearcoat = spec.clearcoat;
      woodMaterial.clearcoatRoughness = spec.clearcoatRoughness;
      woodMaterial.roughness = spec.roughnessScale;
      woodMaterial.normalScale.set(spec.normalScale, spec.normalScale);
      wipeUniforms.uPrevMap.value = set.diff;
      wipeUniforms.uWipeProgress.value = 1.0;
      wipeUniforms.uWipeIntensity.value = 0.0;
      wipeUniforms.uEdgeTint.value.set(spec.edgeHex);
      // Swapping one texture for another needs no recompile; only gaining maps does.
      if (!hadMaps) woodMaterial.needsUpdate = true;
    },

    setFinishTransition(from: FinishSlug, to: FinishSlug, progress: number) {
      const p = Math.max(0, Math.min(1, progress));
      const setFrom = bank[from];
      const setTo = bank[to];
      const specFrom = FINISHES[from];
      const specTo = FINISHES[to];

      system.prevFinish = from;
      system.currentFinish = to;

      if (woodMaterial.map !== setTo.diff) {
        woodMaterial.map = setTo.diff;
        woodMaterial.normalMap = setTo.nor;
        woodMaterial.roughnessMap = setTo.rough;
      }
      wipeUniforms.uPrevMap.value = setFrom.diff;
      wipeUniforms.uWipeProgress.value = p;
      // Luminous grazing band peaks smoothly while sweeping across [0.02..0.98], zero at rest
      const bell = Math.sin(p * Math.PI);
      wipeUniforms.uWipeIntensity.value = from === to ? 0 : bell * 0.95;

      woodMaterial.clearcoat = THREE.MathUtils.lerp(specFrom.clearcoat, specTo.clearcoat, p);
      woodMaterial.clearcoatRoughness = THREE.MathUtils.lerp(
        specFrom.clearcoatRoughness,
        specTo.clearcoatRoughness,
        p
      );
      woodMaterial.roughness = THREE.MathUtils.lerp(
        specFrom.roughnessScale,
        specTo.roughnessScale,
        p
      );
      const ns = THREE.MathUtils.lerp(specFrom.normalScale, specTo.normalScale, p);
      woodMaterial.normalScale.set(ns, ns);
      wipeUniforms.uEdgeTint.value
        .set(specFrom.edgeHex)
        .lerp(_edgeTo.set(specTo.edgeHex), p);
    },

    setGrainDrawOn(progress: number) {
      wipeUniforms.uGrainDrawOn.value = Math.max(0, Math.min(1, progress));
    },

    async loadFinishHiRes(finish: FinishSlug) {
      if (bank[finish].upgraded) return;
      bank[finish].upgraded = true;

      const loadSingle = async (
        mapType: "diff" | "nor" | "rough",
        isSRGB: boolean
      ): Promise<THREE.Texture> => {
        if (ktx2Loader) {
          try {
            const ktxTex = await ktx2Loader.loadAsync(
              `/textures/ktx2/${finish}_${mapType}.ktx2`
            );
            return configureTexture(ktxTex, isSRGB);
          } catch {
            // Fall back smoothly to WebP high-res
          }
        }
        const webpTex = await texLoader.loadAsync(
          `/textures/hi/${finish}_${mapType}.webp`
        );
        return configureTexture(webpTex, isSRGB);
      };

      try {
        const [diff, nor, rough] = await Promise.all([
          loadSingle("diff", true),
          loadSingle("nor", false),
          loadSingle("rough", false),
        ]);
        const old = bank[finish];
        // Upload to the GPU now, while nothing is moving, not on first use mid-scroll.
        uploadNow(diff, nor, rough);
        bank[finish] = { diff, nor, rough, upgraded: true };
        if (system.currentFinish === finish) {
          woodMaterial.map = diff;
          woodMaterial.normalMap = nor;
          woodMaterial.roughnessMap = rough;
          woodMaterial.needsUpdate = true;
        }
        if (system.prevFinish === finish) {
          wipeUniforms.uPrevMap.value = diff;
        }
        // Clean up low-res placeholder safely if distinct
        if (old.diff !== diff) old.diff.dispose();
        if (old.nor !== nor && old.nor !== flatNor) old.nor.dispose();
        if (old.rough !== rough && old.rough !== midRough) old.rough.dispose();
      } catch {
        bank[finish].upgraded = false;
      }
    },

    loadAllHiResInBackground() {
      const rest: FinishSlug[] = ["iron-black", "classic-walnut", "frosty-white", "ivory-oak"];
      rest.forEach((slug, i) => {
        setTimeout(() => {
          void system.loadFinishHiRes(slug);
        }, 350 + i * 280);
      });
    },

    dispose() {
      woodMaterial.dispose();
      interiorMaterial.dispose();
      counterMaterial.dispose();
      metalMaterial.dispose();
      bronzeMaterial.dispose();
      ghostWireframeMaterial.dispose();
      for (const slug of FINISH_ORDER) {
        bank[slug].diff.dispose();
        if (bank[slug].nor !== flatNor) bank[slug].nor.dispose();
        if (bank[slug].rough !== midRough) bank[slug].rough.dispose();
      }
      flatNor.dispose();
      midRough.dispose();
      ktx2Loader?.dispose();
      system.envMap?.dispose();
    },
  };

  // Phase 1: Instant low-res WebP load for all finishes (~70 KB total), trigger Scene 0 ready immediately!
  Promise.all(
    FINISH_ORDER.map(async (slug) => {
      try {
        const [diff, nor, rough] = await Promise.all([
          texLoader.loadAsync(`/textures/low/${slug}_diff.webp`),
          texLoader.loadAsync(`/textures/low/${slug}_nor.webp`),
          texLoader.loadAsync(`/textures/low/${slug}_rough.webp`),
        ]);
        if (!bank[slug].upgraded) {
          bank[slug].diff = configureTexture(diff, true);
          bank[slug].nor = configureTexture(nor, false);
          bank[slug].rough = configureTexture(rough, false);
          uploadNow(bank[slug].diff, bank[slug].nor, bank[slug].rough);
          if (system.currentFinish === slug) {
            system.setFinishImmediate(slug);
          }
        }
      } catch {
        // Keep solid swatch fallback
      }
    })
  ).then(() => {
    onScene0Ready?.();
    // Phase 2: Immediately upgrade hero Premium Oak to KTX2, then background-load remaining 4 finishes
    void system.loadFinishHiRes("premium-oak").then(() => {
      system.loadAllHiResInBackground();
    });
  });

  // Load warm architectural studio HDRI asynchronously
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const rgbe = new RGBELoader();
  rgbe.load(
    "/env/studio.hdr",
    (hdrTex) => {
      const envRT = pmrem.fromEquirectangular(hdrTex);
      system.envMap = envRT.texture;
      woodMaterial.envMap = system.envMap;
      interiorMaterial.envMap = system.envMap;
      counterMaterial.envMap = system.envMap;
      metalMaterial.envMap = system.envMap;
      bronzeMaterial.envMap = system.envMap;
      woodMaterial.needsUpdate = true;
      hdrTex.dispose();
      pmrem.dispose();
    },
    undefined,
    () => {
      pmrem.dispose();
    }
  );

  return system;
}

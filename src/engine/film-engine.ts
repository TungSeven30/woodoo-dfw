import * as THREE from "three";
import {
  CeilingHeightFt,
  CollectionSlug,
  FinishSlug,
  LayoutId,
  resolveFinishForCollection,
} from "@/config/site";
import { ROOM_LAYOUTS } from "@/config/layouts";
import {
  CabinetPanelSpec,
  IN_TO_M,
  generateHeroCabinet,
  generateLayoutPanels,
} from "./cabinet-generator";
import {
  MorphPair,
  buildLayoutMorph,
  easeDockSpring,
  evalCurvedFlight,
} from "./layout-morpher";
import {
  buildFlatSlabDoorGeometry,
  buildHingeGeometry,
  buildPinGeometry,
  buildPullHandleGeometry,
  buildShakerDoorGeometry,
  buildUnitPanelBoxGeometry,
} from "./geometry";
import {
  WoodMaterialSystem,
  createEngravedCodeTexture,
  createWoodMaterialSystem,
} from "./materials";
import { AdaptiveQualityProbe, QualityProfile } from "./device-tier";
import { CinematicPostComposer } from "./postprocess";
import type { CabinetrySoundEngine } from "./sound";

export interface Scene7ConfigState {
  layout: LayoutId;
  collection: CollectionSlug;
  finish: FinishSlug;
  ceiling: CeilingHeightFt;
}

export interface FilmFrameTelemetry {
  progress: number;
  sceneIndex: number;
  activeLayout: LayoutId;
  activeCollection: CollectionSlug;
  activeFinish: FinishSlug;
  activeCeiling: CeilingHeightFt;
  reconfigBeatIndex: number;
  macroRevealProgress: number; // 0..1 during Scene 3 for SVG 2mm dimension draw-on
  planOverlayOpacity: number; // 0..1 during Scene 7 for hairline CAD lines
  splitDoorsVisible: boolean;
  hoveredDoor: "trade" | "home" | null;
  drawCalls: number;
  fps: number;
}

interface PooledInstances {
  woodBox: THREE.InstancedMesh;
  doorTraditional: THREE.InstancedMesh;
  doorSlim: THREE.InstancedMesh;
  doorFlat: THREE.InstancedMesh;
  interiorBox: THREE.InstancedMesh;
  counterBox: THREE.InstancedMesh;
  metalPin: THREE.InstancedMesh;
  metalHinge: THREE.InstancedMesh;
  bronzePull: THREE.InstancedMesh;
}

const MAX_INSTANCES = 260;

/**
 * Complete 9-Scene Continuous Scroll Film WebGL Engine.
 * Zero camera cuts. Scroll progress t in [0, 1] is the deterministic timeline.
 * Scrubbing backward smoothly un-builds and re-builds every cabinet and room.
 */
export class WoodooFilmEngine {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private materials: WoodMaterialSystem;
  private post: CinematicPostComposer | null = null;
  private quality: QualityProfile;
  private probe = new AdaptiveQualityProbe();
  private sound: CabinetrySoundEngine | null = null;

  // Lighting & Atmosphere
  private keyLight!: THREE.DirectionalLight;
  private fillLight!: THREE.DirectionalLight;
  private rimLight!: THREE.SpotLight;
  private ambientLight!: THREE.HemisphereLight;
  private dustPoints: THREE.Points | null = null;
  private dustMaterial: THREE.ShaderMaterial | null = null;
  private lightConeMesh: THREE.Mesh | null = null;

  // Architectural room stage (floor, back wall, pendants, bath mirror, Scene 3 reveal baffle)
  private floorMesh!: THREE.Mesh;
  private backWallMesh!: THREE.Mesh;
  private pendantsGroup!: THREE.Group;
  private pendantBulbs: THREE.MeshStandardMaterial[] = [];
  private bathMirrorGroup!: THREE.Group;
  private macroShadowBaffle!: THREE.Mesh;

  // Scene 0–4 Hero Cabinet & Engraved Codes & Scene 4 Ghost Wireframe
  private heroPanels: CabinetPanelSpec[] = [];
  private heroEngravedPlanes: THREE.Mesh[] = [];
  private ghostFrameGroup!: THREE.Group;

  // Precomputed Scene 5–6 Layouts & Hungarian Morphs
  private panelsLShape: CabinetPanelSpec[] = [];
  private panelsGalley: CabinetPanelSpec[] = [];
  private panelsIsland: CabinetPanelSpec[] = [];
  private panelsVanity: CabinetPanelSpec[] = [];
  private morphLtoG: MorphPair[] = [];
  private morphGtoI: MorphPair[] = [];
  private morphItoV: MorphPair[] = [];

  // Scene 7 Live Interactive Morphing State
  private scene7State: Scene7ConfigState = {
    layout: "l-shape",
    collection: "traditional-shaker",
    finish: "premium-oak",
    ceiling: 9,
  };
  private scene7PrevPanels: CabinetPanelSpec[] = [];
  private scene7TargetPanels: CabinetPanelSpec[] = [];
  private scene7MorphPairs: MorphPair[] = [];
  private scene7PrevFinish: FinishSlug = "premium-oak";
  private scene7MorphAnim = 1.0; // 0..1 over 1.2s when user changes controls
  private scene7UserTouched = false;

  // Scene 8 Two Monumental Split Doors
  private splitDoorsGroup!: THREE.Group;
  private tradeDoorPivot!: THREE.Group;
  private homeDoorPivot!: THREE.Group;
  private tradeDoorLight!: THREE.PointLight;
  private homeDoorLight!: THREE.PointLight;
  private tradeDoorMesh!: THREE.Mesh;
  private homeDoorMesh!: THREE.Mesh;
  private hoveredDoor: "trade" | "home" | null = null;
  private enteringDoor: "trade" | "home" | null = null;
  private doorEnterProgress = 0;
  private tradeDoorAngle = 0;
  private homeDoorAngle = 0;

  // Pooled GPU InstancedMeshes (keeps draw calls ultra-low!)
  private pool!: PooledInstances;

  // State & Loop
  private scrollTarget = 0;
  private scrollCurrent = 0;
  private grainLoadProgress = 0.25;
  private firstFrameMarked = false;
  private lastShadowScroll = -1;
  private disposed = false;
  private rafId = 0;
  private clock = new THREE.Clock();
  private lastTime = 0;
  private smoothFps = 60;
  private lastSoundDockBucket = -1;
  private lastWipeBeat = -1;
  private onTelemetry?: (t: FilmFrameTelemetry) => void;
  private onFirstFrame?: () => void;
  private onDoorNavigate?: (target: "trade" | "home") => void;

  // Scratch vectors/matrices (zero per-frame heap allocations!)
  private _mat = new THREE.Matrix4();
  private _pos = new THREE.Vector3();
  private _quat = new THREE.Quaternion();
  private _scale = new THREE.Vector3();
  private _camPos = new THREE.Vector3();
  private _camLook = new THREE.Vector3();
  private _raycaster = new THREE.Raycaster();
  private _pointer = new THREE.Vector2(-99, -99);

  constructor(
    canvas: HTMLCanvasElement,
    quality: QualityProfile,
    callbacks: {
      onTelemetry?: (t: FilmFrameTelemetry) => void;
      onFirstFrame?: () => void;
      onDoorNavigate?: (target: "trade" | "home") => void;
    } = {}
  ) {
    this.canvas = canvas;
    this.quality = quality;
    this.onTelemetry = callbacks.onTelemetry;
    this.onFirstFrame = callbacks.onFirstFrame;
    this.onDoorNavigate = callbacks.onDoorNavigate;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !quality.enablePostProcessing,
      powerPreference: "high-performance",
      alpha: false,
      preserveDrawingBuffer: true, // supports crisp high-res snapshot / verification captures
    });
    this.renderer.setPixelRatio(quality.dpr);
    this.renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, false);
    // Khronos PBR Neutral keeps the real veneer colour (ACES pushed oak toward orange)
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 0.94;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#0f0e0d");
    this.scene.fog = new THREE.FogExp2("#100f0e", 0.04);

    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(
      quality.isPortrait ? 52 : 38,
      w / Math.max(1, h),
      0.015,
      45
    );

    this.materials = createWoodMaterialSystem(this.renderer, () => {
      // Textures ready -> smoothly finish Scene 0 grain draw-on
      this.grainLoadProgress = 1.0;
    });

    if (quality.enablePostProcessing) {
      const postScale = quality.tier === "B" ? 0.65 : 1.0;
      this.post = new CinematicPostComposer(this.renderer, w, h, postScale);
    }

    this.buildLighting();
    this.buildArchitecturalStage();
    this.buildInstancedPool();
    this.buildHeroAndLayouts();
    this.buildGhostFaceFrame();
    this.buildSplitDoors();
    if (quality.enableVolumetrics) {
      this.buildVolumetricDust();
    }

    this.lastTime = performance.now();
    this.loop();
  }

  private buildLighting(): void {
    // Late Texas afternoon raking key light (3800K warm golden-white)
    // Soft, near-neutral key (≈4300 K) from high camera-left: product-shot falloff, not a sunset
    this.keyLight = new THREE.DirectionalLight("#fff2e3", 2.7);
    this.keyLight.position.set(-3.6, 6.2, 4.4);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(this.quality.shadowMapSize, this.quality.shadowMapSize);
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 18;
    const d = 4.6;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0004;
    this.keyLight.shadow.normalBias = 0.018;
    this.keyLight.shadow.radius = 6;
    this.scene.add(this.keyLight);

    // Cool architectural sky fill from opposite flank
    this.fillLight = new THREE.DirectionalLight("#e3e8f0", 0.42);
    this.fillLight.position.set(5.2, 2.4, 3.0);
    this.scene.add(this.fillLight);

    // Dramatic warm grazing rim spotlight for Scenes 0–2
    this.rimLight = new THREE.SpotLight("#ffeedd", 7.5, 14, Math.PI / 4.6, 0.85, 1.4);
    this.rimLight.position.set(2.6, 3.0, -2.4);
    this.rimLight.target.position.set(0, 0.5, 0);
    this.scene.add(this.rimLight);
    this.scene.add(this.rimLight.target);

    // Soft warm studio hemisphere fill
    this.ambientLight = new THREE.HemisphereLight("#f3f1ed", "#15120f", 0.34);
    this.scene.add(this.ambientLight);

    this.buildStudioSweep();
  }

  /**
   * Seamless studio sweep behind every scene: a camera-centred gradient dome with a soft
   * horizon glow, so objects sit in graded light instead of a flat black void.
   */
  private studioSweep: THREE.Mesh | null = null;
  private studioSweepMat: THREE.ShaderMaterial | null = null;
  private buildStudioSweep(): void {
    this.studioSweepMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTop: { value: new THREE.Color("#0b0a09") },
        uHorizon: { value: new THREE.Color("#2a2622") },
        uFloor: { value: new THREE.Color("#0d0c0b") },
        uGlow: { value: 1.0 },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTop;
        uniform vec3 uHorizon;
        uniform vec3 uFloor;
        uniform float uGlow;
        varying vec3 vDir;
        void main() {
          float y = vDir.y;
          float band = exp(-pow((y - 0.06) / 0.32, 2.0));
          vec3 sky = mix(uTop, uHorizon, band * uGlow);
          vec3 col = y < 0.0 ? mix(uFloor, sky, smoothstep(-0.25, 0.0, y)) : sky;
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });
    this.studioSweep = new THREE.Mesh(new THREE.SphereGeometry(30, 48, 24), this.studioSweepMat);
    this.studioSweep.renderOrder = -10;
    this.studioSweep.frustumCulled = false;
    this.scene.add(this.studioSweep);
  }

  private buildArchitecturalStage(): void {
    // Architectural honed micro-cement floor plane
    const floorGeo = new THREE.PlaneGeometry(28, 28);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#1a1715"),
      roughness: 0.78,
      metalness: 0.05,
    });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.position.y = -0.002;
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);

    // Warm architectural plaster wall + honed limestone backsplash strip for Scenes 5–7
    const wallGroup = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#4a443d"),
      roughness: 0.92,
      metalness: 0.0,
    });
    const plasterWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 5.4), wallMat);
    plasterWall.position.set(0, 2.65, -1.42);
    plasterWall.receiveShadow = true;
    wallGroup.add(plasterWall);

    // Subtle warm travertine backsplash band meeting cleanly in a razor inside-corner miter
    const splashMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#dcd4c7"),
      roughness: 0.44,
      clearcoat: 0.18,
      clearcoatRoughness: 0.45,
    });
    const ledMat = new THREE.MeshBasicMaterial({ color: "#ffe3b0" });

    const splashBack = new THREE.Mesh(new THREE.PlaneGeometry(3.22, 0.54), splashMat);
    splashBack.name = "splashBack";
    splashBack.position.set(0.18, 1.15, -1.39);
    splashBack.receiveShadow = true;
    wallGroup.add(splashBack);

    // 3000K recessed under-cabinet LED task strip + warm grazing light along back run
    const ledBack = new THREE.Mesh(new THREE.BoxGeometry(2.72, 0.014, 0.022), ledMat);
    ledBack.name = "ledBack";
    ledBack.position.set(0.12, 1.375, -1.24);
    wallGroup.add(ledBack);

    const underLightBack = new THREE.PointLight("#ffdba6", 1.85, 3.8, 1.8);
    underLightBack.name = "underLightBack";
    underLightBack.position.set(0.12, 1.31, -1.06);
    wallGroup.add(underLightBack);

    const splashRight = new THREE.Mesh(new THREE.PlaneGeometry(2.98, 0.54), splashMat);
    splashRight.name = "splashRight";
    splashRight.rotation.y = -Math.PI / 2;
    splashRight.position.set(1.78, 1.15, 0.1);
    splashRight.receiveShadow = true;
    wallGroup.add(splashRight);

    const ledRight = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.014, 1.74), ledMat);
    ledRight.name = "ledRight";
    ledRight.position.set(1.62, 1.375, 0.44);
    wallGroup.add(ledRight);

    const underLightRight = new THREE.PointLight("#ffdba6", 1.55, 3.4, 1.8);
    underLightRight.name = "underLightRight";
    underLightRight.position.set(1.44, 1.31, 0.44);
    wallGroup.add(underLightRight);

    // Flush honed quartz corner deck bridge closing the L-shape blind corner cleanly
    const cornerBridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.038, 0.68),
      this.materials.counterMaterial
    );
    cornerBridge.name = "cornerBridge";
    cornerBridge.position.set(1.44, 0.895, -1.06);
    cornerBridge.receiveShadow = true;
    wallGroup.add(cornerBridge);

    this.backWallMesh = wallGroup as unknown as THREE.Mesh;
    this.backWallMesh.visible = false;
    this.scene.add(this.backWallMesh);

    // Shadow baffles sitting exactly inside the 2 mm vertical and horizontal reveals of the hero
    // cabinet (doors span y 0.114–0.719 m; drawer front starts 2 mm above). Sized to the reveal
    // so nothing shows outside the seams.
    const baffleMat = new THREE.MeshBasicMaterial({ color: "#070606" });
    const baffleGroup = new THREE.Group();
    const vBaffle = new THREE.Mesh(new THREE.PlaneGeometry(0.006, 0.603), baffleMat);
    vBaffle.position.set(0, 0.4168, 0);
    const hBaffle = new THREE.Mesh(new THREE.PlaneGeometry(0.908, 0.006), baffleMat);
    hBaffle.position.set(0, 0.7203, 0);
    baffleGroup.add(vBaffle, hBaffle);
    this.macroShadowBaffle = baffleGroup as unknown as THREE.Mesh;
    this.macroShadowBaffle.position.set(0, 0, 0.3056);
    this.macroShadowBaffle.visible = false;
    this.scene.add(this.macroShadowBaffle);

    // Architectural brass-stem & warm opal glass pendant lights (fade up in Scene 5–6)
    this.pendantsGroup = new THREE.Group();
    const stemMat = new THREE.MeshStandardMaterial({
      color: "#8f7146",
      metalness: 0.85,
      roughness: 0.3,
    });
    const cordGeo = new THREE.CylinderGeometry(0.004, 0.004, 1.3, 8);
    const canopyGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.015, 16);
    const bulbGeo = new THREE.SphereGeometry(0.095, 20, 16);

    for (let i = 0; i < 3; i++) {
      const pGroup = new THREE.Group();
      const cord = new THREE.Mesh(cordGeo, stemMat);
      cord.position.y = 0.65;
      pGroup.add(cord);

      const canopy = new THREE.Mesh(canopyGeo, stemMat);
      canopy.position.y = 1.3;
      pGroup.add(canopy);

      const bulbMat = new THREE.MeshStandardMaterial({
        color: "#fff7ea",
        emissive: new THREE.Color("#ffcf8a"),
        emissiveIntensity: 0.0,
        roughness: 0.25,
      });
      this.pendantBulbs.push(bulbMat);
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      pGroup.add(bulb);

      const pt = new THREE.PointLight("#ffd69e", 0, 4.5, 1.8);
      pt.name = "pendantLight";
      pGroup.add(pt);

      pGroup.visible = false;
      this.pendantsGroup.add(pGroup);
    }
    this.scene.add(this.pendantsGroup);

    // Architectural backlit bath mirror (appears smoothly in Scene 6 Beat 4 Bath Vanity)
    this.bathMirrorGroup = new THREE.Group();
    const mirrorGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(1.75, 0.88),
      new THREE.MeshPhysicalMaterial({
        color: "#d9dce0",
        roughness: 0.08,
        metalness: 0.92,
        clearcoat: 1.0,
      })
    );
    const mirrorGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.82, 0.95),
      new THREE.MeshBasicMaterial({ color: "#ffe3b8" })
    );
    mirrorGlow.position.z = -0.015;
    this.bathMirrorGroup.add(mirrorGlow, mirrorGlass);
    this.bathMirrorGroup.position.set(0.24, 1.48, -0.74);
    this.bathMirrorGroup.visible = false;
    this.scene.add(this.bathMirrorGroup);
  }

  private buildInstancedPool(): void {
    const unitBox = buildUnitPanelBoxGeometry();
    const tradShaker = buildShakerDoorGeometry(1, 1, 1, 0.145, 0.115, 0.36);
    const slimShaker = buildShakerDoorGeometry(1, 1, 1, 0.06, 0.052, 0.32);
    const flatSlab = buildFlatSlabDoorGeometry();
    const pinGeo = buildPinGeometry();
    const hingeGeo = buildHingeGeometry();
    const pullGeo = buildPullHandleGeometry();

    const makePool = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      cap: number,
      castShadow = true
    ) => {
      const mesh = new THREE.InstancedMesh(geo, mat, cap);
      mesh.count = 0;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      return mesh;
    };

    this.pool = {
      woodBox: makePool(unitBox, this.materials.woodMaterial, MAX_INSTANCES, true),
      doorTraditional: makePool(tradShaker, this.materials.woodMaterial, MAX_INSTANCES, true),
      doorSlim: makePool(slimShaker, this.materials.woodMaterial, MAX_INSTANCES, true),
      doorFlat: makePool(flatSlab, this.materials.woodMaterial, MAX_INSTANCES, true),
      interiorBox: makePool(unitBox, this.materials.interiorMaterial, MAX_INSTANCES, true),
      counterBox: makePool(unitBox, this.materials.counterMaterial, 48, true),
      metalPin: makePool(pinGeo, this.materials.metalMaterial, 40, false),
      metalHinge: makePool(hingeGeo, this.materials.metalMaterial, 24, false),
      bronzePull: makePool(pullGeo, this.materials.bronzeMaterial, 128, false),
    };
  }

  private buildHeroAndLayouts(): void {
    const merge = this.quality.mergeSmallParts;
    this.heroPanels = generateHeroCabinet("traditional-shaker", 9, merge);

    // Create subtle laser-engraved part code planes for top hero panels visible in Scene 1 close-up
    const codeSamples = this.heroPanels.filter(
      (p) => p.category === "door" || p.category === "drawer" || p.category === "carcass"
    ).slice(0, 6);

    codeSamples.forEach((p) => {
      const mmW = Math.round(p.size[0] * 1000);
      const mmH = Math.round(p.size[1] * 1000);
      const mmD = Math.round(p.size[2] * 1000);
      const tex = createEngravedCodeTexture(
        p.partCode,
        `${mmW} × ${mmH} × ${mmD} MM · 2.0 MM SYSTEM`
      );
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.048), mat);
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(p.flatPos[0] + 0.12, p.flatPos[1] + 0.013, p.flatPos[2] + 0.14);
      plane.visible = false;
      this.scene.add(plane);
      this.heroEngravedPlanes.push(plane);
    });

    // Precompute the 4 core Film room layouts & exact Hungarian morph plans!
    this.panelsLShape = generateLayoutPanels("l-shape", "traditional-shaker", "premium-oak", 9, merge);
    this.panelsGalley = generateLayoutPanels("galley", "slim-shaker", "iron-black", 9, merge);
    this.panelsIsland = generateLayoutPanels("island", "flat", "classic-walnut", 10, merge);
    this.panelsVanity = generateLayoutPanels("vanity", "flat", "frosty-white", 8, merge);

    this.morphLtoG = buildLayoutMorph(this.panelsLShape, this.panelsGalley);
    this.morphGtoI = buildLayoutMorph(this.panelsGalley, this.panelsIsland);
    this.morphItoV = buildLayoutMorph(this.panelsIsland, this.panelsVanity);

    // Default Scene 7 interactive room starts from L-Shape (or transitions from Vanity when scrolling down!)
    this.scene7PrevPanels = this.panelsVanity;
    this.scene7TargetPanels = this.panelsLShape;
    this.scene7MorphPairs = buildLayoutMorph(this.panelsVanity, this.panelsLShape);
  }

  /** Scene 4 translucent wireframe face-frame + center stile ghost for visual proof */
  private buildGhostFaceFrame(): void {
    this.ghostFrameGroup = new THREE.Group();
    const w = 36 * IN_TO_M; // 0.9144 m
    const boxH = 30 * IN_TO_M; // 0.762 m above toe kick
    const tkH = 4.5 * IN_TO_M;
    const zFace = 12 * IN_TO_M + 0.006;
    const railW = 0.052; // bulky ~2" traditional face frame + center stile!
    const mat = this.materials.ghostWireframeMaterial;

    const addBar = (sx: number, sy: number, px: number, py: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, 0.022), mat);
      m.position.set(px, py, zFace);
      this.ghostFrameGroup.add(m);
    };

    // Left frame stile, right frame stile, top/bottom rails, and intrusive vertical CENTER STILE!
    addBar(railW, boxH, -w / 2 + railW / 2, tkH + boxH / 2);
    addBar(railW, boxH, w / 2 - railW / 2, tkH + boxH / 2);
    addBar(w - railW * 2, railW, 0, tkH + boxH - railW / 2);
    addBar(w - railW * 2, railW, 0, tkH + railW / 2);
    addBar(railW * 1.15, boxH - railW * 2, 0, tkH + boxH / 2); // The center stile frameless eliminates!

    this.ghostFrameGroup.visible = false;
    this.scene.add(this.ghostFrameGroup);
  }

  /** Scene 8: Two monumental 3D cabinet doors standing side by side ("For the trade." / "For my home.") */
  private buildSplitDoors(): void {
    this.splitDoorsGroup = new THREE.Group();
    this.splitDoorsGroup.position.set(0, 0, 0);

    const doorW = 0.96;
    const doorH = 2.08;
    const doorT = 0.036;
    const gap = 0.14;

    // Dark architectural portal frames behind each door with glowing warm interior light
    const frameMat = new THREE.MeshStandardMaterial({
      color: "#0e0c0b",
      roughness: 0.9,
    });
    const backGlowMat = new THREE.MeshBasicMaterial({
      color: "#e6a458",
    });

    const makePortalDoor = (
      side: "trade" | "home",
      xCenter: number,
      geo: THREE.BufferGeometry
    ) => {
      // Interior golden glow backdrop inside doorway
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(doorW - 0.06, doorH - 0.06), backGlowMat);
      glow.position.set(xCenter, doorH / 2 + 0.04, -0.18);
      this.splitDoorsGroup.add(glow);

      // Architectural surround frame
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(doorW + 0.08, doorH + 0.08, 0.16),
        frameMat
      );
      frame.position.set(xCenter, doorH / 2 + 0.04, -0.27);
      this.splitDoorsGroup.add(frame);

      // Real hinged pivot on outer vertical edge so doors swing open majestically!
      const pivot = new THREE.Group();
      const hingeX = side === "trade" ? xCenter - doorW / 2 : xCenter + doorW / 2;
      pivot.position.set(hingeX, doorH / 2 + 0.04, 0);

      const mat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#ffffff"),
        roughness: 0.56,
        metalness: 0.02,
        clearcoat: 0.24,
        clearcoatRoughness: 0.38,
      });

      const doorFinish = side === "trade" ? "iron-black" : "premium-oak";
      const tl = new THREE.TextureLoader();
      tl.load(`/textures/hi/${doorFinish}_diff.webp`, (tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        mat.map = tex;
        mat.needsUpdate = true;
      });
      tl.load(`/textures/hi/${doorFinish}_nor.webp`, (tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        mat.normalMap = tex;
        mat.normalScale.set(0.75, 0.75);
        mat.needsUpdate = true;
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.x = side === "trade" ? doorW / 2 : -doorW / 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { splitDoor: side };
      pivot.add(mesh);

      // Subtle architectural vertical brass pull edge
      const pull = new THREE.Mesh(
        new THREE.BoxGeometry(0.012, 0.28, 0.024),
        new THREE.MeshStandardMaterial({ color: "#c29254", metalness: 0.88, roughness: 0.28 })
      );
      pull.position.set(
        side === "trade" ? doorW - 0.05 : -(doorW - 0.05),
        -0.08,
        doorT / 2 + 0.012
      );
      pivot.add(pull);

      const spillLight = new THREE.PointLight("#ffbe70", 0, 5.0, 1.5);
      spillLight.position.set(xCenter, doorH * 0.52, -0.05);
      this.splitDoorsGroup.add(spillLight);
      this.splitDoorsGroup.add(pivot);

      return { pivot, mesh, spillLight };
    };

    const leftDoor = makePortalDoor(
      "trade",
      -(doorW / 2 + gap / 2),
      buildShakerDoorGeometry(doorW, doorH, doorT, 0.07, 0.055, 0.32)
    );
    const rightDoor = makePortalDoor(
      "home",
      doorW / 2 + gap / 2,
      buildShakerDoorGeometry(doorW, doorH, doorT, 0.145, 0.105, 0.36)
    );

    this.tradeDoorPivot = leftDoor.pivot;
    this.tradeDoorMesh = leftDoor.mesh;
    this.tradeDoorLight = leftDoor.spillLight;

    this.homeDoorPivot = rightDoor.pivot;
    this.homeDoorMesh = rightDoor.mesh;
    this.homeDoorLight = rightDoor.spillLight;

    // Soft grazing spotlight illuminating the Iron Black Slim Shaker grain & recessed border
    const tradeRim = new THREE.SpotLight("#fff0dd", 9.0, 7, Math.PI / 4, 0.85, 1.2);
    tradeRim.position.set(-1.6, 2.35, 1.85);
    tradeRim.target.position.set(-0.55, 1.05, 0);
    this.splitDoorsGroup.add(tradeRim, tradeRim.target);

    this.splitDoorsGroup.visible = false;
    this.scene.add(this.splitDoorsGroup);
  }

  /** Subtle warm volumetric dust motes in the raking key light beam (Scenes 0–2, Tier A) */
  private buildVolumetricDust(): void {
    const count = 240;
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 3.8;
      positions[i * 3 + 1] = Math.random() * 2.5 + 0.05;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 3.2;
      phases[i] = Math.random() * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

    this.dustMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.65 },
        uColor: { value: new THREE.Color("#ffdba8") },
      },
      vertexShader: `
        attribute float aPhase;
        uniform float uTime;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          p.y += sin(uTime * 0.25 + aPhase) * 0.08;
          p.x += cos(uTime * 0.18 + aPhase * 1.3) * 0.06;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = clamp(22.0 / -mv.z, 1.5, 5.0);
          gl_Position = projectionMatrix * mv;
          vAlpha = 0.35 + 0.65 * sin(uTime * 0.6 + aPhase);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float soft = smoothstep(0.5, 0.08, d);
          gl_FragColor = vec4(uColor, soft * vAlpha * uOpacity * 0.45);
        }
      `,
    });

    this.dustPoints = new THREE.Points(geo, this.dustMaterial);
    this.scene.add(this.dustPoints);
  }

  public setSoundEngine(sound: CabinetrySoundEngine | null): void {
    this.sound = sound;
  }

  public setScrollTarget(t: number, immediate = false): void {
    const clamped = Math.max(0, Math.min(1, t));
    this.scrollTarget = clamped;
    if (immediate) {
      this.scrollCurrent = clamped;
      this.evaluateFrame(clamped, 0.016, performance.now() * 0.001);
    }
  }

  public setHoveredDoor(door: "trade" | "home" | null): void {
    this.hoveredDoor = door;
  }

  public triggerDoorEnter(door: "trade" | "home"): void {
    if (this.enteringDoor) return;
    this.enteringDoor = door;
    this.doorEnterProgress = 0;
    this.sound?.playHingeClick();
    this.sound?.playSoftSlide();
  }

  public updatePointer(clientX: number, clientY: number): "trade" | "home" | null {
    const rect = this.canvas.getBoundingClientRect();
    this._pointer.x = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    this._pointer.y = -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;

    if (this.splitDoorsGroup.visible) {
      this._raycaster.setFromCamera(this._pointer, this.camera);
      const hits = this._raycaster.intersectObjects([this.tradeDoorMesh, this.homeDoorMesh], false);
      const hitDoor = (hits[0]?.object?.userData?.splitDoor as "trade" | "home" | undefined) ?? null;
      this.hoveredDoor = hitDoor;
      return hitDoor;
    }
    return null;
  }

  /** Interactive live update inside Scene 7 ("Your turn") */
  public updateScene7Config(partial: Partial<Scene7ConfigState>): Scene7ConfigState {
    const nextCollection = partial.collection ?? this.scene7State.collection;
    const nextFinish = resolveFinishForCollection(
      nextCollection,
      partial.finish ?? this.scene7State.finish
    );
    const nextLayout = partial.layout ?? this.scene7State.layout;
    const nextCeiling = partial.ceiling ?? this.scene7State.ceiling;

    const changed =
      nextLayout !== this.scene7State.layout ||
      nextCollection !== this.scene7State.collection ||
      nextFinish !== this.scene7State.finish ||
      nextCeiling !== this.scene7State.ceiling;

    if (changed) {
      const prevFinish = this.scene7State.finish;
      const prevPanels =
        this.scene7UserTouched
          ? this.scene7TargetPanels
          : this.panelsVanity;
      this.scene7State = {
        layout: nextLayout,
        collection: nextCollection,
        finish: nextFinish,
        ceiling: nextCeiling,
      };
      this.scene7UserTouched = true;
      this.scene7PrevFinish = prevFinish;
      this.scene7PrevPanels = prevPanels;
      this.scene7TargetPanels = generateLayoutPanels(
        nextLayout,
        nextCollection,
        nextFinish,
        nextCeiling,
        this.quality.mergeSmallParts
      );
      this.scene7MorphPairs = buildLayoutMorph(this.scene7PrevPanels, this.scene7TargetPanels);
      this.scene7MorphAnim = 0.0;

      void this.materials.loadFinishHiRes(nextFinish);
      this.sound?.playLightWipeBrush();
      this.sound?.playWoodTock(0.6);
    }

    return { ...this.scene7State };
  }

  public getScene7Config(): Scene7ConfigState {
    return { ...this.scene7State };
  }

  public resize(width: number, height: number): void {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    this.quality.isPortrait = h > w;
    this.camera.aspect = w / h;
    this.camera.fov = this.quality.isPortrait ? 52 : 38;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.post?.resize(w, h);
  }

  private resetPools(): {
    woodBox: number;
    doorTraditional: number;
    doorSlim: number;
    doorFlat: number;
    interiorBox: number;
    counterBox: number;
    metalPin: number;
    metalHinge: number;
    bronzePull: number;
  } {
    return {
      woodBox: 0,
      doorTraditional: 0,
      doorSlim: 0,
      doorFlat: 0,
      interiorBox: 0,
      counterBox: 0,
      metalPin: 0,
      metalHinge: 0,
      bronzePull: 0,
    };
  }

  private pushInstance(
    counts: ReturnType<WoodooFilmEngine["resetPools"]>,
    zone: CabinetPanelSpec["materialZone"],
    geomKind: CabinetPanelSpec["geometryKind"],
    pos: THREE.Vector3,
    quat: THREE.Quaternion,
    scale: THREE.Vector3
  ): void {
    this._mat.compose(pos, quat, scale);
    if (zone === "counter") {
      if (counts.counterBox < 48) {
        this.pool.counterBox.setMatrixAt(counts.counterBox++, this._mat);
      }
      return;
    }
    if (zone === "bronze") {
      if (counts.bronzePull < 128) {
        this.pool.bronzePull.setMatrixAt(counts.bronzePull++, this._mat);
      }
      return;
    }
    if (zone === "metal") {
      if (geomKind === "hardware-hinge") {
        if (counts.metalHinge < 24) this.pool.metalHinge.setMatrixAt(counts.metalHinge++, this._mat);
      } else {
        if (counts.metalPin < 40) this.pool.metalPin.setMatrixAt(counts.metalPin++, this._mat);
      }
      return;
    }
    if (zone === "interior") {
      if (counts.interiorBox < MAX_INSTANCES) {
        this.pool.interiorBox.setMatrixAt(counts.interiorBox++, this._mat);
      }
      return;
    }
    // Wood exterior
    if (geomKind === "door-traditional-shaker") {
      if (counts.doorTraditional < MAX_INSTANCES) {
        this.pool.doorTraditional.setMatrixAt(counts.doorTraditional++, this._mat);
      }
    } else if (geomKind === "door-slim-shaker") {
      if (counts.doorSlim < MAX_INSTANCES) {
        this.pool.doorSlim.setMatrixAt(counts.doorSlim++, this._mat);
      }
    } else if (geomKind === "door-flat") {
      if (counts.doorFlat < MAX_INSTANCES) {
        this.pool.doorFlat.setMatrixAt(counts.doorFlat++, this._mat);
      }
    } else {
      if (counts.woodBox < MAX_INSTANCES) {
        this.pool.woodBox.setMatrixAt(counts.woodBox++, this._mat);
      }
    }
  }

  private commitPools(counts: ReturnType<WoodooFilmEngine["resetPools"]>): void {
    const keys = Object.keys(counts) as Array<keyof typeof counts>;
    for (const k of keys) {
      const mesh = this.pool[k];
      mesh.count = counts[k];
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /** Helper: renders a MorphPair array at progress u in [0, 1] */
  private renderMorphPairs(
    counts: ReturnType<WoodooFilmEngine["resetPools"]>,
    pairs: MorphPair[],
    u: number
  ): void {
    const clampedU = Math.max(0, Math.min(1, u));
    for (let i = 0; i < pairs.length; i++) {
      const mp = pairs[i];
      const localU = Math.max(0, Math.min(1, (clampedU - mp.staggerStart) / mp.duration));
      if (mp.mode === "exit" && localU >= 0.98) continue;
      if (mp.mode === "enter" && localU <= 0.02) continue;

      evalCurvedFlight(
        mp.posFrom,
        mp.posTo,
        mp.quatFrom,
        mp.quatTo,
        mp.arcHeight,
        mp.arcSide,
        localU,
        this._pos,
        this._quat
      );

      // Smoothly interpolate panel dimensions during morph; slight scale-in/out on enter/exit
      const dimT = easeDockSpring(localU);
      let sMult = 1.0;
      if (mp.mode === "enter") sMult = Math.min(1, localU * 4);
      if (mp.mode === "exit") sMult = Math.max(0.01, (1 - localU) * 4);

      this._scale.set(
        THREE.MathUtils.lerp(mp.sizeFrom[0], mp.sizeTo[0], dimT) * sMult,
        THREE.MathUtils.lerp(mp.sizeFrom[1], mp.sizeTo[1], dimT) * sMult,
        THREE.MathUtils.lerp(mp.sizeFrom[2], mp.sizeTo[2], dimT) * sMult
      );

      // Switch door profile geometry cleanly as the light-wipe crosses midpoint!
      const geomKind = localU < 0.5 ? mp.geometryKindFrom : mp.geometryKindTo;
      this.pushInstance(counts, mp.materialZone, geomKind, this._pos, this._quat, this._scale);
    }
  }

  private updatePendants(layoutId: LayoutId, intensity: number): void {
    const layout = ROOM_LAYOUTS[layoutId];
    const children = this.pendantsGroup.children;
    for (let i = 0; i < children.length; i++) {
      const g = children[i];
      const spec = layout.pendants[i];
      if (!spec || intensity <= 0.01) {
        g.visible = false;
      } else {
        g.visible = true;
        g.position.set(spec.xIn * IN_TO_M, 1.98, spec.zIn * IN_TO_M);
        this.pendantBulbs[i].emissiveIntensity = intensity * 1.45;
        const pt = g.getObjectByName("pendantLight") as THREE.PointLight | undefined;
        if (pt) pt.intensity = intensity * 2.2;
      }
    }
  }

  private evaluateFrame(t: number, dt: number, elapsedSec: number): void {
    const counts = this.resetPools();
    const isP = this.quality.isPortrait;

    // Default visibility resets
    this.ghostFrameGroup.visible = false;
    this.backWallMesh.visible = false;
    this.bathMirrorGroup.visible = false;
    this.splitDoorsGroup.visible = false;
    this.heroEngravedPlanes.forEach((p) => (p.visible = false));

    let sceneIndex = 0;
    let activeLayout: LayoutId = "l-shape";
    let activeCollection: CollectionSlug = "traditional-shaker";
    let activeFinish: FinishSlug = "premium-oak";
    let activeCeiling: CeilingHeightFt = 9;
    let reconfigBeatIndex = 0;
    let macroRevealProgress = 0;
    let planOverlayOpacity = 0;
    let macroDof = 0;

    // Atmosphere dust intensity fades smoothly after Scene 2
    const dustOpacity = THREE.MathUtils.clamp(1 - (t - 0.25) / 0.12, 0, 1);
    if (this.dustMaterial) {
      this.dustMaterial.uniforms.uTime.value = elapsedSec;
      this.dustMaterial.uniforms.uOpacity.value = dustOpacity;
    }
    if (this.lightConeMesh) {
      this.lightConeMesh.visible = dustOpacity > 0.02;
      (this.lightConeMesh.material as THREE.MeshBasicMaterial).opacity = dustOpacity * 0.032;
    }

    // Scene 0 grain draw-on progression
    if (this.grainLoadProgress < 1) {
      this.grainLoadProgress = Math.min(1, this.grainLoadProgress + dt * 0.8);
    }
    this.materials.setGrainDrawOn(t < 0.04 ? Math.max(this.grainLoadProgress, 0.35 + t * 18) : 1.0);

    // =========================================================================
    // SCENES 0, 1, 2, 3, 4 (0.00 -> 0.48): HERO PANEL -> FLAT PACK -> FLIGHT -> 2MM -> NO FRAME
    // =========================================================================
    if (t < 0.48) {
      this.materials.setFinishImmediate("premium-oak");
      this.updatePendants("l-shape", 0);

      // Smooth warm-dark floor
      (this.floorMesh.material as THREE.MeshStandardMaterial).color.set("#191614");

      if (t < 0.05) {
        // SCENE 0: Single floating Premium Oak panel framed cleanly in dark void
        sceneIndex = 0;
        const u0 = t / 0.05;
        const heroDoor = this.heroPanels.find((p) => p.partCode.includes("DR-L")) ?? this.heroPanels[0];

        const hoverY = THREE.MathUtils.lerp(0.56, heroDoor.flatPos[1] + 0.14, THREE.MathUtils.smoothstep(u0, 0.48, 1.0));
        const hoverX = THREE.MathUtils.lerp(isP ? 0 : 0.24, heroDoor.flatPos[0], THREE.MathUtils.smoothstep(u0, 0.48, 1.0));
        this._pos.set(hoverX, hoverY + Math.sin(elapsedSec * 0.8) * 0.012 * (1 - u0), 0);

        const spinQ = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(
            THREE.MathUtils.lerp(0.08, -Math.PI / 2, THREE.MathUtils.smoothstep(u0, 0.55, 1.0)),
            THREE.MathUtils.lerp(-0.42 + Math.sin(elapsedSec * 0.4) * 0.12, 0, THREE.MathUtils.smoothstep(u0, 0.45, 1.0)),
            0.03 * (1 - u0)
          )
        );
        this._scale.set(heroDoor.size[0], heroDoor.size[1], heroDoor.size[2]);
        this.pushInstance(counts, "wood", "door-traditional-shaker", this._pos, spinQ, this._scale);

        if (u0 > 0.55) {
          const stackFade = (u0 - 0.55) / 0.45;
          for (const p of this.heroPanels) {
            if (p === heroDoor) continue;
            this._pos.set(p.flatPos[0], p.flatPos[1] - (1 - stackFade) * 0.22, p.flatPos[2]);
            this._quat.set(...p.flatQuat);
            this._scale.set(p.size[0] * stackFade, p.size[1] * stackFade, p.size[2] * stackFade);
            this.pushInstance(counts, p.materialZone, p.geometryKind, this._pos, this._quat, this._scale);
          }
        }

        this._camPos.set(
          THREE.MathUtils.lerp(isP ? 0.0 : -0.14, isP ? 0.45 : 0.68, u0),
          THREE.MathUtils.lerp(0.62, 0.72, u0),
          THREE.MathUtils.lerp(isP ? 1.75 : 1.54, isP ? 1.85 : 1.56, u0)
        );
        this._camLook.set(THREE.MathUtils.lerp(isP ? 0 : 0.14, 0, u0), THREE.MathUtils.lerp(0.55, 0.24, u0), 0);
      } else if (t < 0.15) {
        // SCENE 1: The flat pack (sliced loaf of material + readable engraved part codes!)
        sceneIndex = 1;
        const u1 = (t - 0.05) / 0.1;

        for (const p of this.heroPanels) {
          this._pos.set(...p.flatPos);
          this._quat.set(...p.flatQuat);
          this._scale.set(...p.size);
          this.pushInstance(counts, p.materialZone, p.geometryKind, this._pos, this._quat, this._scale);
        }

        const codeOp = Math.sin(u1 * Math.PI) * 0.92;
        this.heroEngravedPlanes.forEach((plane, idx) => {
          plane.visible = codeOp > 0.04;
          (plane.material as THREE.MeshBasicMaterial).opacity = codeOp;
          plane.position.y = 0.04 + idx * 0.028;
        });

        const angle = THREE.MathUtils.lerp(0.45, -0.58, u1);
        const dist = isP ? THREE.MathUtils.lerp(1.65, 2.0, u1) : THREE.MathUtils.lerp(1.25, 1.65, u1);
        this._camPos.set(
          Math.sin(angle) * dist,
          THREE.MathUtils.lerp(0.64, 0.85, u1),
          Math.cos(angle) * dist
        );
        this._camLook.set(0, 0.2, 0);
      } else if (t < 0.30) {
        // SCENE 2: THE FLIGHT (Signature Moment #1 — non-colliding staggered trajectories + forward door approach!)
        sceneIndex = 2;
        const u2 = (t - 0.15) / 0.15;

        const dockBucket = Math.floor(u2 * 14);
        if (dockBucket !== this.lastSoundDockBucket && dockBucket > 1 && dockBucket < 13) {
          this.lastSoundDockBucket = dockBucket;
          if (dockBucket === 9 || dockBucket === 10) {
            this.sound?.playHingeClick();
          } else {
            this.sound?.playWoodTock(dockBucket < 5 ? 0.85 : 0.45);
          }
        }

        for (let i = 0; i < this.heroPanels.length; i++) {
          const p = this.heroPanels[i];
          const startAt = p.dockOrder * 0.34;
          const dur = 0.54;
          const localU = Math.max(0, Math.min(1, (u2 - startAt) / dur));

          // Doors and drawer fronts approach cleanly from +Z front & outward flanks so they NEVER clip carcass shelves!
          let arcH = 0.46 + (i % 4) * 0.15;
          let arcSide = (i % 2 === 0 ? 1 : -1) * (0.28 + (i % 3) * 0.1);
          const adjustedStart: [number, number, number] = [...p.flatPos];
          if (p.category === "door" || p.category === "drawer") {
            arcH = p.category === "drawer" ? 0.62 : 0.34;
            arcSide = p.hingeSide === "left" ? -0.52 : p.hingeSide === "right" ? 0.52 : 0;
          } else if (p.category === "back") {
            arcH = 0.82;
            arcSide = 0;
          }

          evalCurvedFlight(
            adjustedStart,
            p.assembledPos,
            p.flatQuat,
            p.assembledQuat,
            arcH,
            arcSide,
            localU,
            this._pos,
            this._quat
          );

          // Keep doors & drawers proudly clear in +Z during mid-flight so they approach straight onto hinges
          if ((p.category === "door" || p.category === "drawer") && localU > 0.05 && localU < 0.98) {
            this._pos.z += Math.sin(localU * Math.PI) * 0.42;
          }
          // Back panel slides cleanly downward from behind (-Z)
          if (p.category === "back" && localU > 0.05 && localU < 0.98) {
            this._pos.z -= Math.sin(localU * Math.PI) * 0.25;
          }

          this._scale.set(...p.size);
          this.pushInstance(counts, p.materialZone, p.geometryKind, this._pos, this._quat, this._scale);
        }

        const orbitAngle = THREE.MathUtils.lerp(-0.56, 0.38, THREE.MathUtils.smoothstep(u2, 0, 1));
        const radius = isP ? THREE.MathUtils.lerp(2.6, 2.55, u2) : THREE.MathUtils.lerp(2.3, 2.05, u2);
        this._camPos.set(
          Math.sin(orbitAngle) * radius,
          THREE.MathUtils.lerp(0.98, 0.72, u2),
          Math.cos(orbitAngle) * radius
        );
        this._camLook.set(0, THREE.MathUtils.lerp(0.48, 0.46, u2), 0);
      } else if (t < 0.40) {
        // SCENE 3: TWO MILLIMETRES — Macro dive right into the exact 2.0 mm door reveal canyon!
        sceneIndex = 3;
        const u3 = (t - 0.30) / 0.10;

        for (const p of this.heroPanels) {
          this._pos.set(...p.assembledPos);
          this._quat.set(...p.assembledQuat);
          this._scale.set(...p.size);
          this.pushInstance(counts, p.materialZone, p.geometryKind, this._pos, this._quat, this._scale);
        }

        const dive =
          u3 < 0.45
            ? THREE.MathUtils.smoothstep(u3, 0, 0.45)
            : u3 < 0.72
              ? 1.0
              : 1.0 - THREE.MathUtils.smoothstep(u3, 0.72, 1.0);

        macroRevealProgress = THREE.MathUtils.smoothstep(dive, 0.55, 0.98);
        macroDof = this.quality.enableDoF ? macroRevealProgress * 0.95 : 0;

        const doorFrontZ = 12 * IN_TO_M + 0.02;
        const macroZ = doorFrontZ + (isP ? 0.115 : 0.088);
        const farZ = isP ? 1.95 : 1.58;
        const startX = THREE.MathUtils.lerp(0.65 * (1 - u3), 0, dive);

        this._camPos.set(
          startX * (1 - dive),
          THREE.MathUtils.lerp(0.72, 0.42, dive),
          THREE.MathUtils.lerp(farZ, macroZ, dive)
        );
        this._camLook.set(0, 0.42, doorFrontZ - 0.02);
      } else {
        // SCENE 4: NO FRAME (0.40 -> 0.48) — Doors swing wide open framing the unobstructed interior + ghost face frame!
        sceneIndex = 4;
        const u4 = (t - 0.40) / 0.08;
        const openAmt =
          u4 < 0.25
            ? THREE.MathUtils.smoothstep(u4, 0, 0.25)
            : u4 < 0.85
              ? 1.0
              : 1.0 - THREE.MathUtils.smoothstep(u4, 0.85, 1.0);
        const swingRad = openAmt * 1.72;

        const ghostAlpha = Math.sin(THREE.MathUtils.clamp((u4 - 0.18) / 0.62, 0, 1) * Math.PI);
        this.ghostFrameGroup.visible = ghostAlpha > 0.02;
        this.materials.ghostWireframeMaterial.opacity = ghostAlpha * 0.82;

        const shelfShift = Math.sin(THREE.MathUtils.clamp((u4 - 0.22) / 0.55, 0, 1) * Math.PI) * 0.06;

        for (const p of this.heroPanels) {
          this._pos.set(...p.assembledPos);
          this._quat.set(...p.assembledQuat);
          this._scale.set(...p.size);

          if (p.category === "door" && p.hingeSide) {
            const halfW = p.size[0] / 2;
            const sign = p.hingeSide === "left" ? -1 : 1;
            const hingeX = p.assembledPos[0] + sign * halfW;
            const hingeZ = p.assembledPos[2] - p.size[2] / 2;
            const ang = p.hingeSide === "left" ? -swingRad : swingRad;

            const dx = -sign * halfW;
            const dz = p.size[2] / 2;
            const cosA = Math.cos(ang);
            const sinA = Math.sin(ang);
            this._pos.set(
              hingeX + dx * cosA + dz * sinA,
              p.assembledPos[1],
              hingeZ - dx * sinA + dz * cosA
            );
            const rotQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ang);
            this._quat.multiply(rotQ);
          } else if (p.category === "shelf" && p.shelfIndex !== null) {
            this._pos.y += p.shelfIndex === 0 ? -shelfShift : shelfShift;
          }

          this.pushInstance(counts, p.materialZone, p.geometryKind, this._pos, this._quat, this._scale);
        }

        // Frame cleanly so BOTH open Shaker doors flank the bright interior and entire ghosted face-frame fits in view!
        const insideT = Math.sin(THREE.MathUtils.clamp((u4 - 0.12) / 0.72, 0, 1) * Math.PI);
        this._camPos.set(
          Math.sin(u4 * 1.2) * 0.14,
          THREE.MathUtils.lerp(0.72, 0.56, insideT),
          THREE.MathUtils.lerp(isP ? 2.1 : 1.68, isP ? 1.52 : 1.24, insideT)
        );
        this._camLook.set(0, 0.44, -0.05);
      }
    }
    // =========================================================================
    // SCENE 5 (0.48 -> 0.65): THE KITCHEN COMPOSES ITSELF (100% locked by t=0.595!)
    // =========================================================================
    else if (t < 0.65) {
      sceneIndex = 5;
      activeLayout = "l-shape";
      activeCollection = "traditional-shaker";
      activeFinish = "premium-oak";
      activeCeiling = 9;
      this.materials.setFinishImmediate("premium-oak");

      const u5 = (t - 0.48) / 0.17;
      this.backWallMesh.visible = true;
      (this.floorMesh.material as THREE.MeshStandardMaterial).color
        .set("#1a1715")
        .lerp(new THREE.Color("#2b2621"), THREE.MathUtils.smoothstep(u5, 0.1, 0.7));

      // Complete entire kitchen assembly cleanly by u5 = 0.72, starting with energetic arrival right at t=0.50!
      for (let i = 0; i < this.panelsLShape.length; i++) {
        const p = this.panelsLShape[i];
        const startAt = Math.min(0.42, p.waveOrder * 0.3 + p.dockOrder * 0.12);
        const dur = 0.34;
        const localU = Math.max(0, Math.min(1, (u5 + 0.14 - startAt) / dur));
        if (localU <= 0.005) continue;

        const arcH = p.category === "counter" ? 0.6 : 0.42 + (i % 4) * 0.16;
        const arcSide = (i % 2 === 0 ? 1 : -1) * 0.22;
        evalCurvedFlight(
          p.flatPos,
          p.assembledPos,
          p.flatQuat,
          p.assembledQuat,
          arcH,
          arcSide,
          localU,
          this._pos,
          this._quat
        );
        const sIn = Math.min(1, localU * 5);
        this._scale.set(p.size[0] * sIn, p.size[1] * sIn, p.size[2] * sIn);
        this.pushInstance(counts, p.materialZone, p.geometryKind, this._pos, this._quat, this._scale);
      }

      const pendGlow = THREE.MathUtils.smoothstep(u5, 0.52, 0.82);
      this.updatePendants("l-shape", pendGlow);

      const camZ = isP ? THREE.MathUtils.lerp(2.6, 5.9, u5) : THREE.MathUtils.lerp(2.3, 4.95, u5);
      const camX = THREE.MathUtils.lerp(0.15, isP ? -1.5 : -2.25, u5);
      this._camPos.set(camX, THREE.MathUtils.lerp(0.95, isP ? 2.2 : 1.92, u5), camZ);
      this._camLook.set(0.15, THREE.MathUtils.lerp(0.55, 1.28, u5), -0.35);
    }
    // =========================================================================
    // SCENE 6 (0.65 -> 0.82): RECONFIGURATION — FOUR ROOMS WITHOUT A CUT!
    // =========================================================================
    else if (t < 0.82) {
      sceneIndex = 6;
      const u6 = (t - 0.65) / 0.17;
      this.backWallMesh.visible = true;
      (this.floorMesh.material as THREE.MeshStandardMaterial).color.set("#2b2621");

      if (u6 < 0.34) {
        const local = THREE.MathUtils.smoothstep(u6, 0.08, 0.28);
        reconfigBeatIndex = local < 0.5 ? 0 : 1;
        activeLayout = local < 0.5 ? "l-shape" : "galley";
        activeCollection = local < 0.5 ? "traditional-shaker" : "slim-shaker";
        activeFinish = local < 0.5 ? "premium-oak" : "iron-black";
        activeCeiling = 9;

        if (local > 0.12 && local < 0.85 && this.lastWipeBeat !== 1) {
          this.lastWipeBeat = 1;
          this.sound?.playLightWipeBrush();
        }
        this.materials.setFinishTransition("premium-oak", "iron-black", local);
        this.renderMorphPairs(counts, this.morphLtoG, local);
        this.updatePendants(activeLayout, 1.0);
      } else if (u6 < 0.68) {
        const local = THREE.MathUtils.smoothstep(u6, 0.38, 0.58);
        reconfigBeatIndex = local < 0.5 ? 1 : 2;
        activeLayout = local < 0.5 ? "galley" : "island";
        activeCollection = local < 0.5 ? "slim-shaker" : "flat";
        activeFinish = local < 0.5 ? "iron-black" : "classic-walnut";
        activeCeiling = local < 0.5 ? 9 : 10;

        if (local > 0.12 && local < 0.85 && this.lastWipeBeat !== 2) {
          this.lastWipeBeat = 2;
          this.sound?.playLightWipeBrush();
        }
        this.materials.setFinishTransition("iron-black", "classic-walnut", local);
        this.renderMorphPairs(counts, this.morphGtoI, local);
        this.updatePendants(activeLayout, 1.0);
      } else {
        const local = THREE.MathUtils.smoothstep(u6, 0.72, 0.92);
        reconfigBeatIndex = local < 0.5 ? 2 : 3;
        activeLayout = local < 0.5 ? "island" : "vanity";
        activeCollection = "flat";
        activeFinish = local < 0.5 ? "classic-walnut" : "frosty-white";
        activeCeiling = local < 0.5 ? 10 : 8;

        if (local > 0.12 && local < 0.85 && this.lastWipeBeat !== 3) {
          this.lastWipeBeat = 3;
          this.sound?.playLightWipeBrush();
        }
        this.materials.setFinishTransition("classic-walnut", "frosty-white", local);
        this.renderMorphPairs(counts, this.morphItoV, local);
        this.updatePendants(activeLayout, 1.0 - local * 0.25);

        this.bathMirrorGroup.visible = local > 0.55;
        const mScale = THREE.MathUtils.smoothstep(local, 0.55, 0.95);
        this.bathMirrorGroup.scale.setScalar(Math.max(0.01, mScale));
      }

      // Generous architectural framing so 10 ft stacked uppers + 3-inch crown breathe cleanly in viewport!
      const orbitA = THREE.MathUtils.lerp(-0.42, 0.3, u6);
      const distRoom = isP
        ? THREE.MathUtils.lerp(6.1, 4.1, THREE.MathUtils.smoothstep(u6, 0.68, 1.0))
        : THREE.MathUtils.lerp(5.2, 3.35, THREE.MathUtils.smoothstep(u6, 0.68, 1.0));
      this._camPos.set(
        Math.sin(orbitA) * distRoom,
        THREE.MathUtils.lerp(2.0, 1.52, u6),
        Math.cos(orbitA) * distRoom + 0.4
      );
      this._camLook.set(0, THREE.MathUtils.lerp(1.36, 1.08, u6), -0.35);
    }
    // =========================================================================
    // SCENE 7 (0.82 -> 0.92): YOUR TURN — TOP-DOWN ARCHITECTURAL PLAN + LIVE CONTROLS!
    // =========================================================================
    else if (t < 0.92) {
      sceneIndex = 7;
      const u7 = (t - 0.82) / 0.10;
      this.backWallMesh.visible = true;

      if (this.scene7MorphAnim < 1.0) {
        this.scene7MorphAnim = Math.min(1.0, this.scene7MorphAnim + dt / 1.15);
      }

      if (!this.scene7UserTouched) {
        activeLayout = "vanity";
        activeCollection = "flat";
        activeFinish = "frosty-white";
        activeCeiling = 8;
        this.materials.setFinishImmediate("frosty-white");
        this.bathMirrorGroup.visible = true;
        this.bathMirrorGroup.scale.setScalar(1);
        for (const p of this.panelsVanity) {
          this._pos.set(...p.assembledPos);
          this._quat.set(...p.assembledQuat);
          this._scale.set(...p.size);
          this.pushInstance(counts, p.materialZone, p.geometryKind, this._pos, this._quat, this._scale);
        }
      } else {
        activeLayout = this.scene7State.layout;
        activeCollection = this.scene7State.collection;
        activeFinish = this.scene7State.finish;
        activeCeiling = this.scene7State.ceiling;
        this.materials.setFinishTransition(
          this.scene7PrevFinish,
          this.scene7State.finish,
          this.scene7MorphAnim
        );
        this.renderMorphPairs(counts, this.scene7MorphPairs, this.scene7MorphAnim);
        this.bathMirrorGroup.visible = activeLayout === "vanity" && this.scene7MorphAnim > 0.6;
      }

      this.updatePendants(activeLayout, 0.35);
      planOverlayOpacity = THREE.MathUtils.smoothstep(u7, 0.18, 0.5) * (1 - THREE.MathUtils.smoothstep(u7, 0.84, 1.0));

      const rise = THREE.MathUtils.smoothstep(u7, 0.0, 0.36);
      const descend = THREE.MathUtils.smoothstep(u7, 0.85, 1.0);
      const topAmt = rise * (1 - descend);

      const planH = isP ? 6.9 : 5.6;
      this._camPos.set(
        THREE.MathUtils.lerp(0.9, isP ? 0 : -0.45, topAmt),
        THREE.MathUtils.lerp(1.52, planH, topAmt),
        THREE.MathUtils.lerp(3.25, 1.35, topAmt)
      );
      this._camLook.set(isP ? 0 : -0.25, 0.45, -0.25);
    }
    // =========================================================================
    // SCENE 8 (0.92 -> 1.00): THE SPLIT — TWO MONUMENTAL 3D CABINET DOORS
    // =========================================================================
    else {
      sceneIndex = 8;
      const u8 = (t - 0.92) / 0.08;
      this.updatePendants("l-shape", 0);
      (this.floorMesh.material as THREE.MeshStandardMaterial).color.set("#141210");

      this.splitDoorsGroup.visible = true;
      const riseT = THREE.MathUtils.smoothstep(u8, 0, 0.42);
      this.splitDoorsGroup.position.y = THREE.MathUtils.lerp(-1.8, 0, riseT);

      // Slight 5° architectural crack at rest lets a crisp sliver of warm Texas light peek out!
      const targetTrade =
        this.enteringDoor === "trade"
          ? 1.65
          : this.hoveredDoor === "trade"
            ? 0.36
            : 0.09;
      const targetHome =
        this.enteringDoor === "home"
          ? -1.65
          : this.hoveredDoor === "home"
            ? -0.36
            : -0.09;

      this.tradeDoorAngle = THREE.MathUtils.lerp(this.tradeDoorAngle, targetTrade, Math.min(1, dt * 7));
      this.homeDoorAngle = THREE.MathUtils.lerp(this.homeDoorAngle, targetHome, Math.min(1, dt * 7));

      this.tradeDoorPivot.rotation.y = this.tradeDoorAngle;
      this.homeDoorPivot.rotation.y = this.homeDoorAngle;

      this.tradeDoorLight.intensity = Math.abs(this.tradeDoorAngle) * 16 + 1.2;
      this.homeDoorLight.intensity = Math.abs(this.homeDoorAngle) * 16 + 1.2;

      // Doors sit in the upper two-thirds; the two choice cards occupy the lower band.
      const baseCamZ = isP ? 7.3 : 6.2;
      let camX = 0;
      const camY = isP ? 0.6 : 0.9;
      let camZ = baseCamZ;
      let lookX = 0;

      if (this.enteringDoor) {
        this.doorEnterProgress = Math.min(1, this.doorEnterProgress + dt * 1.4);
        const fly = THREE.MathUtils.smoothstep(this.doorEnterProgress, 0, 1);
        const doorX = this.enteringDoor === "trade" ? -0.55 : 0.55;
        camX = THREE.MathUtils.lerp(0, doorX, fly);
        lookX = doorX * fly;
        camZ = THREE.MathUtils.lerp(baseCamZ, -0.35, fly);
        if (this.doorEnterProgress >= 0.96) {
          const dest = this.enteringDoor;
          this.enteringDoor = null;
          this.onDoorNavigate?.(dest);
        }
      }

      this._camPos.set(camX, camY, camZ);
      this._camLook.set(lookX, isP ? -0.57 : 0.51, 0);
    }

    // Toggle travertine backsplash panels & recessed 3000K under-cabinet LED strips strictly to match active layout
    const wallGrp = this.backWallMesh as unknown as THREE.Group;
    if (wallGrp.visible) {
      const showBack = activeLayout === "l-shape" || activeLayout === "island" || activeLayout === "u-shape" || activeLayout === "galley";
      const showRight = activeLayout === "l-shape";
      for (const n of ["splashBack", "ledBack", "underLightBack"]) {
        const obj = wallGrp.getObjectByName(n);
        if (obj) obj.visible = showBack;
      }
      for (const n of ["splashRight", "ledRight", "underLightRight", "cornerBridge"]) {
        const obj = wallGrp.getObjectByName(n);
        if (obj) obj.visible = showRight;
      }
    }
    // Show razor obsidian shadow reveal baffle strictly behind the 2 mm gap during Scene 3 macro dive
    this.macroShadowBaffle.visible = sceneIndex === 3 || (sceneIndex === 2 && t > 0.27);

    // Per-scene light balance: the rooms (scenes 5–7) carry darker finishes and more area, so
    // the ambient fill lifts there; the hero object scenes stay contrasty.
    const roomAmt = THREE.MathUtils.smoothstep(t, 0.47, 0.55) * (1 - THREE.MathUtils.smoothstep(t, 0.91, 0.94));
    this.ambientLight.intensity = THREE.MathUtils.lerp(0.34, 0.62, roomAmt);
    this.keyLight.intensity = THREE.MathUtils.lerp(2.7, 3.1, roomAmt);
    this.fillLight.intensity = THREE.MathUtils.lerp(0.42, 0.7, roomAmt);

    // Apply camera & commit instanced pools
    if (this.studioSweep) this.studioSweep.position.copy(this._camPos);
    this.camera.position.copy(this._camPos);
    this.camera.lookAt(this._camLook);
    this.commitPools(counts);

    // Update shadow map on demand whenever geometry, camera scroll, or doors animate
    if (
      this.manualStepping ||
      Math.abs(t - this.lastShadowScroll) > 0.0004 ||
      this.scene7MorphAnim < 0.99 ||
      sceneIndex === 8
    ) {
      this.renderer.shadowMap.needsUpdate = true;
      this.lastShadowScroll = t;
    }

    // Render frame (direct or via single-pass cinematic post-processing)
    let totalDrawCalls = 0;
    if (this.post) {
      totalDrawCalls = this.post.render(this.scene, this.camera, {
        time: elapsedSec,
        macroDof,
        bloomStrength: sceneIndex === 8 ? 0.34 : 0.2,
      });
    } else {
      this.renderer.render(this.scene, this.camera);
      totalDrawCalls = this.renderer.info.render.calls;
    }

    if (!this.firstFrameMarked) {
      this.firstFrameMarked = true;
      try {
        performance.mark("film-first-webgl-frame");
      } catch {
        // ignore
      }
      this.onFirstFrame?.();
    }

    this.onTelemetry?.({
      progress: t,
      sceneIndex,
      activeLayout,
      activeCollection,
      activeFinish,
      activeCeiling,
      reconfigBeatIndex,
      macroRevealProgress,
      planOverlayOpacity,
      splitDoorsVisible: this.splitDoorsGroup.visible && t >= 0.93,
      hoveredDoor: this.hoveredDoor,
      drawCalls: totalDrawCalls,
      fps: Math.round(this.smoothFps),
    });
  }

  private manualStepping = false;

  public setManualStepping(enabled: boolean): void {
    this.manualStepping = enabled;
    if (enabled) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    } else if (!this.disposed && !this.rafId) {
      this.lastTime = performance.now();
      this.loop();
    }
  }

  private loop = (): void => {
    if (this.disposed || this.manualStepping) return;
    this.rafId = requestAnimationFrame(this.loop);

    const now = performance.now();
    const deltaMs = Math.min(100, Math.max(1, now - this.lastTime));
    this.lastTime = now;
    const dt = deltaMs / 1000;
    this.smoothFps = this.smoothFps * 0.9 + (1000 / deltaMs) * 0.1;

    // Adaptive quality check during first 2 seconds
    const probeRes = this.probe.recordFrame(deltaMs, now);
    if (probeRes === "step-down-dpr") {
      this.renderer.setPixelRatio(1);
    } else if (probeRes === "step-down-tier-b") {
      this.renderer.setPixelRatio(1);
      if (this.post) {
        this.post.dispose();
        this.post = null;
      }
      if (this.dustPoints) this.dustPoints.visible = false;
      if (this.lightConeMesh) this.lightConeMesh.visible = false;
    }

    // Ultra-responsive inertial catch-up (< 1 frame perceived lag behind Lenis scroll!)
    const diff = this.scrollTarget - this.scrollCurrent;
    if (Math.abs(diff) < 0.00015) {
      this.scrollCurrent = this.scrollTarget;
    } else {
      this.scrollCurrent += diff * Math.min(1, dt * 18);
    }

    this.evaluateFrame(this.scrollCurrent, dt, this.clock.getElapsedTime());
  };

  public captureDataUrl(): string {
    return this.canvas.toDataURL("image/png");
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    this.post?.dispose();
    this.materials.dispose();
    this.renderer.dispose();
  }
}

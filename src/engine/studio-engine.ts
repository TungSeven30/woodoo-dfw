import {
  buildRoomProps,
  createRoomPropMaterials,
  disposeRoomProps,
  setRoomPropEnvMap,
  setRoomPropsAppear,
} from "./room-props";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import {
  CeilingHeightFt,
  CollectionSlug,
  FinishSlug,
  LayoutId,
  SITE_CONFIG,
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
import { WoodMaterialSystem, createWoodMaterialSystem } from "./materials";
import { ROOM_COLORS, makeOakFloorTexture } from "./room-look";
import type { CabinetrySoundEngine } from "./sound";

export type StudioViewMode = "perspective" | "plan" | "walk-around";
export type StudioSceneMode =
  | "configurator" // Full /compose room studio
  | "collection-door" // Single hero cabinet/door showcase on /collections/[slug]
  | "precision-macro" // Interactive 2 mm reveal & frameless ghost toggle on /precision
  | "confirm-pack"; // Small 3D flat-pack -> cabinet assembly confirmation on form submit

export interface StudioConfig {
  mode: StudioSceneMode;
  layout: LayoutId;
  collection: CollectionSlug;
  finish: FinishSlug;
  ceiling: CeilingHeightFt;
  view: StudioViewMode;
  /** Stretch goal: Texas daylight slider 0 (morning) -> 0.5 (midday) -> 0.8 (late afternoon) -> 1 (golden hour) */
  timeOfDay: number;
  /** Optional interactive states for single-cabinet showcases */
  doorsOpen?: boolean;
  showGhostFrame?: boolean;
  macroZoom?: boolean;
}

const MAX_POOL = 260;

/**
 * Reusable Interactive 3D Studio Engine powering:
 * - /compose full-screen configurator (5 layouts, 3 collections, valid finishes, 8/9/10 ft ceilings, views, time-of-day, PNG still & glTF AR export)
 * - /collections/[slug] interactive 3D cabinet hero
 * - /precision interactive 2 mm reveal & frameless interior hero
 * - Form submission 3D flat-pack assembly confirmation animation
 */
const StudioUpAxis = new THREE.Vector3(0, 1, 0);

export class WoodooStudioEngine {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private materials: WoodMaterialSystem;
  private sound: CabinetrySoundEngine | null = null;

  private keyLight!: THREE.DirectionalLight;
  private fillLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.HemisphereLight;
  private pendantsGroup!: THREE.Group;
  private ghostFrameGroup!: THREE.Group;

  private pool!: {
    woodBox: THREE.InstancedMesh;
    doorTraditional: THREE.InstancedMesh;
    doorSlim: THREE.InstancedMesh;
    doorFlat: THREE.InstancedMesh;
    interiorBox: THREE.InstancedMesh;
    counterBox: THREE.InstancedMesh;
    metalPin: THREE.InstancedMesh;
    metalHinge: THREE.InstancedMesh;
    bronzePull: THREE.InstancedMesh;
  };

  private state: StudioConfig;
  private currentPanels: CabinetPanelSpec[] = [];
  private morphPairs: MorphPair[] = [];
  private morphProgress = 1.0;
  private prevFinish: FinishSlug;
  private confirmTimer = 0;

  // Smooth interactive pointer orbit controls (zero external dependencies)
  private orbitYaw = -0.45;
  private orbitPitch = 0.28;
  private orbitDist = 4.5;
  private targetYaw = -0.45;
  private targetPitch = 0.28;
  private targetDist = 4.5;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private doorOpenSmooth = 0;

  private rafId = 0;
  private disposed = false;
  private lastTime = 0;
  private _mat = new THREE.Matrix4();
  private _pos = new THREE.Vector3();
  private _quat = new THREE.Quaternion();
  private _scale = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement, initial: StudioConfig) {
    this.canvas = canvas;
    this.state = {
      ...initial,
      finish: resolveFinishForCollection(initial.collection, initial.finish),
    };
    this.prevFinish = this.state.finish;

    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 520;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    const configurator = initial.mode === "configurator";
    this.scene.background = new THREE.Color(configurator ? ROOM_COLORS.fog : "#161412");
    this.scene.fog = new THREE.FogExp2(configurator ? ROOM_COLORS.fog : "#161412", configurator ? 0.012 : 0.036);

    this.camera = new THREE.PerspectiveCamera(38, w / Math.max(1, h), 0.015, 45);
    this.materials = createWoodMaterialSystem(this.renderer);
    this.materials.setFinishImmediate(this.state.finish);
    void this.materials.loadFinishHiRes(this.state.finish);

    this.setupLighting();
    this.setupStage();
    this.setupPool();
    this.setupGhostFrame();
    this.applyViewPreset(this.state.view, true);
    this.rebuildGeometry(true);
    this.attachPointerControls();
    window.setTimeout(() => this.warmUp(), 300);

    this.lastTime = performance.now();
    this.loop();
  }

  private setupLighting(): void {
    this.keyLight = new THREE.DirectionalLight("#ffe5c2", 3.0);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 18;
    const d = 4.6;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0004;
    this.keyLight.shadow.normalBias = 0.016;
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight("#cfd9ea", 0.8);
    this.fillLight.position.set(-4.5, 3.0, 2.8);
    this.scene.add(this.fillLight);

    this.ambientLight =
      this.state.mode === "configurator"
        ? new THREE.HemisphereLight(ROOM_COLORS.hemiSky, ROOM_COLORS.hemiGround, 0.95)
        : new THREE.HemisphereLight("#f7ece0", "#1e1a17", 0.56);
    this.scene.add(this.ambientLight);

    this.applyTimeOfDay(this.state.timeOfDay);
  }

  private setupStage(): void {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24).rotateX(-Math.PI / 2),
      this.state.mode === "configurator"
        ? new THREE.MeshStandardMaterial({
            color: "#f2ece4",
            map: makeOakFloorTexture(this.renderer, [19, 19]),
            roughness: 0.5,
            envMap: this.materials.roomEnvMap,
            envMapIntensity: 0.35,
          })
        : new THREE.MeshStandardMaterial({ color: "#221e1b", roughness: 0.82, metalness: 0.04 })
    );
    floor.position.y = -0.002;
    floor.receiveShadow = true;
    this.scene.add(floor);

    if (this.state.mode === "configurator") {
      const backWall = new THREE.Mesh(
        new THREE.PlaneGeometry(14, 5.4),
        new THREE.MeshStandardMaterial({ color: ROOM_COLORS.wall, roughness: 0.92 })
      );
      backWall.position.set(0, 2.65, -1.45);
      backWall.receiveShadow = true;
      this.scene.add(backWall);


      // 3000K architectural under-cabinet recessed LED strip & warm grazing light
      const ledStrip = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 0.014, 0.022),
        new THREE.MeshBasicMaterial({ color: "#ffe3b0" })
      );
      ledStrip.position.set(0, 1.375, -1.25);
      // The strip has a fixed width, so it floated free of shorter runs; keep only its light.
      void ledStrip;

      const ledWash = new THREE.PointLight("#ffdba6", 1.9, 4.2, 1.8);
      ledWash.position.set(0, 1.31, -1.06);
      this.scene.add(ledWash);
    }

    this.pendantsGroup = new THREE.Group();
    const stemMat = new THREE.MeshStandardMaterial({ color: "#8f7146", metalness: 0.85, roughness: 0.3 });
    const bulbMat = new THREE.MeshStandardMaterial({
      color: "#fff7ea",
      emissive: new THREE.Color("#ffd08c"),
      emissiveIntensity: 1.35,
      roughness: 0.25,
    });
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group();
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1.3, 8), stemMat);
      cord.position.y = 0.65;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 18, 14), bulbMat);
      const pt = new THREE.PointLight("#ffd69e", 1.8, 4.5, 1.8);
      pt.name = "pendantLight";
      g.add(cord, bulb, pt);
      this.setPendantShown(g, false);
      this.pendantsGroup.add(g);
    }
    this.scene.add(this.pendantsGroup);
  }

  /**
   * Hide a pendant by hiding its meshes and dimming its light to zero. Hiding the whole group
   * would change the scene's light count, which makes three.js recompile every material.
   */
  private setPendantShown(g: THREE.Object3D, shown: boolean): void {
    for (const child of g.children) {
      if ((child as THREE.PointLight).isLight) {
        (child as THREE.PointLight).intensity = shown ? 1.8 : 0;
      } else {
        child.visible = shown;
      }
    }
  }

  private setupPool(): void {
    const makePool = (geo: THREE.BufferGeometry, mat: THREE.Material, cap: number, shadow = true) => {
      const m = new THREE.InstancedMesh(geo, mat, cap);
      m.count = 0;
      m.castShadow = shadow;
      m.receiveShadow = true;
      m.frustumCulled = false;
      this.scene.add(m);
      return m;
    };
    this.pool = {
      woodBox: makePool(buildUnitPanelBoxGeometry(), this.materials.woodMaterial, MAX_POOL),
      doorTraditional: makePool(
        buildShakerDoorGeometry(1, 1, 1, 0.145, 0.115, 0.36),
        this.materials.woodMaterial,
        MAX_POOL
      ),
      doorSlim: makePool(
        buildShakerDoorGeometry(1, 1, 1, 0.06, 0.052, 0.32),
        this.materials.woodMaterial,
        MAX_POOL
      ),
      doorFlat: makePool(buildFlatSlabDoorGeometry(), this.materials.woodMaterial, MAX_POOL),
      interiorBox: makePool(buildUnitPanelBoxGeometry(), this.materials.interiorMaterial, MAX_POOL),
      counterBox: makePool(buildUnitPanelBoxGeometry(), this.materials.counterMaterial, 48),
      metalPin: makePool(buildPinGeometry(), this.materials.metalMaterial, 40, false),
      metalHinge: makePool(buildHingeGeometry(), this.materials.metalMaterial, 24, false),
      bronzePull: makePool(buildPullHandleGeometry(), this.materials.bronzeMaterial, 128, false),
    };
  }

  private setupGhostFrame(): void {
    this.ghostFrameGroup = new THREE.Group();
    const w = 36 * IN_TO_M;
    const boxH = 30 * IN_TO_M;
    const tkH = 4.5 * IN_TO_M;
    const zFace = 12 * IN_TO_M + 0.006;
    const railW = 0.052;
    const mat = this.materials.ghostWireframeMaterial;
    const addBar = (sx: number, sy: number, px: number, py: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, 0.022), mat);
      m.position.set(px, py, zFace);
      this.ghostFrameGroup.add(m);
    };
    addBar(railW, boxH, -w / 2 + railW / 2, tkH + boxH / 2);
    addBar(railW, boxH, w / 2 - railW / 2, tkH + boxH / 2);
    addBar(w - railW * 2, railW, 0, tkH + boxH - railW / 2);
    addBar(w - railW * 2, railW, 0, tkH + railW / 2);
    addBar(railW * 1.15, boxH - railW * 2, 0, tkH + boxH / 2);
    this.ghostFrameGroup.visible = false;
    this.scene.add(this.ghostFrameGroup);
  }

  private applyTimeOfDay(val: number): void {
    const t = Math.max(0, Math.min(1, val));
    // Sweep sun from Texas morning (east, cooler crisp) -> midday (high neutral) -> late afternoon / golden hour (west, warm amber)
    const angle = THREE.MathUtils.lerp(-1.1, 1.05, t);
    const elevation = Math.sin(THREE.MathUtils.lerp(0.35, Math.PI - 0.35, t)) * 5.6 + 1.8;
    this.keyLight.position.set(Math.sin(angle) * 5.8, elevation, Math.cos(angle) * 4.4);

    const morning = new THREE.Color("#f0f4ff");
    const noon = new THREE.Color("#fff8ee");
    const golden = new THREE.Color("#ffd094");
    const col = t < 0.5 ? morning.clone().lerp(noon, t * 2) : noon.clone().lerp(golden, (t - 0.5) * 2);
    this.keyLight.color.copy(col);
    this.keyLight.intensity = THREE.MathUtils.lerp(2.6, 3.35, Math.sin(t * Math.PI * 0.8 + 0.2));
  }

  private applyViewPreset(view: StudioViewMode, immediate = false): void {
    if (this.state.mode !== "configurator") {
      this.targetYaw = this.state.macroZoom ? 0.0 : -0.35;
      this.targetPitch = this.state.macroZoom ? 0.02 : 0.24;
      this.targetDist = this.state.macroZoom ? 0.42 : 1.72;
    } else if (view === "plan") {
      this.targetYaw = 0.0;
      this.targetPitch = 1.34;
      this.targetDist = this.state.layout === "vanity" ? 4.4 : 6.0;
    } else if (view === "walk-around") {
      this.targetYaw = 0.28;
      this.targetPitch = 0.14;
      this.targetDist = this.state.layout === "vanity" ? 3.3 : 4.6;
    } else {
      this.targetYaw = -0.44;
      this.targetPitch = 0.27;
      this.targetDist = this.state.layout === "vanity" ? 4.4 : 6.7;
    }
    if (immediate) {
      this.orbitYaw = this.targetYaw;
      this.orbitPitch = this.targetPitch;
      this.orbitDist = this.targetDist;
    }
  }

  private rebuildGeometry(immediate = false): void {
    const nextPanels =
      this.state.mode === "configurator"
        ? generateLayoutPanels(
            this.state.layout,
            this.state.collection,
            this.state.finish,
            this.state.ceiling,
            false
          )
        : generateHeroCabinet(this.state.collection, this.state.ceiling, false);

    if (immediate || this.currentPanels.length === 0) {
      this.currentPanels = nextPanels;
      this.morphPairs = [];
      this.morphProgress = 1.0;
    } else {
      this.morphPairs = buildLayoutMorph(this.currentPanels, nextPanels);
      this.currentPanels = nextPanels;
      this.morphProgress = 0.0;
    }

    // Appliances, sink, plants: rebuild for the new layout and let them rise in after the cabinets.
    const propsKey = `${this.state.layout}:${this.state.ceiling}`;
    if (this.state.mode === "configurator" && propsKey !== this.propsKey) {
      this.propsKey = propsKey;
      if (this.propsGroup) disposeRoomProps(this.propsGroup);
      this.propsGroup = buildRoomProps(this.propMats, this.state.layout, this.state.ceiling);
      this.propsRiseFrom = immediate ? -1 : this.morphProgress;
      this.scene.add(this.propsGroup);
    }

    // Update pendants in configurator mode
    if (this.state.mode === "configurator") {
      const layout = ROOM_LAYOUTS[this.state.layout];
      this.pendantsGroup.children.forEach((g, idx) => {
        const spec = layout.pendants[idx];
        if (!spec) {
          this.setPendantShown(g, false);
        } else {
          this.setPendantShown(g, true);
          g.position.set(spec.xIn * IN_TO_M, 1.98, spec.zIn * IN_TO_M);
        }
      });
    }
  }

  public setSoundEngine(sound: CabinetrySoundEngine | null): void {
    this.sound = sound;
  }

  public updateConfig(partial: Partial<StudioConfig>): StudioConfig {
    this.settledFrames = 0;
    const nextCollection = partial.collection ?? this.state.collection;
    const nextFinish = resolveFinishForCollection(
      nextCollection,
      partial.finish ?? this.state.finish
    );
    const nextLayout = partial.layout ?? this.state.layout;
    const nextCeiling = partial.ceiling ?? this.state.ceiling;
    const nextView = partial.view ?? this.state.view;
    const nextTime = partial.timeOfDay ?? this.state.timeOfDay;

    const geomChanged =
      nextLayout !== this.state.layout ||
      nextCollection !== this.state.collection ||
      nextCeiling !== this.state.ceiling;
    const finishChanged = nextFinish !== this.state.finish;
    const viewChanged =
      nextView !== this.state.view ||
      partial.macroZoom !== this.state.macroZoom;

    this.prevFinish = this.state.finish;
    this.state = {
      ...this.state,
      ...partial,
      collection: nextCollection,
      finish: nextFinish,
      layout: nextLayout,
      ceiling: nextCeiling,
      view: nextView,
      timeOfDay: nextTime,
    };

    if (partial.timeOfDay !== undefined) {
      this.applyTimeOfDay(nextTime);
    }
    if (viewChanged) {
      this.applyViewPreset(nextView, false);
    }
    if (finishChanged) {
      void this.materials.loadFinishHiRes(nextFinish);
      this.sound?.playLightWipeBrush();
      if (!geomChanged) {
        this.morphPairs = buildLayoutMorph(this.currentPanels, this.currentPanels);
        this.morphProgress = 0.0;
      }
    }
    if (geomChanged) {
      this.rebuildGeometry(false);
      this.sound?.playWoodTock(0.65);
    }

    return { ...this.state };
  }

  public replayConfirmAssembly(): void {
    this.confirmTimer = 0;
  }

  public resize(width: number, height: number): void {
    this.settledFrames = 0;
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  /** Renders a crisp high-resolution PNG data URL with subtle "Concept render" corner stamp */
  public exportHighResStill(): string {
    const srcCanvas = this.canvas;
    const out = document.createElement("canvas");
    out.width = srcCanvas.width;
    out.height = srcCanvas.height;
    const ctx = out.getContext("2d");
    if (!ctx) return srcCanvas.toDataURL("image/png");
    ctx.drawImage(srcCanvas, 0, 0);

    // Architectural corner stamp
    const pad = Math.round(out.width * 0.025);
    ctx.fillStyle = "rgba(19, 17, 16, 0.72)";
    ctx.fillRect(pad, out.height - pad - 44, 380, 36);
    ctx.fillStyle = "#f1eee7";
    ctx.font = "500 14px ui-monospace, SFMono-Regular, Menlo, monospace";
    const layoutName = ROOM_LAYOUTS[this.state.layout].shortName;
    ctx.fillText(
      `${SITE_CONFIG.BRAND_NAME.toUpperCase()} · ${layoutName.toUpperCase()} · CONCEPT RENDER`,
      pad + 14,
      out.height - pad - 21
    );
    return out.toDataURL("image/png");
  }

  /** Stretch Goal: Export live composed cabinetry as standard glTF (.glb) for AR / CAD Quick Look */
  public async exportGltfBlob(): Promise<Blob> {
    const exportGroup = new THREE.Group();
    exportGroup.name = `Woodoo_${this.state.layout}_${this.state.collection}_${this.state.finish}`;
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.materials.woodMaterial.color),
      roughness: 0.55,
    });
    const boxGeo = buildUnitPanelBoxGeometry();
    for (const p of this.currentPanels) {
      const m = new THREE.Mesh(boxGeo, mat);
      m.name = p.partCode;
      m.position.set(...p.assembledPos);
      m.quaternion.set(...p.assembledQuat);
      m.scale.set(...p.size);
      exportGroup.add(m);
    }
    const exporter = new GLTFExporter();
    return new Promise((resolve, reject) => {
      exporter.parse(
        exportGroup,
        (result) => {
          if (result instanceof ArrayBuffer) {
            resolve(new Blob([result], { type: "model/gltf-binary" }));
          } else {
            resolve(new Blob([JSON.stringify(result)], { type: "model/gltf+json" }));
          }
          boxGeo.dispose();
          mat.dispose();
        },
        (err) => reject(err),
        { binary: true }
      );
    });
  }

  private attachPointerControls(): void {
    const onDown = (e: PointerEvent) => {
      if (this.state.mode === "confirm-pack") return;
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.canvas.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.targetYaw -= dx * 0.007;
      this.targetPitch = THREE.MathUtils.clamp(this.targetPitch + dy * 0.006, 0.05, 1.42);
    };
    const onUp = () => {
      this.isDragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      if (this.state.mode !== "configurator") return;
      // Plain scrolling keeps scrolling the page. Trackpad pinch (sent as ctrl+wheel) or
      // ctrl/cmd + wheel zooms the camera.
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      this.targetDist = THREE.MathUtils.clamp(this.targetDist + e.deltaY * 0.003, 1.8, 7.6);
    };

    this.canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    this.canvas.addEventListener("wheel", onWheel, { passive: false });

    const prevDispose = this.dispose.bind(this);
    this.dispose = () => {
      this.canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("pointerup", onUp);
      this.canvas.removeEventListener("wheel", onWheel);
      prevDispose();
    };
  }

  private pushToPool(
    counts: Record<keyof WoodooStudioEngine["pool"], number>,
    zone: CabinetPanelSpec["materialZone"],
    geomKind: CabinetPanelSpec["geometryKind"],
    pos: THREE.Vector3,
    quat: THREE.Quaternion,
    scale: THREE.Vector3
  ): void {
    this._mat.compose(pos, quat, scale);
    if (zone === "counter") {
      if (counts.counterBox < 48) this.pool.counterBox.setMatrixAt(counts.counterBox++, this._mat);
      return;
    }
    if (zone === "bronze") {
      if (counts.bronzePull < 128) this.pool.bronzePull.setMatrixAt(counts.bronzePull++, this._mat);
      return;
    }
    if (zone === "metal") {
      if (geomKind === "hardware-hinge") {
        if (counts.metalHinge < 24) this.pool.metalHinge.setMatrixAt(counts.metalHinge++, this._mat);
      } else if (counts.metalPin < 40) {
        this.pool.metalPin.setMatrixAt(counts.metalPin++, this._mat);
      }
      return;
    }
    if (zone === "interior") {
      if (counts.interiorBox < MAX_POOL) this.pool.interiorBox.setMatrixAt(counts.interiorBox++, this._mat);
      return;
    }
    if (geomKind === "door-traditional-shaker") {
      if (counts.doorTraditional < MAX_POOL) this.pool.doorTraditional.setMatrixAt(counts.doorTraditional++, this._mat);
    } else if (geomKind === "door-slim-shaker") {
      if (counts.doorSlim < MAX_POOL) this.pool.doorSlim.setMatrixAt(counts.doorSlim++, this._mat);
    } else if (geomKind === "door-flat") {
      if (counts.doorFlat < MAX_POOL) this.pool.doorFlat.setMatrixAt(counts.doorFlat++, this._mat);
    } else if (counts.woodBox < MAX_POOL) {
      this.pool.woodBox.setMatrixAt(counts.woodBox++, this._mat);
    }
  }

  private loop = (): void => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.loop);

    const now = performance.now();
    const dt = Math.min(0.08, Math.max(0.004, (now - this.lastTime) / 1000));
    this.lastTime = now;

    // Fast 1.2s flight-and-dock + physical light-wipe transition on every configurator change!
    if (this.morphProgress < 1.0) {
      this.morphProgress = Math.min(1.0, this.morphProgress + dt / 1.15);
      this.materials.setFinishTransition(this.prevFinish, this.state.finish, this.morphProgress);
    } else {
      this.materials.setFinishImmediate(this.state.finish);
    }

    // Smooth camera orbit interpolation
    if (this.state.mode === "confirm-pack") {
      this.confirmTimer = Math.min(1.0, this.confirmTimer + dt / 2.2);
      this.targetYaw += dt * 0.22;
    }
    this.orbitYaw = THREE.MathUtils.lerp(this.orbitYaw, this.targetYaw, Math.min(1, dt * 8));
    this.orbitPitch = THREE.MathUtils.lerp(this.orbitPitch, this.targetPitch, Math.min(1, dt * 8));
    this.orbitDist = THREE.MathUtils.lerp(this.orbitDist, this.targetDist, Math.min(1, dt * 8));

    const lookY =
      this.state.mode === "configurator"
        ? 1.05
        : this.state.macroZoom
          ? 0.42
          : 0.46;
    const lookZ = this.state.mode === "configurator" ? -0.3 : 0;

    // Narrow (phone) viewports need the camera further back to fit the whole run.
    const fit =
      this.state.mode === "configurator" ? Math.pow(Math.max(1, 1.35 / this.camera.aspect), 0.7) : 1;
    const dist = this.orbitDist * fit;
    this.camera.position.set(
      Math.sin(this.orbitYaw) * Math.cos(this.orbitPitch) * dist,
      lookY + Math.sin(this.orbitPitch) * dist,
      lookZ + Math.cos(this.orbitYaw) * Math.cos(this.orbitPitch) * dist
    );
    this.camera.lookAt(0, lookY, lookZ);

    // Door open animation & ghost wireframe for /collections & /precision
    this.doorOpenSmooth = THREE.MathUtils.lerp(
      this.doorOpenSmooth,
      this.state.doorsOpen ? 1.55 : 0,
      Math.min(1, dt * 6)
    );
    this.ghostFrameGroup.visible = Boolean(this.state.showGhostFrame);
    this.materials.ghostWireframeMaterial.opacity = this.state.showGhostFrame ? 0.72 : 0;

    const counts = {
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

    if (this.state.mode === "confirm-pack") {
      // Flat-pack -> complete assembled cabinet animation for form submission confirmation!
      const u = this.confirmTimer;
      this.currentPanels.forEach((p, idx) => {
        const localU = Math.max(0, Math.min(1, (u - p.dockOrder * 0.4) / 0.55));
        evalCurvedFlight(
          p.flatPos,
          p.assembledPos,
          p.flatQuat,
          p.assembledQuat,
          0.42 + (idx % 4) * 0.14,
          (idx % 2 === 0 ? 1 : -1) * 0.22,
          localU,
          this._pos,
          this._quat
        );
        this._scale.set(...p.size);
        this.pushToPool(counts, p.materialZone, p.geometryKind, this._pos, this._quat, this._scale);
      });
    } else if (this.morphProgress < 1.0 && this.morphPairs.length > 0) {
      for (const mp of this.morphPairs) {
        const localU = Math.max(0, Math.min(1, (this.morphProgress - mp.staggerStart) / mp.duration));
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
        const dimT = easeDockSpring(localU);
        let sMult = 1;
        if (mp.mode === "enter") sMult = Math.min(1, localU * 4);
        if (mp.mode === "exit") sMult = Math.max(0.01, (1 - localU) * 4);
        this._scale.set(
          THREE.MathUtils.lerp(mp.sizeFrom[0], mp.sizeTo[0], dimT) * sMult,
          THREE.MathUtils.lerp(mp.sizeFrom[1], mp.sizeTo[1], dimT) * sMult,
          THREE.MathUtils.lerp(mp.sizeFrom[2], mp.sizeTo[2], dimT) * sMult
        );
        const geom = localU < 0.5 ? mp.geometryKindFrom : mp.geometryKindTo;
        this.pushToPool(counts, mp.materialZone, geom, this._pos, this._quat, this._scale);
      }
    } else {
      for (const p of this.currentPanels) {
        this._pos.set(...p.assembledPos);
        this._quat.set(...p.assembledQuat);
        this._scale.set(...p.size);

        if (this.doorOpenSmooth > 0.005 && p.category === "door" && p.hingeSide) {
          const halfW = p.size[0] / 2;
          const sign = p.hingeSide === "left" ? -1 : 1;
          const hingeX = p.assembledPos[0] + sign * halfW;
          const hingeZ = p.assembledPos[2] - p.size[2] / 2;
          const ang = p.hingeSide === "left" ? -this.doorOpenSmooth : this.doorOpenSmooth;
          const dx = -sign * halfW;
          const dz = p.size[2] / 2;
          this._pos.set(
            hingeX + dx * Math.cos(ang) + dz * Math.sin(ang),
            p.assembledPos[1],
            hingeZ - dx * Math.sin(ang) + dz * Math.cos(ang)
          );
          this._quat.multiply(this._doorQ.setFromAxisAngle(StudioUpAxis, ang));
        }

        this.pushToPool(counts, p.materialZone, p.geometryKind, this._pos, this._quat, this._scale);
      }
    }

    if (this.propsGroup) {
      if (this.morphProgress >= 1) this.propsRiseFrom = -1;
      setRoomPropsAppear(this.propsGroup, this.propsRiseFrom < 0 ? 1 : (this.morphProgress - 0.45) / 0.55);
    }

    // Render on demand: once everything has settled, stop redrawing an unchanged picture
    // (saves battery and keeps laptops cool). A slow 2 fps refresh still picks up textures
    // that finish loading in the background.
    const settled =
      this.morphProgress >= 1 &&
      !this.isDragging &&
      (this.state.mode !== "confirm-pack" || this.confirmTimer >= 1) &&
      Math.abs(this.orbitYaw - this.targetYaw) < 1e-4 &&
      Math.abs(this.orbitPitch - this.targetPitch) < 1e-4 &&
      Math.abs(this.orbitDist - this.targetDist) < 1e-4 &&
      Math.abs(this.doorOpenSmooth - (this.state.doorsOpen ? 1.55 : 0)) < 1e-4;
    this.settledFrames = settled ? this.settledFrames + 1 : 0;
    if (this.settledFrames > 45 && now - this.lastRenderAt < 500) return;
    this.lastRenderAt = now;

    if (!this.warmedEnv && this.materials.envMap) {
      this.warmedEnv = true;
      setRoomPropEnvMap(this.propMats, this.materials.roomEnvMap);
      this.warmUp();
    }

    (Object.keys(counts) as Array<keyof typeof counts>).forEach((k) => {
      this.pool[k].count = counts[k];
      this.pool[k].instanceMatrix.needsUpdate = true;
    });

    this.renderer.render(this.scene, this.camera);
  };

  private propMats = createRoomPropMaterials();
  private propsGroup: THREE.Group | null = null;
  private propsKey = "";
  private propsRiseFrom = -1;
  private settledFrames = 0;
  private lastRenderAt = 0;
  private warmedEnv = false;
  private _doorQ = new THREE.Quaternion();

  /** Compile all materials ahead of time so the first layout or finish change does not stall. */
  private warmUp(): void {
    try {
      void this.renderer.compileAsync(this.scene, this.camera).catch(() => undefined);
    } catch {
      // best effort
    }
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    this.materials.dispose();
    this.renderer.dispose();
  }
}

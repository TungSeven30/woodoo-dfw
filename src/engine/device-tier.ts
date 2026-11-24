export type RenderTier = "A" | "B" | "C";

export interface QualityProfile {
  tier: RenderTier;
  reducedMotion: boolean;
  dpr: number;
  shadowMapSize: number;
  enablePostProcessing: boolean;
  enableDoF: boolean;
  enableVolumetrics: boolean;
  mergeSmallParts: boolean;
  isPortrait: boolean;
  reason: string;
}

export function detectWebGL2(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.WebGL2RenderingContext === "function";
}

/** Section 5: Detect software WebGL renderers (SwiftShader, llvmpipe, Basic Render Driver) so Tier C engages automatically unless explicitly overridden. */
export function isSoftwareWebGLRenderer(
  gl: WebGLRenderingContext | WebGL2RenderingContext | null
): boolean {
  if (!gl) return true;
  try {
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(
      (ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "") ||
        gl.getParameter(gl.RENDERER) ||
        ""
    ).toLowerCase();
    return (
      renderer.includes("swiftshader") ||
      renderer.includes("llvmpipe") ||
      renderer.includes("software") ||
      renderer.includes("basic render driver") ||
      renderer.includes("mesa offscreen")
    );
  } catch {
    return false;
  }
}

export function detectReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("reducedMotion") === "1") return true;
  if (params.get("reducedMotion") === "0") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export const SSR_QUALITY_PROFILE: QualityProfile = {
  tier: "C",
  reducedMotion: false,
  dpr: 1,
  shadowMapSize: 1024,
  enablePostProcessing: false,
  enableDoF: false,
  enableVolumetrics: false,
  mergeSmallParts: true,
  isPortrait: false,
  reason: "ssr-default",
};

export function detectInitialQualityProfile(): QualityProfile {
  if (typeof window === "undefined") {
    return SSR_QUALITY_PROFILE;
  }

  const params = new URLSearchParams(window.location.search);
  const forcedTier = params.get("tier")?.toUpperCase() as RenderTier | undefined;
  const sessionOverride = (() => {
    try {
      return window.sessionStorage.getItem("woodoo_render_tier") as RenderTier | null;
    } catch {
      return null;
    }
  })();

  const isPortrait = window.innerHeight > window.innerWidth;
  const isTouchSmall =
    window.innerWidth <= 900 ||
    (window.matchMedia?.("(pointer: coarse)").matches ?? false);
  const reducedMotion = detectReducedMotion();

  if (reducedMotion) {
    return {
      tier: "C",
      reducedMotion: true,
      dpr: 1,
      shadowMapSize: 512,
      enablePostProcessing: false,
      enableDoF: false,
      enableVolumetrics: false,
      mergeSmallParts: true,
      isPortrait,
      reason: "prefers-reduced-motion",
    };
  }

  const chosenOverride = forcedTier || sessionOverride;
  if (chosenOverride === "C") {
    return {
      tier: "C",
      reducedMotion: false,
      dpr: 1,
      shadowMapSize: 512,
      enablePostProcessing: false,
      enableDoF: false,
      enableVolumetrics: false,
      mergeSmallParts: true,
      isPortrait,
      reason: forcedTier ? "query-override-C" : "user-lighter-version",
    };
  }

  if (!detectWebGL2()) {
    return {
      tier: "C",
      reducedMotion: false,
      dpr: 1,
      shadowMapSize: 512,
      enablePostProcessing: false,
      enableDoF: false,
      enableVolumetrics: false,
      mergeSmallParts: true,
      isPortrait,
      reason: "no-webgl2",
    };
  }

  // Chromium-only hints (gracefully ignored in Safari/Firefox)
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const saveData = Boolean(nav.connection?.saveData);
  const lowMemory = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2;

  if (!forcedTier && (saveData || lowMemory)) {
    return {
      tier: "C",
      reducedMotion: false,
      dpr: 1,
      shadowMapSize: 512,
      enablePostProcessing: false,
      enableDoF: false,
      enableVolumetrics: false,
      mergeSmallParts: true,
      isPortrait,
      reason: saveData ? "save-data" : "low-device-memory",
    };
  }

  if (chosenOverride === "B" || (!chosenOverride && isTouchSmall)) {
    return {
      tier: "B",
      reducedMotion: false,
      // Phones: render at up to 2x the CSS size directly to the screen (sharp), and skip the
      // offscreen post pass and extra point lights instead (those cost more than pixels).
      dpr: Math.min(window.devicePixelRatio || 1, 2),
      shadowMapSize: 1024,
      enablePostProcessing: false,
      enableDoF: false,
      enableVolumetrics: false,
      mergeSmallParts: true,
      isPortrait,
      reason: chosenOverride === "B" ? "override-B" : "mobile-tablet-viewport",
    };
  }

  // Tier A (Desktop WebGL2)
  return {
    tier: "A",
    reducedMotion: false,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    shadowMapSize: 2048,
    enablePostProcessing: true,
    enableDoF: true,
    enableVolumetrics: true,
    mergeSmallParts: false,
    isPortrait,
    reason: chosenOverride === "A" ? "override-A" : "desktop-webgl2",
  };
}

export function setUserTierPreference(tier: RenderTier | null): void {
  if (typeof window === "undefined") return;
  try {
    if (tier === null) {
      window.sessionStorage.removeItem("woodoo_render_tier");
    } else {
      window.sessionStorage.setItem("woodoo_render_tier", tier);
    }
  } catch {
    // ignore storage restriction
  }
}

/**
 * Adaptive frame-time probe for the first ~2 seconds of active WebGL rendering.
 * Automatically steps down quality (DPR / shadows / post) if average frame time exceeds budget.
 */
export class AdaptiveQualityProbe {
  private samples: number[] = [];
  private done = false;
  private startTime = 0;

  recordFrame(deltaMs: number, nowMs: number): "ok" | "step-down-dpr" | "step-down-tier-b" | null {
    if (this.done) return null;
    if (this.startTime === 0) this.startTime = nowMs;
    if (deltaMs > 1 && deltaMs < 250) {
      this.samples.push(deltaMs);
    }
    if (nowMs - this.startTime >= 2000 && this.samples.length >= 20) {
      this.done = true;
      const sorted = [...this.samples].sort((a, b) => a - b);
      const p75 = sorted[Math.floor(sorted.length * 0.75)];
      if (p75 > 36) return "step-down-tier-b"; // < ~28 fps
      if (p75 > 23) return "step-down-dpr"; // < ~43 fps
      return "ok";
    }
    return null;
  }
}

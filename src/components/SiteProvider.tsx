"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  QualityProfile,
  RenderTier,
  SSR_QUALITY_PROFILE,
  detectInitialQualityProfile,
  detectReducedMotion,
  setUserTierPreference,
} from "@/engine/device-tier";
import type { CabinetrySoundEngine } from "@/engine/sound";
import { captureUtmParams } from "@/lib/analytics";

interface SiteContextValue {
  soundEnabled: boolean;
  toggleSound: () => Promise<void>;
  soundEngine: CabinetrySoundEngine | null;
  quality: QualityProfile;
  toggleLighterVersion: () => void;
  fallbackToTierC: (reason: string) => void;
  setCursorHint: (hint: string | null) => void;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function useSite(): SiteContextValue {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite must be used inside SiteProvider");
  return ctx;
}

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundEngine, setSoundEngine] = useState<CabinetrySoundEngine | null>(null);
  const [quality, setQuality] = useState<QualityProfile>(SSR_QUALITY_PROFILE);
  // Cursor hints were removed with the custom cursor; kept as a no-op for existing callers.
  const setCursorHint = useCallback((hint: string | null) => void hint, []);
  const eggBufferRef = useRef("");

  // Capture UTMs and sync client quality profile on mount
  useEffect(() => {
    captureUtmParams();
    const raf = window.requestAnimationFrame(() => {
      setQuality(detectInitialQualityProfile());
    });

    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => setQuality(detectInitialQualityProfile());
    mq?.addEventListener?.("change", onMotionChange);
    return () => {
      window.cancelAnimationFrame(raf);
      mq?.removeEventListener?.("change", onMotionChange);
    };
  }, []);

  // Stretch Goal Easter Egg: typing "flatpack" anywhere (outside form inputs) collapses page into panels & reassembles!
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key.length === 1 && /^[a-zA-Z]$/.test(e.key)) {
        eggBufferRef.current = (eggBufferRef.current + e.key.toLowerCase()).slice(-8);
        if (eggBufferRef.current === "flatpack" && !detectReducedMotion()) {
          eggBufferRef.current = "";
          document.body.classList.add("flatpack-egg");
          soundEngine?.playWoodTock(0.8);
          window.setTimeout(() => {
            document.body.classList.remove("flatpack-egg");
            soundEngine?.playWoodTock(0.4);
          }, 850);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [soundEngine]);

  // Lazy-load Web Audio foley engine ONLY when user explicitly toggles Sound On
  const toggleSound = useCallback(async () => {
    if (soundEnabled) {
      soundEngine?.stop();
      setSoundEnabled(false);
      try {
        window.sessionStorage.setItem("woodoo_sound", "off");
      } catch {
        // ignore
      }
      return;
    }

    let engine = soundEngine;
    if (!engine) {
      const mod = await import("@/engine/sound");
      engine = new mod.CabinetrySoundEngine();
      setSoundEngine(engine);
    }
    const ok = engine.start();
    if (ok) {
      engine.playWoodTock(0.5);
      setSoundEnabled(true);
      try {
        window.sessionStorage.setItem("woodoo_sound", "on");
      } catch {
        // ignore
      }
    }
  }, [soundEnabled, soundEngine]);

  const toggleLighterVersion = useCallback(() => {
    const nextTier: RenderTier = quality.tier === "C" ? "A" : "C";
    setUserTierPreference(nextTier);
    setQuality(detectInitialQualityProfile());
  }, [quality.tier]);

  const fallbackToTierC = useCallback((reason: string) => {
    setQuality((prev) => ({
      ...prev,
      tier: "C",
      dpr: 1,
      shadowMapSize: 512,
      enablePostProcessing: false,
      enableDoF: false,
      enableVolumetrics: false,
      mergeSmallParts: true,
      reason,
    }));
  }, []);

  return (
    <SiteContext.Provider
      value={{
        soundEnabled,
        toggleSound,
        soundEngine,
        quality,
        toggleLighterVersion,
        fallbackToTierC,
        setCursorHint,
      }}
    >
      {children}

    </SiteContext.Provider>
  );
}

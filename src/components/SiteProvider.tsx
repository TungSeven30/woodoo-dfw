"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundEngine, setSoundEngine] = useState<CabinetrySoundEngine | null>(null);
  const [quality, setQuality] = useState<QualityProfile>(SSR_QUALITY_PROFILE);
  const [transitionKey, setTransitionKey] = useState(0);
  const [showTransition, setShowTransition] = useState(false);
  const [cursorHint, setCursorHint] = useState<string | null>(null);
  const prevPathRef = useRef(pathname);
  const cursorRef = useRef<HTMLDivElement | null>(null);
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

  // Panel-collapse page transition (skipped completely with prefers-reduced-motion)
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      if (!detectReducedMotion()) {
        const raf = window.requestAnimationFrame(() => {
          setTransitionKey((k) => k + 1);
          setShowTransition(true);
        });
        const timer = window.setTimeout(() => setShowTransition(false), 680);
        return () => {
          window.cancelAnimationFrame(raf);
          window.clearTimeout(timer);
        };
      }
    }
  }, [pathname]);

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

  // Subtle custom architectural cursor (never hides native cursor on form controls!)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(pointer: coarse)").matches) return;

    const el = cursorRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      const target = e.target as HTMLElement | null;
      const isForm =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.tagName === "LABEL");
      if (isForm) {
        el.classList.add("is-hidden");
      } else {
        el.classList.remove("is-hidden");
      }
      const dataHint = target?.closest?.("[data-cursor]")?.getAttribute("data-cursor");
      if (dataHint) {
        setCursorHint(dataHint);
      } else if (!target?.closest?.("canvas")) {
        setCursorHint(null);
      }
    };

    const onLeave = () => el.classList.add("is-hidden");
    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

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

      {/* Panel-collapse Page Transition (< 700 ms, skipped on reduced motion) */}
      {showTransition && (
        <div
          key={transitionKey}
          className="page-transition-curtain"
          aria-hidden="true"
        >
          {[0, 1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="page-transition-slat"
              style={{ animationDelay: `${idx * 32}ms` }}
            />
          ))}
        </div>
      )}

      {/* Custom Architectural Dot Cursor */}
      <div
        ref={cursorRef}
        className={`custom-cursor is-hidden ${cursorHint ? "has-hint" : ""}`}
        aria-hidden="true"
      >
        {cursorHint || ""}
      </div>
    </SiteContext.Provider>
  );
}

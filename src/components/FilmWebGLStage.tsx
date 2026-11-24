"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Lenis from "lenis";
import {
  COLLECTIONS,
  COLLECTION_LIST,
  CeilingHeightFt,
  FINISHES,
  FINISH_ORDER,
  SITE_CONFIG,
  isShowroomOpen,
  isValidFinishForCollection,
} from "@/config/site";
import { FILM_SCENES, RECONFIGURE_BEATS } from "@/config/content";
import { LAYOUT_ORDER, ROOM_LAYOUTS } from "@/config/layouts";
import {
  FilmFrameTelemetry,
  Scene7ConfigState,
  WoodooFilmEngine,
} from "@/engine/film-engine";
import { QualityProfile, isSoftwareWebGLRenderer } from "@/engine/device-tier";
import { useSite } from "./SiteProvider";
import { TwoToneHeadline } from "./TwoToneHeadline";
import { markConfiguratorUsed, trackEvent } from "@/lib/analytics";

interface FilmWebGLStageProps {
  quality: QualityProfile;
  onFirstFrame?: () => void;
}

declare global {
  interface Window {
    __filmControl?: {
      setProgress: (t: number) => void;
      getTelemetry: () => FilmFrameTelemetry | null;
      setScene7: (partial: Partial<Scene7ConfigState>) => void;
      capture: () => string;
    };
  }
}

export default function FilmWebGLStage({
  quality,
  onFirstFrame,
}: FilmWebGLStageProps) {
  const router = useRouter();
  const { soundEngine, setCursorHint, fallbackToTierC } = useSite();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<WoodooFilmEngine | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const telemetryRef = useRef<FilmFrameTelemetry | null>(null);
  const reachedScenesRef = useRef<Set<number>>(new Set());
  const snapTimerRef = useRef<number | null>(null);
  const forcedProgressRef = useRef<number | null>(null);

  const [telemetry, setTelemetry] = useState<FilmFrameTelemetry>({
    progress: 0,
    sceneIndex: 0,
    activeLayout: "l-shape",
    activeCollection: "traditional-shaker",
    activeFinish: "premium-oak",
    activeCeiling: 9,
    reconfigBeatIndex: 0,
    macroRevealProgress: 0,
    planOverlayOpacity: 0,
    splitDoorsVisible: false,
    hoveredDoor: null,
    drawCalls: 0,
    fps: 60,
  });

  const [scene7, setScene7] = useState<Scene7ConfigState>({
    layout: "vanity",
    collection: "flat",
    finish: "frosty-white",
    ceiling: 8,
  });
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const [ready, setReady] = useState(false);

  const showroomOpen = isShowroomOpen();

  // Attach sound engine dynamically if user turns Sound On mid-Film
  useEffect(() => {
    engineRef.current?.setSoundEngine(soundEngine);
  }, [soundEngine]);

  const scrollToProgress = useCallback((targetT: number) => {
    const track = trackRef.current;
    if (!track) return;
    const maxScroll = Math.max(1, track.offsetHeight - window.innerHeight);
    const targetY = track.offsetTop + targetT * maxScroll;
    if (lenisRef.current) {
      lenisRef.current.scrollTo(targetY, { duration: 1.05 });
    } else {
      window.scrollTo({ top: targetY, behavior: "smooth" });
    }
  }, []);

  // Boot Three.js Film Engine + Lenis Inertial Scroll
  useEffect(() => {
    const canvas = canvasRef.current;
    const track = trackRef.current;
    if (!canvas || !track) return;

    // Section 5: Software renderers (SwiftShader, llvmpipe, Basic Render Driver) gracefully engage Tier C
    // unless the visitor explicitly requested 3D mode via ?tier=A/B or the "3D version" button.
    const isExplicitOverride = quality.reason.includes("override");
    if (!isExplicitOverride) {
      const probeGl = canvas.getContext("webgl2", {
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: false,
      });
      if (!probeGl || isSoftwareWebGLRenderer(probeGl)) {
        fallbackToTierC(probeGl ? "software-renderer" : "no-webgl2");
        return;
      }
    }

    const params = new URLSearchParams(window.location.search);
    const paramT = params.get("t");
    const initialT = paramT !== null ? Math.max(0, Math.min(1, parseFloat(paramT) || 0)) : null;

    let lastReactPush = 0;
    let engine: WoodooFilmEngine;
    try {
      engine = new WoodooFilmEngine(canvas, quality, {
        onFirstFrame: () => {
          setReady(true);
          onFirstFrame?.();
        },
        onDoorNavigate: (dest) => {
          trackEvent("cta_click", { cta: `scene8-${dest}-door`, location: "film-scene-8" });
          router.push(dest === "trade" ? "/trade/send-a-plan" : "/showroom");
        },
        onTelemetry: (next) => {
          telemetryRef.current = next;
          if (!reachedScenesRef.current.has(next.sceneIndex)) {
            reachedScenesRef.current.add(next.sceneIndex);
            trackEvent("scene_reached", {
              scene: FILM_SCENES[next.sceneIndex]?.id || String(next.sceneIndex),
              index: next.sceneIndex,
            });
          }
          // Throttle React HUD updates to ~20 Hz so WebGL runs at locked 60 fps with zero React overhead
          const now = performance.now();
          if (
            now - lastReactPush > 48 ||
            next.sceneIndex !== telemetryRef.current.sceneIndex
          ) {
            lastReactPush = now;
            setTelemetry(next);
          }
        },
      });
    } catch {
      fallbackToTierC("webgl-init-error");
      return;
    }
    engine.setSoundEngine(soundEngine);
    engineRef.current = engine;

    // If the GPU context is lost mid-film (common on phones), switch to the still-image version
    // rather than leaving a black screen.
    const onContextLost = (e: Event) => {
      e.preventDefault();
      fallbackToTierC("webgl-context-lost");
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    if (initialT !== null) {
      forcedProgressRef.current = initialT;
      engine.setScrollTarget(initialT, true);
    }

    // Smooth weighty Lenis scroll (desktop & mobile)
    const lenis = new Lenis({
      autoRaf: false,
      lerp: 0.11,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.35,
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    const syncScroll = () => {
      if (forcedProgressRef.current !== null) return;
      const maxScroll = Math.max(1, track.offsetHeight - window.innerHeight);
      const y = window.scrollY - track.offsetTop;
      const progress = Math.max(0, Math.min(1, y / maxScroll));
      engine.setScrollTarget(progress, false);

      // Gentle magnetic anchor snap after scroll rests for 320 ms near a scene anchor
      if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
      if (y >= 0 && y <= maxScroll) {
        snapTimerRef.current = window.setTimeout(() => {
          const nearest = FILM_SCENES.reduce((best, s) =>
            Math.abs(s.anchor - progress) < Math.abs(best.anchor - progress) ? s : best
          );
          if (Math.abs(nearest.anchor - progress) < 0.022 && Math.abs(nearest.anchor - progress) > 0.002) {
            lenis.scrollTo(track.offsetTop + nearest.anchor * maxScroll, { duration: 0.65 });
          }
        }, 320);
      }
    };

    lenis.on("scroll", syncScroll);
    window.addEventListener("scroll", syncScroll, { passive: true });

    // Tick smooth scroll inside the engine's own frame so the film never lags a frame behind it.
    engine.setBeforeFrame((time) => lenis.raf(time));
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => engine.setOffscreen(!entry.isIntersecting),
      { rootMargin: "200px 0px" }
    );
    visibilityObserver.observe(track);

    const onResize = () => {
      engine.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // Deterministic verification hook for 21-step portfolio captures & video recording
    window.__filmControl = {
      setProgress: (val: number) => {
        const clamped = Math.max(0, Math.min(1, val));
        forcedProgressRef.current = clamped;
        engine.setManualStepping(true);
        engine.setScrollTarget(clamped, true);
        if (telemetryRef.current) setTelemetry({ ...telemetryRef.current });
      },
      getTelemetry: () => telemetryRef.current,
      setScene7: (partial) => {
        const updated = engine.updateScene7Config(partial);
        setScene7(updated);
      },
      capture: () => engine.captureDataUrl(),
    };

    return () => {
      engine.setBeforeFrame(null);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      visibilityObserver.disconnect();
      if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", syncScroll);
      lenis.destroy();
      engine.dispose();
      delete window.__filmControl;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quality.tier, quality.enablePostProcessing, quality.enableVolumetrics]);

  const handleScene7Change = (partial: Partial<Scene7ConfigState>) => {
    const updated = engineRef.current?.updateScene7Config(partial);
    if (!updated) return;
    setScene7(updated);
    markConfiguratorUsed();
    trackEvent("configurator_change", {
      source: "film-scene-7",
      layout: updated.layout,
      collection: updated.collection,
      finish: updated.finish,
      ceiling: updated.ceiling,
    });
    setLiveAnnouncement(
      `${ROOM_LAYOUTS[updated.layout].name}, ${COLLECTIONS[updated.collection].name}, ${FINISHES[updated.finish].name}, ${updated.ceiling}-foot ceiling.`
    );
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const hit = engineRef.current?.updatePointer(e.clientX, e.clientY);
    if (hit) {
      setCursorHint("Open");
    } else if (telemetry.sceneIndex === 7) {
      setCursorHint("Select");
    } else {
      setCursorHint(null);
    }
  };

  const handleCanvasClick = () => {
    if (telemetry.splitDoorsVisible && telemetry.hoveredDoor) {
      engineRef.current?.triggerDoorEnter(telemetry.hoveredDoor);
    }
  };

  const currentScene = FILM_SCENES[telemetry.sceneIndex] ?? FILM_SCENES[0];
  const currentBeat = RECONFIGURE_BEATS[telemetry.reconfigBeatIndex] ?? RECONFIGURE_BEATS[0];
  const composeQuery = `/compose?layout=${scene7.layout}&collection=${scene7.collection}&finish=${scene7.finish}&ceiling=${scene7.ceiling}`;

  return (
    <div ref={trackRef} className="film-track" id="film-scroll-track">
      <div className="film-sticky">
        {/* Fast-LCP Poster shown underneath canvas until Frame 0 renders */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/tier-c/scene-0.webp"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          className="film-poster"
          style={{ opacity: ready ? 0 : 1, pointerEvents: "none" }}
        />

        {/* Continuous 9-Scene WebGL2 Canvas (aria-hidden; real HTML text serves screen readers & SEO) */}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="film-canvas"
          onPointerMove={handleCanvasPointerMove}
          onClick={handleCanvasClick}
        />

        {/* Architectural readability scrim */}
        <div className="film-scrim" aria-hidden="true" />

        {/* Scene 3: Macro 2.0 mm Hairline Dimension Callout */}
        {telemetry.macroRevealProgress > 0.05 && (
          <div
            className="macro-dimension"
            aria-hidden="true"
            style={{ opacity: telemetry.macroRevealProgress }}
          >
            <svg width="210" height="44" viewBox="0 0 210 44" fill="none">
              <line
                x1="14"
                y1="22"
                x2={14 + 182 * telemetry.macroRevealProgress}
                y2="22"
                stroke="#f1eee7"
                strokeWidth="1"
              />
              <line x1="94" y1="8" x2="94" y2="36" stroke="#d18d43" strokeWidth="1.2" />
              <line x1="116" y1="8" x2="116" y2="36" stroke="#d18d43" strokeWidth="1.2" />
              <circle cx="94" cy="22" r="2.2" fill="#f1eee7" />
              <circle cx="116" cy="22" r="2.2" fill="#f1eee7" />
            </svg>
            <span
              className="mono-label"
              style={{
                color: "#f1eee7",
                background: "rgba(19, 17, 16, 0.78)",
                padding: "0.25rem 0.65rem",
                border: "1px solid rgba(241, 238, 231, 0.28)",
              }}
            >
              2 mm reveal
            </span>
          </div>
        )}

        {/* Scene 6 Minimal Side HUD */}
        {telemetry.sceneIndex === 6 && (
          <div className="reconfig-hud" aria-live="off">
            <span className="mono-label" style={{ color: "var(--amber-on-dark)" }}>
              {ROOM_LAYOUTS[telemetry.activeLayout].name}
            </span>
            <span style={{ fontSize: "0.9rem", color: "#f1eee7" }}>
              {COLLECTIONS[telemetry.activeCollection].name} · {FINISHES[telemetry.activeFinish].name} · {telemetry.activeCeiling} ft
            </span>
            <span style={{ fontSize: "0.82rem", color: "#b6aea3" }}>
              {currentBeat.line}
            </span>
          </div>
        )}

        {/* Persistent HUD Layer (Builders never trapped: Skip links from Frame 0!) */}
        <div className="film-hud-layer">
          <div className="film-quick-bar">
            <span className="film-scene-count" aria-hidden="true">
              {String(currentScene.index + 1).padStart(2, "0")}
              <span className="film-scene-count-total"> / {String(FILM_SCENES.length).padStart(2, "0")}</span>
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              {currentScene.isConceptRender && (
                <span className="concept-render-tag">Concept render</span>
              )}
              <a
                href="#film-end"
                id="film-skip"
                className="film-skip-link"
                onClick={(e) => {
                  e.preventDefault();
                  trackEvent("cta_click", { cta: "skip-film", location: "film-bar" });
                  const target = document.getElementById("film-end");
                  if (!target) return;
                  lenisRef.current?.scrollTo(target, { immediate: true });
                  target.scrollIntoView({ block: "start" });
                  target.focus({ preventScroll: true });
                }}
              >
                Skip the film
              </a>
            </div>
          </div>

          {/* Bottom Story Headline (Hidden in Scene 8 where Split Doors take full stage) */}
          {!telemetry.splitDoorsVisible && (
            <div
              key={currentScene.id}
              className={`film-story-card${telemetry.sceneIndex === 7 ? " is-scene7" : ""}`}
              style={{
                maxWidth: telemetry.sceneIndex === 7 ? "24rem" : "36rem",
              }}
            >
              {telemetry.sceneIndex === 0 ? (
                <>
                  <p className="film-eyebrow">
                    {SITE_CONFIG.BRAND_NAME} · Dallas–Fort Worth
                  </p>
                  <h1 className="display-serif">{currentScene.headline}</h1>
                  <p>{currentScene.subline}</p>
                  <p className="film-scroll-cue" aria-hidden="true">
                    <span className="film-scroll-cue-line" />
                    Scroll to assemble
                  </p>
                </>
              ) : (
                <>
                  <p className="film-eyebrow">{currentScene.label.replace(/^\d+ · /, "")}</p>
                  <h2>
                    <TwoToneHeadline text={currentScene.headline} />
                  </h2>
                  <p>{currentScene.subline}</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Scene 7: Live Inline Configurator Controls */}
        {telemetry.sceneIndex === 7 && (
          <aside className="scene7-panel" aria-label="Live room configurator">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.65rem" }}>
              <span className="mono-label" style={{ color: "var(--amber-on-dark)" }}>
                Live reconfiguration
              </span>
              <span className="concept-render-tag">Concept render</span>
            </div>

            <div style={{ marginBottom: "0.7rem" }}>
              <span className="mono-label">Layout</span>
              <div className="chip-row">
                {LAYOUT_ORDER.slice(0, 4).map((lid) => (
                  <button
                    key={lid}
                    type="button"
                    className="chip-btn"
                    aria-pressed={scene7.layout === lid}
                    onClick={() => handleScene7Change({ layout: lid })}
                  >
                    {ROOM_LAYOUTS[lid].shortName}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "0.7rem" }}>
              <span className="mono-label">Door style</span>
              <div className="chip-row">
                {COLLECTION_LIST.map((col) => (
                  <button
                    key={col.slug}
                    type="button"
                    className="chip-btn"
                    aria-pressed={scene7.collection === col.slug}
                    onClick={() => handleScene7Change({ collection: col.slug })}
                  >
                    {col.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "0.7rem" }}>
              <span className="mono-label">Finish</span>
              <div className="chip-row">
                {FINISH_ORDER.filter((fSlug) => isValidFinishForCollection(scene7.collection, fSlug)).map((fSlug) => {
                  const f = FINISHES[fSlug];
                  return (
                    <button
                      key={fSlug}
                      type="button"
                      className="chip-btn"
                      aria-pressed={scene7.finish === fSlug}
                      onClick={() => handleScene7Change({ finish: fSlug })}
                    >
                      <span
                        className="swatch-dot"
                        style={{ width: 14, height: 14, backgroundImage: `url(${f.swatchImage})` }}
                        aria-hidden="true"
                      />
                      {f.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", marginTop: "0.75rem" }}>
              <div>
                <span className="mono-label">Ceiling</span>
                <div className="chip-row">
                  {([8, 9, 10] as CeilingHeightFt[]).map((ft) => (
                    <button
                      key={ft}
                      type="button"
                      className="chip-btn"
                      aria-pressed={scene7.ceiling === ft}
                      onClick={() => handleScene7Change({ ceiling: ft })}
                    >
                      {ft} ft
                    </button>
                  ))}
                </div>
              </div>
              <Link
                href={composeQuery}
                className="btn btn-primary btn-sm"
                style={{ alignSelf: "flex-end" }}
                onClick={() => trackEvent("cta_click", { cta: "scene7-open-compose", location: "film-scene-7" })}
              >
                Full studio →
              </Link>
            </div>
          </aside>
        )}

        {/* Scene 8: Two Monumental 3D Cabinet Doors — Interactive Trade / Homeowner Split */}
        {telemetry.splitDoorsVisible && (
          <div className="split-doors-overlay">
            <div
              className="split-door-card"
              onMouseEnter={() => engineRef.current?.setHoveredDoor("trade")}
              onMouseLeave={() => engineRef.current?.setHoveredDoor(null)}
              onFocus={() => engineRef.current?.setHoveredDoor("trade")}
              onBlur={() => engineRef.current?.setHoveredDoor(null)}
            >
              <span className="mono-label" style={{ color: "var(--amber-on-dark)" }}>
                Builders · Remodelers · Designers
              </span>
              <h2 className="h2-serif" style={{ color: "var(--paper)" }}>
                For the trade.
              </h2>
              <p style={{ margin: 0, color: "#cfc8bd", fontSize: "0.95rem" }}>
                Send us the plan. A real person checks every cabinet, filler, and trim piece.
              </p>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                <button
                  type="button"
                  id="split-door-trade-enter"
                  className="btn btn-primary"
                  onClick={() => engineRef.current?.triggerDoorEnter("trade")}
                >
                  Send a plan
                </button>
                <Link
                  href="/trade"
                  className="btn"
                  style={{ color: "var(--paper)", borderColor: "rgba(241,238,231,0.32)" }}
                >
                  Trade account
                </Link>
              </div>
            </div>

            <div
              className="split-door-card"
              onMouseEnter={() => engineRef.current?.setHoveredDoor("home")}
              onMouseLeave={() => engineRef.current?.setHoveredDoor(null)}
              onFocus={() => engineRef.current?.setHoveredDoor("home")}
              onBlur={() => engineRef.current?.setHoveredDoor(null)}
            >
              <span className="mono-label" style={{ color: "var(--amber-on-dark)" }}>
                Dallas–Fort Worth Homeowners
              </span>
              <h2 className="h2-serif" style={{ color: "var(--paper)" }}>
                For my home.
              </h2>
              <p style={{ margin: 0, color: "#cfc8bd", fontSize: "0.95rem" }}>
                See the finishes, test layouts in 3D, and work with a designer from sketch to delivery.
              </p>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                <button
                  type="button"
                  id="split-door-home-enter"
                  className="btn btn-primary"
                  onClick={() => engineRef.current?.triggerDoorEnter("home")}
                >
                  {showroomOpen ? "Book a visit" : "Join preview list"}
                </button>
                <Link
                  href="/compose"
                  className="btn"
                  style={{ color: "var(--paper)", borderColor: "rgba(241,238,231,0.32)" }}
                >
                  Start a design
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Right-Edge Progress Rail with Clickable & Keyboard-Accessible Scene Ticks */}
        <nav className="scene-rail" aria-label="Film scenes">
          {FILM_SCENES.map((scene) => (
            <button
              key={scene.id}
              type="button"
              className="scene-tick"
              aria-current={telemetry.sceneIndex === scene.index ? "step" : undefined}
              aria-label={`Jump to ${scene.label}: ${scene.headline}`}
              onClick={() => scrollToProgress(scene.anchor)}
            >
              <span className="scene-tick-label">{scene.label}</span>
              <span className="scene-tick-bar" aria-hidden="true" />
            </button>
          ))}
        </nav>

        {/* Polite Live Region for Scene 7 Configurator Announcements */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {liveAnnouncement}
        </div>
      </div>

    </div>
  );
}


"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { COLLECTIONS, FINISHES, SITE_CONFIG, isShowroomOpen } from "@/config/site";
import { FILM_LOOKS, FILM_SCENES } from "@/config/content";
import { QualityProfile } from "@/engine/device-tier";
import { TwoToneHeadline } from "./TwoToneHeadline";
import { markConfiguratorUsed, trackEvent } from "@/lib/analytics";

/**
 * The home page film, played from path-traced frames instead of live 3D.
 * Each chapter is a short run of still frames rendered in Blender. Scrolling moves through
 * them, and neighbouring frames are cross-faded so the motion reads as continuous.
 * Phones get their own portrait frames, so nothing is cropped or upscaled.
 */

/** Frames rendered for each chapter, in order. Must match the render script. */
const CHAPTER_FRAMES = [6, 6, 14, 6, 8, 10, 12, 4, 4] as const;
const CHAPTER_OFFSET = CHAPTER_FRAMES.reduce<number[]>((acc, n, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + CHAPTER_FRAMES[i - 1]);
  return acc;
}, []);
const TOTAL_FRAMES = CHAPTER_FRAMES.reduce((a, b) => a + b, 0);
/** Share of each chapter spent on its own frames; the rest dissolves into the next chapter. */
const HOLD = 0.86;
/** Chapter 6 shows each look for this many frames. */
const LOOK_FRAMES = 3;

type FrameSet = "desktop" | "phone";

function frameUrl(set: FrameSet, i: number) {
  return `/film/${set}/f${String(i).padStart(3, "0")}.webp`;
}

function pickSet(): FrameSet {
  return window.innerWidth / Math.max(1, window.innerHeight) >= 0.9 ? "desktop" : "phone";
}

function sceneAt(p: number) {
  const idx = FILM_SCENES.findIndex((s) => p >= s.start && p < s.end);
  return idx === -1 ? FILM_SCENES.length - 1 : idx;
}

/** Scroll progress (0..1) to a fractional frame position. */
function framePosition(p: number) {
  const i = sceneAt(p);
  const s = FILM_SCENES[i];
  const local = Math.max(0, Math.min(1, (p - s.start) / (s.end - s.start)));
  const n = CHAPTER_FRAMES[i];
  const off = CHAPTER_OFFSET[i];
  if (i === FILM_SCENES.length - 1) return off + local * (n - 1);
  if (local < HOLD) return off + (local / HOLD) * (n - 1);
  return off + (n - 1) + (local - HOLD) / (1 - HOLD);
}

interface HudState {
  sceneIndex: number;
  lookIndex: number;
  gap: number;
}

declare global {
  interface Window {
    __filmControl?: {
      setProgress: (t: number) => void;
      getState: () => { progress: number; frame: number; loaded: number };
    };
  }
}

export default function FilmSequenceStage({ quality }: { quality: QualityProfile }) {
  const router = useRouter();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reachedRef = useRef<Set<number>>(new Set());
  const pickedLookRef = useRef<number | null>(null);
  const [hud, setHud] = useState<HudState>({ sceneIndex: 0, lookIndex: 0, gap: 0 });
  const [pickedLook, setPickedLook] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const showroomOpen = isShowroomOpen();

  useEffect(() => {
    pickedLookRef.current = pickedLook;
  }, [pickedLook]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const track = trackRef.current;
    if (!canvas || !track) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let set: FrameSet = pickSet();
    let images: (HTMLImageElement | null)[] = new Array(TOTAL_FRAMES).fill(null);
    let loading = new Set<number>();
    let generation = 0;
    let target = 0;
    let current = 0;
    let forced: number | null = null;
    let lastDrawn = -1;
    let lastKey = "";
    let raf = 0;
    let visible = true;
    let lastTime = performance.now();
    // Look picked in chapter 7: cross-fade to that look's frame.
    let lookMix = 0;
    let lookShown: number | null = null;

    const maxDpr = quality.tier === "A" ? 2 : 1.5;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        lastDrawn = -1;
      }
      const next = pickSet();
      if (next !== set) {
        set = next;
        generation++;
        images = new Array(TOTAL_FRAMES).fill(null);
        loading = new Set();
        pump();
      }
    };

    const load = (i: number) => {
      if (i < 0 || i >= TOTAL_FRAMES || images[i] || loading.has(i)) return;
      loading.add(i);
      const gen = generation;
      const img = new Image();
      img.decoding = "async";
      img.src = frameUrl(set, i);
      img
        .decode()
        .then(() => {
          if (gen !== generation) return;
          images[i] = img;
          lastDrawn = -1;
          if (i === 0) setReady(true);
        })
        .catch(() => {})
        .finally(() => {
          if (gen !== generation) return;
          loading.delete(i);
          pump();
        });
    };

    /** Keep four downloads going, nearest frames to the reader first. */
    const pump = () => {
      if (loading.size >= 4) return;
      const at = Math.round(framePosition(current));
      for (let d = 0; d < TOTAL_FRAMES && loading.size < 4; d++) {
        // Look ahead twice as far as behind: people mostly scroll down.
        for (const i of [at + d, at - Math.floor(d / 2)]) {
          if (i >= 0 && i < TOTAL_FRAMES && !images[i] && !loading.has(i)) load(i);
          if (loading.size >= 4) break;
        }
      }
    };

    const nearestLoaded = (i: number) => {
      if (images[i]) return images[i];
      for (let d = 1; d < TOTAL_FRAMES; d++) {
        if (images[i - d]) return images[i - d];
        if (images[i + d]) return images[i + d];
      }
      return null;
    };

    const drawCover = (img: HTMLImageElement, alpha: number) => {
      const cw = canvas.width;
      const ch = canvas.height;
      const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const w = img.naturalWidth * s;
      const h = img.naturalHeight * s;
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    };

    const readScroll = () => {
      const max = Math.max(1, track.offsetHeight - window.innerHeight);
      const y = window.scrollY - track.offsetTop;
      target = Math.max(0, Math.min(1, y / max));
    };

    let pushed = { sceneIndex: -1, lookIndex: -1, gap: -1 };
    const pushHud = (p: number, f: number) => {
      const sceneIndex = sceneAt(p);
      const look = Math.min(FILM_LOOKS.length - 1, Math.max(0, Math.floor((f - CHAPTER_OFFSET[6]) / LOOK_FRAMES)));
      const s3 = FILM_SCENES[3];
      const g = sceneIndex === 3 ? Math.min(1, Math.max(0, (p - s3.start) / ((s3.end - s3.start) * 0.5))) : 0;
      const gap = Math.round(g * 20) / 20;
      if (sceneIndex !== pushed.sceneIndex || look !== pushed.lookIndex || gap !== pushed.gap) {
        pushed = { sceneIndex, lookIndex: look, gap };
        setHud(pushed);
        if (!reachedRef.current.has(sceneIndex)) {
          reachedRef.current.add(sceneIndex);
          trackEvent("scene_reached", { scene: FILM_SCENES[sceneIndex].id, index: sceneIndex });
        }
      }
    };

    const tick = (now: number) => {
      raf = 0;
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      const goal = forced ?? target;
      current += (goal - current) * (forced !== null ? 1 : 1 - Math.exp(-dt * 9));
      if (Math.abs(goal - current) < 0.00005) current = goal;

      const f = framePosition(current);
      const i0 = Math.floor(f);
      const frac = f - i0;
      const scene = sceneAt(current);

      const picked = scene === 7 ? pickedLookRef.current : null;
      if (picked !== null) lookShown = picked;
      const lookGoal = picked !== null ? 1 : 0;
      lookMix += (lookGoal - lookMix) * (1 - Math.exp(-dt * 10));
      if (Math.abs(lookGoal - lookMix) < 0.003) lookMix = lookGoal;

      const key = `${f.toFixed(4)}|${lookMix.toFixed(3)}|${lookShown}`;
      if (key !== lastKey || lastDrawn === -1) {
        const a = nearestLoaded(Math.min(TOTAL_FRAMES - 1, i0));
        const b = frac > 0.001 && i0 + 1 < TOTAL_FRAMES ? images[i0 + 1] : null;
        if (a) {
          drawCover(a, 1);
          // A short, eased dissolve: less time spent as a double exposure between frames.
          if (b) {
            const k = Math.max(0, Math.min(1, (frac - 0.2) / 0.6));
            drawCover(b, k * k * (3 - 2 * k));
          }
          if (lookMix > 0 && lookShown !== null) {
            const li = images[CHAPTER_OFFSET[6] + lookShown * LOOK_FRAMES + 1];
            if (li) drawCover(li, lookMix);
          }
          ctx.globalAlpha = 1;
          lastKey = key;
          lastDrawn = i0;
        }
        pushHud(current, f);
        pump();
      }
      if (visible) raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (!raf) {
        lastTime = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    const params = new URLSearchParams(window.location.search);
    const paramT = params.get("t");
    if (paramT !== null) forced = Math.max(0, Math.min(1, parseFloat(paramT) || 0));

    const onScroll = () => {
      forced = null;
      readScroll();
      start();
    };
    readScroll();
    current = forced ?? target;
    resize();
    // The first frame of every chapter goes first, so a jump from the rail never shows a blank.
    load(0);
    pump();
    CHAPTER_OFFSET.forEach((o) => load(o));

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
      },
      { rootMargin: "200px 0px" }
    );
    io.observe(track);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", resize);
    start();

    window.__filmControl = {
      setProgress: (t: number) => {
        forced = Math.max(0, Math.min(1, t));
        current = forced;
        lastKey = "";
        start();
      },
      getState: () => ({ progress: current, frame: framePosition(current), loaded: images.filter(Boolean).length }),
    };

    return () => {
      generation++;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", resize);
      delete window.__filmControl;
    };
  }, [quality.tier]);

  const scrollToProgress = useCallback((t: number) => {
    const track = trackRef.current;
    if (!track) return;
    const max = Math.max(1, track.offsetHeight - window.innerHeight);
    window.scrollTo({ top: track.offsetTop + t * max, behavior: "smooth" });
  }, []);

  const scene = FILM_SCENES[hud.sceneIndex] ?? FILM_SCENES[0];
  const look = FILM_LOOKS[hud.lookIndex] ?? FILM_LOOKS[0];
  const chosen = FILM_LOOKS[pickedLook ?? 0];
  const composeHref = `/compose?layout=island&collection=${chosen.collection}&finish=${chosen.finish}&ceiling=9`;
  const isSplit = hud.sceneIndex === 8;

  return (
    <div ref={trackRef} className="film-track film-seq" id="film-scroll-track">
      <div className="film-sticky">
        <picture>
          <source media="(max-aspect-ratio: 9/10)" srcSet="/film/phone/f000.webp" />
          { }
          <img
            src="/film/desktop/f000.webp"
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            className="film-poster"
            style={{ opacity: ready ? 0 : 1, pointerEvents: "none" }}
          />
        </picture>
        <canvas ref={canvasRef} aria-hidden="true" className="film-canvas" />
        <div className="film-scrim" aria-hidden="true" />

        {hud.sceneIndex === 3 && hud.gap > 0.05 && (
          <div className="macro-dimension" aria-hidden="true" style={{ opacity: hud.gap }}>
            <svg width="120" height="40" viewBox="0 0 120 40" fill="none">
              <line x1="8" y1="20" x2={8 + 104 * hud.gap} y2="20" stroke="currentColor" strokeWidth="1" />
              <line x1="52" y1="6" x2="52" y2="34" stroke="var(--amber)" strokeWidth="1.2" />
              <line x1="68" y1="6" x2="68" y2="34" stroke="var(--amber)" strokeWidth="1.2" />
            </svg>
            <span className="film-chip">2 mm reveal</span>
          </div>
        )}

        {hud.sceneIndex === 6 && (
          <div className="reconfig-hud">
            <span className="film-chip-label">
              {String(hud.lookIndex + 1).padStart(2, "0")} / {String(FILM_LOOKS.length).padStart(2, "0")}
            </span>
            <span className="reconfig-hud-name">
              {COLLECTIONS[look.collection].name} · {FINISHES[look.finish].name}
            </span>
            <span className="reconfig-hud-line">{look.line}</span>
          </div>
        )}

        <div className="film-hud-layer">
          <div className="film-quick-bar">
            <span className="film-scene-count" aria-hidden="true">
              {String(scene.index + 1).padStart(2, "0")}
              <span className="film-scene-count-total"> / {String(FILM_SCENES.length).padStart(2, "0")}</span>
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span className="concept-render-tag">Concept render</span>
              <a
                href="#film-end"
                id="film-skip"
                className="film-skip-link"
                onClick={(e) => {
                  e.preventDefault();
                  trackEvent("cta_click", { cta: "skip-film", location: "film-bar" });
                  const end = document.getElementById("film-end");
                  if (!end) return;
                  end.scrollIntoView({ block: "start" });
                  end.focus({ preventScroll: true });
                }}
              >
                Skip the film
              </a>
            </div>
          </div>

          {!isSplit && (
            <div
              key={scene.id}
              className={`film-story-card${hud.sceneIndex === 7 ? " is-scene7" : ""}`}
              style={{ maxWidth: hud.sceneIndex === 7 ? "26rem" : "36rem" }}
            >
              {hud.sceneIndex === 0 ? (
                <>
                  <p className="film-eyebrow">{SITE_CONFIG.BRAND_NAME} · Dallas–Fort Worth</p>
                  <h1 className="display-serif">{scene.headline}</h1>
                  <p>{scene.subline}</p>
                  <p className="film-scroll-cue" aria-hidden="true">
                    <span className="film-scroll-cue-line" />
                    Scroll to assemble
                  </p>
                </>
              ) : (
                <>
                  <p className="film-eyebrow">{scene.label.replace(/^\d+ · /, "")}</p>
                  <h2>
                    <TwoToneHeadline text={scene.headline} />
                  </h2>
                  <p>{scene.subline}</p>
                </>
              )}
            </div>
          )}
        </div>

        {hud.sceneIndex === 7 && (
          <aside className="scene7-panel" aria-label="Pick a look">
            <span className="film-chip-label">Pick a look</span>
            <div className="look-grid">
              {FILM_LOOKS.map((l, i) => (
                <button
                  key={l.finish}
                  type="button"
                  className="look-btn"
                  aria-pressed={(pickedLook ?? 0) === i}
                  onClick={() => {
                    setPickedLook(i);
                    markConfiguratorUsed();
                    trackEvent("configurator_change", {
                      source: "film-scene-7",
                      collection: l.collection,
                      finish: l.finish,
                    });
                  }}
                >
                  <span
                    className="swatch-dot"
                    style={{ backgroundImage: `url(${FINISHES[l.finish].swatchImage})` }}
                    aria-hidden="true"
                  />
                  <span>
                    <strong>{FINISHES[l.finish].name}</strong>
                    <span>{COLLECTIONS[l.collection].name}</span>
                  </span>
                </button>
              ))}
            </div>
            <Link
              href={composeHref}
              className="btn btn-primary btn-sm"
              onClick={() => trackEvent("cta_click", { cta: "scene7-open-compose", location: "film-scene-7" })}
            >
              Plan your room in this look
            </Link>
            <div className="sr-only" aria-live="polite">
              {pickedLook !== null
                ? `${COLLECTIONS[chosen.collection].name} in ${FINISHES[chosen.finish].name}.`
                : ""}
            </div>
          </aside>
        )}

        {isSplit && (
          <div className="split-doors-overlay">
            <div className="split-door-card">
              <span className="film-chip-label">Builders · Remodelers · Designers</span>
              <h2 className="h2-serif">For the trade.</h2>
              <p>Send us the plan. A real person checks every cabinet, filler, and trim piece.</p>
              <div className="split-door-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    trackEvent("cta_click", { cta: "scene8-trade-door", location: "film-scene-8" });
                    router.push("/trade/send-a-plan");
                  }}
                >
                  Send a plan
                </button>
                <Link href="/trade" className="btn">
                  Trade account
                </Link>
              </div>
            </div>
            <div className="split-door-card">
              <span className="film-chip-label">Dallas–Fort Worth homeowners</span>
              <h2 className="h2-serif">For my home.</h2>
              <p>See the finishes, test layouts in 3D, and work with a designer from sketch to delivery.</p>
              <div className="split-door-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    trackEvent("cta_click", { cta: "scene8-home-door", location: "film-scene-8" });
                    router.push("/showroom");
                  }}
                >
                  {showroomOpen ? "Book a visit" : "Join preview list"}
                </button>
                <Link href="/compose" className="btn">
                  Start a design
                </Link>
              </div>
            </div>
          </div>
        )}

        <nav className="scene-rail" aria-label="Film chapters">
          {FILM_SCENES.map((s) => (
            <button
              key={s.id}
              type="button"
              className="scene-tick"
              aria-current={hud.sceneIndex === s.index ? "step" : undefined}
              aria-label={`Jump to ${s.label}: ${s.headline}`}
              onClick={() => scrollToProgress(s.anchor)}
            >
              <span className="scene-tick-label">{s.label}</span>
              <span className="scene-tick-bar" aria-hidden="true" />
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

"use client";

import React, { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { useSite } from "./SiteProvider";
import { FilmTierC } from "./FilmTierC";
import { FILM_SCENES } from "@/config/content";

const emptySubscribe = () => () => {};

// Dynamically load Three.js + Lenis ONLY on the client when Tier A or B is active.
// Keeps initial HTML/JS payload tiny (<= 170 KB budget) and LCP fast on the HTML poster!
const FilmWebGLStage = dynamic(() => import("./FilmWebGLStage"), {
  ssr: false,
  loading: () => (
    <div className="film-track">
      <div className="film-sticky">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/tier-c/scene-0.webp"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          className="film-poster"
        />
        <div className="film-scrim" aria-hidden="true" />
      </div>
    </div>
  ),
});

export function FilmShell() {
  const { quality } = useSite();
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // Show fast LCP poster until hydration determines Tier A/B vs Tier C / reduced motion
  if (!hydrated) {
    return (
      <div className="film-root theme-dark">
        <div className="film-sticky" style={{ position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/tier-c/scene-0.webp"
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            className="film-poster"
          />
          <div className="film-scrim" aria-hidden="true" />
          <div className="film-hud-layer">
            <div />
            <div className="film-story-card">
              <p className="film-eyebrow">Dallas–Fort Worth</p>
              <h1 className="display-serif">{FILM_SCENES[0].headline}</h1>
              <p>{FILM_SCENES[0].subline}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="film-root theme-dark">
      {quality.tier === "C" || quality.reducedMotion ? (
        <FilmTierC quality={quality} />
      ) : (
        <FilmWebGLStage quality={quality} />
      )}
    </div>
  );
}

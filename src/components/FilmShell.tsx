"use client";

import React, { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { useSite } from "./SiteProvider";
import { FilmTierC } from "./FilmTierC";
import { FILM_SCENES } from "@/config/content";

const emptySubscribe = () => () => {};

// The frame player loads on the client only. Until then the first frame shows as a plain image.
const FilmSequenceStage = dynamic(() => import("./FilmSequenceStage"), {
  ssr: false,
  loading: () => (
    <div className="film-track">
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
          />
        </picture>
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
      <div className="film-root film-light">
        <div className="film-sticky" style={{ position: "relative" }}>
          <picture>
            <source media="(max-aspect-ratio: 9/10)" srcSet="/film/phone/f000.webp" />
            { }
            <img
              src="/film/desktop/f000.webp"
              alt=""
              aria-hidden="true"
              fetchPriority="high"
              className="film-poster"
            />
          </picture>
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
    <div className="film-root film-light">
      {quality.tier === "C" || quality.reducedMotion ? (
        <FilmTierC quality={quality} />
      ) : (
        <FilmSequenceStage quality={quality} />
      )}
    </div>
  );
}

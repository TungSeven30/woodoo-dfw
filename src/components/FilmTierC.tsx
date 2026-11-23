"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  COLLECTIONS,
  COLLECTION_LIST,
  CeilingHeightFt,
  CollectionSlug,
  FINISHES,
  FINISH_ORDER,
  FinishSlug,
  LayoutId,
  isShowroomOpen,
  isValidFinishForCollection,
  resolveFinishForCollection,
} from "@/config/site";
import { FILM_SCENES, RECONFIGURE_BEATS } from "@/config/content";
import { LAYOUT_ORDER, ROOM_LAYOUTS } from "@/config/layouts";
import { QualityProfile } from "@/engine/device-tier";

interface FilmTierCProps {
  quality: QualityProfile;
}

/**
 * First-class Art-Directed Tier C & prefers-reduced-motion Film Experience.
 * Uses pre-rendered stills (and optional muted H.264/WebM loops ONLY when reducedMotion is false)
 * exported directly from the exact same 3D scenes, with identical editorial copy and CTAs.
 */
export function FilmTierC({ quality }: FilmTierCProps) {
  const reduced = quality.reducedMotion;
  const showroomOpen = isShowroomOpen();

  const [layout, setLayout] = useState<LayoutId>("l-shape");
  const [collection, setCollection] = useState<CollectionSlug>("traditional-shaker");
  const [finish, setFinish] = useState<FinishSlug>("premium-oak");
  const [ceiling, setCeiling] = useState<CeilingHeightFt>(9);
  const [liveStatus, setLiveStatus] = useState("");

  const selectCollection = (c: CollectionSlug) => {
    const f = resolveFinishForCollection(c, finish);
    setCollection(c);
    setFinish(f);
    setLiveStatus(`${ROOM_LAYOUTS[layout].name}, ${COLLECTIONS[c].name}, ${FINISHES[f].name}, ${ceiling}-foot ceiling.`);
  };

  const sceneImages: Record<number, string> = {
    0: "/tier-c/scene-0.webp",
    1: "/tier-c/scene-1.webp",
    2: "/tier-c/scene-2.webp",
    3: "/tier-c/scene-3.webp",
    4: "/tier-c/scene-4.webp",
    5: "/tier-c/scene-5.webp",
    6: "/tier-c/scene-6.webp",
    7: "/tier-c/scene-7.webp",
    8: "/tier-c/scene-8.webp",
  };

  return (
    <div className="theme-dark" style={{ paddingTop: "var(--header-h)" }}>
      {/* Immediate Trade & Homeowner Skip Bar */}
      <div
        className="container"
        style={{
          paddingBlock: "1.15rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
          <Link href="/trade/send-a-plan" className="film-pill-link">
            Skip to trade
          </Link>
          <Link href="/showroom" className="film-pill-link">
            Skip to homeowners
          </Link>
          <Link href="/compose" className="film-pill-link">
            Open configurator
          </Link>
        </div>
        <span className="mono-label">
          {reduced ? "Reduced motion · Stills mode" : "Lighter edition · Pre-rendered scenes"}
        </span>
      </div>

      {/* Editorial Sequence of All 9 Film Chapters */}
      {FILM_SCENES.map((scene) => (
        <section
          key={scene.id}
          id={`scene-${scene.id}`}
          className="section-pad hairline-bottom"
        >
          <div className="container">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "clamp(1.75rem, 4vw, 3.5rem)",
                alignItems: "center",
              }}
            >
              <div>
                <p className="mono-label" style={{ color: "var(--amber-on-dark)", marginBottom: "0.65rem" }}>
                  {scene.label}
                </p>
                {scene.index === 0 ? (
                  <h1 className="display-serif" style={{ marginBottom: "1rem" }}>
                    {scene.headline}
                  </h1>
                ) : (
                  <h2 className="h1-serif" style={{ marginBottom: "0.9rem" }}>
                    {scene.headline}
                  </h2>
                )}
                <p style={{ color: "#cfc8bd", maxWidth: "48ch", margin: "0 0 1.25rem" }}>
                  {scene.subline}
                </p>

                {scene.index === 6 && (
                  <div style={{ display: "grid", gap: "0.6rem", marginTop: "1rem" }}>
                    {RECONFIGURE_BEATS.map((beat) => (
                      <div
                        key={beat.layout}
                        style={{
                          padding: "0.7rem 0.9rem",
                          border: "1px solid var(--border)",
                          background: "var(--ink-surface)",
                        }}
                      >
                        <span className="mono-label" style={{ color: "var(--amber-on-dark)" }}>
                          {ROOM_LAYOUTS[beat.layout].shortName} · {beat.ceiling} ft
                        </span>
                        <p style={{ margin: "0.2rem 0 0", fontSize: "0.92rem", color: "#e6dfd5" }}>
                          {beat.line}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {scene.index === 7 && (
                  <div className="arch-card" style={{ marginTop: "1rem" }}>
                    <div style={{ marginBottom: "0.75rem" }}>
                      <span className="mono-label">Layout</span>
                      <div className="chip-row">
                        {LAYOUT_ORDER.slice(0, 4).map((lid) => (
                          <button
                            key={lid}
                            type="button"
                            className="chip-btn"
                            aria-pressed={layout === lid}
                            onClick={() => {
                              setLayout(lid);
                              setLiveStatus(`${ROOM_LAYOUTS[lid].name}, ${COLLECTIONS[collection].name}, ${FINISHES[finish].name}, ${ceiling}-foot ceiling.`);
                            }}
                          >
                            {ROOM_LAYOUTS[lid].shortName}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginBottom: "0.75rem" }}>
                      <span className="mono-label">Door style</span>
                      <div className="chip-row">
                        {COLLECTION_LIST.map((col) => (
                          <button
                            key={col.slug}
                            type="button"
                            className="chip-btn"
                            aria-pressed={collection === col.slug}
                            onClick={() => selectCollection(col.slug)}
                          >
                            {col.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginBottom: "0.85rem" }}>
                      <span className="mono-label">Finish</span>
                      <div className="chip-row">
                        {FINISH_ORDER.map((fSlug) => {
                          const valid = isValidFinishForCollection(collection, fSlug);
                          const f = FINISHES[fSlug];
                          return (
                            <button
                              key={fSlug}
                              type="button"
                              className="chip-btn"
                              disabled={!valid}
                              aria-pressed={finish === fSlug}
                              onClick={() => {
                                setFinish(fSlug);
                                setLiveStatus(`${ROOM_LAYOUTS[layout].name}, ${COLLECTIONS[collection].name}, ${f.name}, ${ceiling}-foot ceiling.`);
                              }}
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                      <div className="chip-row">
                        {([8, 9, 10] as CeilingHeightFt[]).map((ft) => (
                          <button
                            key={ft}
                            type="button"
                            className="chip-btn"
                            aria-pressed={ceiling === ft}
                            onClick={() => {
                              setCeiling(ft);
                              setLiveStatus(`${ROOM_LAYOUTS[layout].name}, ${COLLECTIONS[collection].name}, ${FINISHES[finish].name}, ${ft}-foot ceiling.`);
                            }}
                          >
                            {ft} ft
                          </button>
                        ))}
                      </div>
                      <Link
                        href={`/compose?layout=${layout}&collection=${collection}&finish=${finish}&ceiling=${ceiling}`}
                        className="btn btn-primary btn-sm"
                      >
                        Open full configurator
                      </Link>
                    </div>
                    <div className="sr-only" aria-live="polite">
                      {liveStatus}
                    </div>
                  </div>
                )}

                {scene.index === 8 && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "1rem",
                      marginTop: "1.25rem",
                    }}
                  >
                    <div className="arch-card">
                      <span className="mono-label" style={{ color: "var(--amber-on-dark)" }}>
                        Builders · Remodelers · Designers
                      </span>
                      <h3 className="h2-serif" style={{ margin: "0.4rem 0 0.7rem" }}>
                        For the trade.
                      </h3>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <Link href="/trade/send-a-plan" className="btn btn-primary btn-sm">
                          Send a plan
                        </Link>
                        <Link href="/trade" className="btn btn-sm">
                          Trade account
                        </Link>
                      </div>
                    </div>
                    <div className="arch-card">
                      <span className="mono-label" style={{ color: "var(--amber-on-dark)" }}>
                        Homeowners
                      </span>
                      <h3 className="h2-serif" style={{ margin: "0.4rem 0 0.7rem" }}>
                        For my home.
                      </h3>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <Link href="/showroom" className="btn btn-primary btn-sm">
                          {showroomOpen ? "Book a visit" : "Join preview list"}
                        </Link>
                        <Link href="/compose" className="btn btn-sm">
                          Start a design
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <figure style={{ margin: 0, position: "relative" }}>
                {!reduced && (scene.index === 2 || scene.index === 6) ? (
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    poster={sceneImages[scene.index]}
                    aria-label={scene.srDescription}
                    style={{
                      width: "100%",
                      aspectRatio: "16 / 10",
                      objectFit: "cover",
                      border: "1px solid var(--border)",
                      display: "block",
                      background: "#131110",
                    }}
                  >
                    <source
                      src={scene.index === 2 ? "/tier-c/loop-flight.mp4" : "/tier-c/loop-reconfig.mp4"}
                      type="video/mp4"
                    />
                  </video>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sceneImages[scene.index]}
                    alt={scene.srDescription}
                    loading={scene.index === 0 ? "eager" : "lazy"}
                    fetchPriority={scene.index === 0 ? "high" : "auto"}
                    style={{
                      width: "100%",
                      aspectRatio: "16 / 10",
                      objectFit: "cover",
                      border: "1px solid var(--border)",
                      display: "block",
                      background: "#131110",
                    }}
                  />
                )}
                {scene.isConceptRender && (
                  <figcaption
                    className="concept-render-tag"
                    style={{ position: "absolute", bottom: "0.75rem", right: "0.75rem" }}
                  >
                    Concept render
                  </figcaption>
                )}
              </figure>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

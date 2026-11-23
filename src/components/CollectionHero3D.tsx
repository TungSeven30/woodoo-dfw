"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { COLLECTIONS, CollectionSlug, FINISHES, FinishSlug } from "@/config/site";

const StudioCanvas = dynamic(
  () => import("./StudioCanvas").then((m) => m.StudioCanvas),
  { ssr: false }
);

export function CollectionHero3D({ slug }: { slug: CollectionSlug }) {
  const col = COLLECTIONS[slug];
  const [finish, setFinish] = useState<FinishSlug>(col.defaultFinish);
  const [doorsOpen, setDoorsOpen] = useState(false);

  return (
    <div className="theme-dark" style={{ border: "1px solid var(--border)" }}>
      <div style={{ height: "clamp(360px, 52vh, 520px)", position: "relative" }}>
        <StudioCanvas
          config={{
            mode: "collection-door",
            layout: "l-shape",
            collection: slug,
            finish,
            ceiling: 9,
            view: "perspective",
            timeOfDay: 0.78,
            doorsOpen,
          }}
          style={{ height: "100%" }}
          ariaLabel={`Interactive 3D showcase of ${col.name} cabinet in ${FINISHES[finish].name}. Concept render.`}
        />
      </div>
      <div
        style={{
          padding: "1.1rem 1.35rem",
          borderTop: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.85rem",
          background: "var(--ink-surface)",
        }}
      >
        <div className="chip-row" style={{ margin: 0 }} role="group" aria-label={`Available finishes for ${col.name}`}>
          {col.finishes.map((fSlug) => {
            const f = FINISHES[fSlug];
            return (
              <button
                key={fSlug}
                type="button"
                className="chip-btn"
                aria-pressed={finish === fSlug}
                onClick={() => setFinish(fSlug)}
              >
                <span
                  className="swatch-dot"
                  style={{ width: 15, height: 15, backgroundImage: `url(${f.swatchImage})` }}
                  aria-hidden="true"
                />
                {f.name}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-sm"
            style={{ color: "var(--paper)", borderColor: "rgba(241,238,231,0.3)" }}
            aria-pressed={doorsOpen}
            onClick={() => setDoorsOpen((o) => !o)}
          >
            {doorsOpen ? "Close doors" : "Open interior"}
          </button>
          <Link
            href={`/compose?collection=${slug}&finish=${finish}&layout=l-shape&ceiling=9`}
            className="btn btn-primary btn-sm"
          >
            Compose with this door
          </Link>
        </div>
      </div>
    </div>
  );
}

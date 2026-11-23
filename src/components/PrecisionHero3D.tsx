"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";

const StudioCanvas = dynamic(
  () => import("./StudioCanvas").then((m) => m.StudioCanvas),
  { ssr: false }
);

export function PrecisionHero3D() {
  const [inspectMode, setInspectMode] = useState<"reveal" | "interior" | "overview">("reveal");

  return (
    <div className="theme-dark" style={{ border: "1px solid var(--border)" }}>
      <div style={{ height: "clamp(360px, 54vh, 520px)", position: "relative" }}>
        <StudioCanvas
          config={{
            mode: "precision-macro",
            layout: "l-shape",
            collection: "traditional-shaker",
            finish: "premium-oak",
            ceiling: 9,
            view: "perspective",
            timeOfDay: 0.78,
            doorsOpen: inspectMode === "interior",
            showGhostFrame: inspectMode === "interior",
            macroZoom: inspectMode === "reveal",
          }}
          style={{ height: "100%" }}
          ariaLabel="Interactive 3D frameless cabinet precision demonstration showing 2 mm reveal and open full-access interior without a centre stile. Concept render."
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
          gap: "0.75rem",
          background: "var(--ink-surface)",
        }}
      >
        <div className="chip-row" style={{ margin: 0 }} role="group" aria-label="Precision inspection view">
          <button
            type="button"
            className="chip-btn"
            aria-pressed={inspectMode === "reveal"}
            onClick={() => setInspectMode("reveal")}
          >
            Macro 2 mm reveal
          </button>
          <button
            type="button"
            className="chip-btn"
            aria-pressed={inspectMode === "interior"}
            onClick={() => setInspectMode("interior")}
          >
            No frame (ghosted comparison)
          </button>
          <button
            type="button"
            className="chip-btn"
            aria-pressed={inspectMode === "overview"}
            onClick={() => setInspectMode("overview")}
          >
            Full cabinet exterior
          </button>
        </div>
        <span className="mono-label">Drag to inspect · 2.0 mm gap</span>
      </div>
    </div>
  );
}

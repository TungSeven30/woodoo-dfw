"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  COLLECTIONS,
  COLLECTION_LIST,
  CeilingHeightFt,
  CollectionSlug,
  FINISHES,
  FINISH_ORDER,
  FinishSlug,
  LayoutId,
  isValidFinishForCollection,
  resolveFinishForCollection,
} from "@/config/site";
import { LAYOUT_ORDER, ROOM_LAYOUTS, summarizeLayoutSchedule } from "@/config/layouts";
import type { StudioCanvasHandle } from "./StudioCanvas";
import type { StudioViewMode } from "@/engine/studio-engine";
import { markConfiguratorUsed, trackEvent } from "@/lib/analytics";

const StudioCanvas = dynamic(
  () => import("./StudioCanvas").then((m) => m.StudioCanvas),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100%",
          height: "100%",
          minHeight: "62vh",
          display: "grid",
          placeItems: "center",
          background: "#161412",
          color: "#b6aea3",
        }}
      >
        <span className="mono-label">Loading 3D studio...</span>
      </div>
    ),
  }
);

function parseLayout(raw: string | null): LayoutId {
  if (raw && raw in ROOM_LAYOUTS) return raw as LayoutId;
  return "l-shape";
}

function parseCollection(raw: string | null): CollectionSlug {
  if (raw && raw in COLLECTIONS) return raw as CollectionSlug;
  return "traditional-shaker";
}

function parseFinish(raw: string | null, col: CollectionSlug): FinishSlug {
  if (raw && raw in FINISHES) {
    return resolveFinishForCollection(col, raw as FinishSlug);
  }
  return COLLECTIONS[col].defaultFinish;
}

function parseCeiling(raw: string | null): CeilingHeightFt {
  if (raw === "8" || raw === "9" || raw === "10") return Number(raw) as CeilingHeightFt;
  return 9;
}

export function ComposeStudio() {
  const searchParams = useSearchParams();
  const canvasRef = useRef<StudioCanvasHandle | null>(null);

  const initialCol = parseCollection(searchParams.get("collection"));
  const [layout, setLayout] = useState<LayoutId>(() => parseLayout(searchParams.get("layout")));
  const [collection, setCollection] = useState<CollectionSlug>(() => initialCol);
  const [finish, setFinish] = useState<FinishSlug>(() =>
    parseFinish(searchParams.get("finish"), initialCol)
  );
  const [ceiling, setCeiling] = useState<CeilingHeightFt>(() =>
    parseCeiling(searchParams.get("ceiling"))
  );
  const [view, setView] = useState<StudioViewMode>("perspective");
  const [timeOfDay, setTimeOfDay] = useState<number>(0.76); // Late Texas afternoon default
  const [savedToast, setSavedToast] = useState<string>("");
  const [liveStatus, setLiveStatus] = useState<string>("");
  const [exportingAr, setExportingAr] = useState(false);

  useEffect(() => {
    markConfiguratorUsed();
  }, []);

  const announce = (
    nextL: LayoutId,
    nextC: CollectionSlug,
    nextF: FinishSlug,
    nextCeil: CeilingHeightFt
  ) => {
    const msg = `${ROOM_LAYOUTS[nextL].name}, ${COLLECTIONS[nextC].name}, ${FINISHES[nextF].name}, ${nextCeil}-foot ceiling.`;
    setLiveStatus(msg);
    markConfiguratorUsed();
    trackEvent("configurator_change", {
      source: "compose",
      layout: nextL,
      collection: nextC,
      finish: nextF,
      ceiling: nextCeil,
    });
  };

  const shareQuery = useMemo(() => {
    const sp = new URLSearchParams({
      layout,
      collection,
      finish,
      ceiling: String(ceiling),
    });
    return sp.toString();
  }, [layout, collection, finish, ceiling]);

  // Keep browser URL cleanly in sync as user configures
  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextUrl = `${window.location.pathname}?${shareQuery}`;
    window.history.replaceState(null, "", nextUrl);
  }, [shareQuery]);

  const handleSaveKitchen = async () => {
    const url = `${window.location.origin}/compose?${shareQuery}`;
    try {
      await navigator.clipboard.writeText(url);
      setSavedToast("Shareable link copied. Still render downloaded.");
    } catch {
      setSavedToast("Shareable URL updated in your address bar. Still render downloaded.");
    }

    const stillData = canvasRef.current?.exportStill();
    if (stillData) {
      const a = document.createElement("a");
      a.href = stillData;
      a.download = `woodoo-dfw-${layout}-${collection}-${finish}-${ceiling}ft.png`;
      a.click();
    }

    trackEvent("configurator_save", {
      layout,
      collection,
      finish,
      ceiling,
    });
    window.setTimeout(() => setSavedToast(""), 4500);
  };

  const handleExportAr = async () => {
    setExportingAr(true);
    try {
      const blob = await canvasRef.current?.exportGltf();
      if (blob) {
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objUrl;
        a.download = `woodoo-dfw-${layout}-${collection}-${finish}.glb`;
        a.click();
        window.setTimeout(() => URL.revokeObjectURL(objUrl), 2000);
        setSavedToast("3D glTF model exported for AR Quick Look / CAD viewers.");
      }
    } finally {
      setExportingAr(false);
    }
  };

  const quoteUrl = `/showroom?${shareQuery}&from=compose`;
  const tradeQuoteUrl = `/trade/send-a-plan?${shareQuery}&from=compose`;

  const dayLabel =
    timeOfDay < 0.25
      ? "Texas morning"
      : timeOfDay < 0.6
        ? "Midday"
        : timeOfDay < 0.85
          ? "Late afternoon"
          : "Golden hour";

  return (
    <div className="compose-layout theme-dark">
      {/* Interactive 3D Viewport */}
      <div className="compose-viewport">
        <StudioCanvas
          ref={canvasRef}
          config={{
            mode: "configurator",
            layout,
            collection,
            finish,
            ceiling,
            view,
            timeOfDay,
          }}
          style={{ height: "100%", minHeight: "62vh" }}
          ariaLabel={`Interactive 3D view of ${ROOM_LAYOUTS[layout].name} in ${COLLECTIONS[collection].name} ${FINISHES[finish].name} for a ${ceiling}-foot ceiling. Concept render.`}
        />

        {/* Top-left floating room specification stamp */}
        <div
          style={{
            position: "absolute",
            top: "1rem",
            left: "1rem",
            padding: "0.7rem 0.95rem",
            background: "rgba(19, 17, 16, 0.78)",
            border: "1px solid rgba(241, 238, 231, 0.16)",
            backdropFilter: "blur(8px)",
            pointerEvents: "none",
          }}
        >
          <span className="mono-label" style={{ color: "var(--amber-on-dark)", display: "block" }}>
            {ROOM_LAYOUTS[layout].name} · {ROOM_LAYOUTS[layout].footprintLabel}
          </span>
          <span style={{ fontSize: "0.88rem", color: "#f1eee7" }}>
            {COLLECTIONS[collection].name} · {FINISHES[finish].name} · {ceiling} ft ceiling (3&quot; molding)
          </span>
        </div>

        {/* Bottom-left view mode quick switcher */}
        <div
          style={{
            position: "absolute",
            bottom: "0.85rem",
            left: "1rem",
            display: "flex",
            gap: "0.4rem",
            flexWrap: "wrap",
          }}
        >
          {(
            [
              { id: "perspective", label: "Perspective" },
              { id: "plan", label: "Plan view" },
              { id: "walk-around", label: "Walk-around" },
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              type="button"
              className="chip-btn"
              aria-pressed={view === v.id}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Architectural Specification & Controls Rail */}
      <aside className="compose-sidebar" aria-label="Kitchen configurator controls">
        <div>
          <p className="mono-label" style={{ color: "var(--amber-on-dark)", marginBottom: "0.35rem" }}>
            Compose your kitchen
          </p>
          <h1 className="h2-serif" style={{ fontSize: "2.1rem", marginBottom: "0.45rem" }}>
            Five finishes. Three door styles.
          </h1>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#b6aea3" }}>
            Drag to orbit. Every change re-assembles the cabinetry in real time. Pricing and
            availability are prepared directly by our DFW team from your measurements.
          </p>
        </div>

        {/* Layout Selector */}
        <div>
          <span className="mono-label">01 · Room layout</span>
          <div className="chip-row" role="group" aria-label="Room layout">
            {LAYOUT_ORDER.map((lid) => (
              <button
                key={lid}
                type="button"
                id={`compose-layout-${lid}`}
                className="chip-btn"
                aria-pressed={layout === lid}
                onClick={() => {
                  setLayout(lid);
                  announce(lid, collection, finish, ceiling);
                }}
              >
                {ROOM_LAYOUTS[lid].shortName}
              </button>
            ))}
          </div>
          <p style={{ margin: "0.45rem 0 0", fontSize: "0.84rem", color: "#9e968b" }}>
            {ROOM_LAYOUTS[layout].description}
          </p>
        </div>

        {/* Collection Selector */}
        <div>
          <span className="mono-label">02 · Door style</span>
          <div className="chip-row" role="group" aria-label="Door style">
            {COLLECTION_LIST.map((col) => (
              <button
                key={col.slug}
                type="button"
                id={`compose-collection-${col.slug}`}
                className="chip-btn"
                aria-pressed={collection === col.slug}
                onClick={() => {
                  const nextFinish = resolveFinishForCollection(col.slug, finish);
                  setCollection(col.slug);
                  setFinish(nextFinish);
                  announce(layout, col.slug, nextFinish, ceiling);
                }}
              >
                {col.name}
              </button>
            ))}
          </div>
        </div>

        {/* Valid Finish Selector */}
        <div>
          <span className="mono-label">03 · Finish (valid for {COLLECTIONS[collection].name})</span>
          <div className="chip-row" role="group" aria-label="Finish">
            {FINISH_ORDER.map((fSlug) => {
              const valid = isValidFinishForCollection(collection, fSlug);
              const f = FINISHES[fSlug];
              return (
                <button
                  key={fSlug}
                  type="button"
                  id={`compose-finish-${fSlug}`}
                  className="chip-btn"
                  disabled={!valid}
                  aria-pressed={finish === fSlug}
                  onClick={() => {
                    setFinish(fSlug);
                    announce(layout, collection, fSlug, ceiling);
                  }}
                >
                  <span
                    className="swatch-dot"
                    style={{ width: 16, height: 16, backgroundImage: `url(${f.swatchImage})` }}
                    aria-hidden="true"
                  />
                  {f.name}
                </button>
              );
            })}
          </div>
          <p style={{ margin: "0.45rem 0 0", fontSize: "0.84rem", color: "#9e968b" }}>
            {FINISHES[finish].shortNote}
          </p>
        </div>

        {/* Ceiling Height Selector */}
        <div>
          <span className="mono-label">04 · Ceiling height (stacked uppers + 3&quot; molding)</span>
          <div className="chip-row" role="group" aria-label="Ceiling height">
            {([8, 9, 10] as CeilingHeightFt[]).map((ft) => (
              <button
                key={ft}
                type="button"
                id={`compose-ceiling-${ft}`}
                className="chip-btn"
                aria-pressed={ceiling === ft}
                onClick={() => {
                  setCeiling(ft);
                  announce(layout, collection, finish, ft);
                }}
              >
                {ft} ft ceiling
              </button>
            ))}
          </div>
        </div>

        {/* Stretch Goal: Time-of-Day Texas Light Slider */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label htmlFor="texas-light-slider" className="mono-label">
              05 · Texas daylight
            </label>
            <span className="mono-label" style={{ color: "var(--amber-on-dark)" }}>
              {dayLabel}
            </span>
          </div>
          <input
            id="texas-light-slider"
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(parseFloat(e.target.value))}
            style={{ width: "100%", marginTop: "0.45rem", accentColor: "#d18d43", cursor: "pointer" }}
          />
        </div>

        {/* Live Parametric Concept Kit Schedule */}
        {(() => {
          const sched = summarizeLayoutSchedule(layout, ceiling);
          return (
            <details
              style={{
                border: "1px solid rgba(241, 238, 231, 0.16)",
                background: "rgba(19, 17, 16, 0.5)",
                padding: "0.75rem 0.9rem",
              }}
            >
              <summary
                className="mono-label"
                style={{
                  cursor: "pointer",
                  color: "var(--paper)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  listStyle: "none",
                }}
              >
                <span>06 · Concept kit schedule</span>
                <span style={{ color: "var(--amber-on-dark)" }}>
                  {sched.cabinetCount + sched.stackedUpperCount} boxes
                </span>
              </summary>
              <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.38rem" }}>
                {sched.items.map((item) => (
                  <div
                    key={`${item.code}-${item.dimensionsLabel}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                      fontSize: "0.78rem",
                      borderBottom: "1px solid rgba(241, 238, 231, 0.08)",
                      paddingBottom: "0.3rem",
                    }}
                  >
                    <span style={{ color: "#f1eee7", fontFamily: "var(--font-mono)" }}>
                      {item.quantity}× {item.code}
                    </span>
                    <span style={{ color: "#b6aea3", textAlign: "right" }}>
                      {item.role} · {item.dimensionsLabel}
                    </span>
                  </div>
                ))}
                {sched.moldingRuns > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.78rem",
                      paddingTop: "0.15rem",
                    }}
                  >
                    <span style={{ color: "var(--amber-on-dark)", fontFamily: "var(--font-mono)" }}>
                      CROWN
                    </span>
                    <span style={{ color: "#ddd6cb" }}>3&quot; crown molding ({ceiling} ft stack)</span>
                  </div>
                )}
                <p style={{ margin: "0.45rem 0 0", fontSize: "0.72rem", color: "#9e968b", lineHeight: 1.45 }}>
                  Stand-in 32 mm proportions (PLACEHOLDER_DIMS) for visual layout planning. No
                  automated pricing — our DFW team verifies every box, filler, and panel from your
                  wall measurements.
                </p>
              </div>
            </details>
          );
        })()}

        {/* Save, Share, AR Export & Get Quoted */}
        <div
          className="hairline-top"
          style={{ paddingTop: "1.1rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}
        >
          <Link
            href={quoteUrl}
            id="compose-get-quoted"
            className="btn btn-primary"
            onClick={() =>
              trackEvent("cta_click", {
                cta: "compose-get-quoted",
                layout,
                collection,
                finish,
                ceiling,
              })
            }
          >
            Get this quoted (Homeowners)
          </Link>

          <Link
            href={tradeQuoteUrl}
            id="compose-send-plan"
            className="btn"
            style={{ color: "var(--paper)", borderColor: "rgba(241,238,231,0.3)" }}
            onClick={() =>
              trackEvent("cta_click", {
                cta: "compose-send-plan",
                layout,
                collection,
                finish,
                ceiling,
              })
            }
          >
            Attach to builder plan upload
          </Link>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            <button
              type="button"
              id="compose-save-btn"
              className="btn btn-sm"
              style={{ color: "var(--paper)", borderColor: "rgba(241,238,231,0.25)" }}
              onClick={() => void handleSaveKitchen()}
            >
              Save my kitchen
            </button>
            <button
              type="button"
              id="compose-ar-export"
              className="btn btn-sm"
              style={{ color: "var(--paper)", borderColor: "rgba(241,238,231,0.25)" }}
              disabled={exportingAr}
              onClick={() => void handleExportAr()}
            >
              {exportingAr ? "Exporting..." : "3D / AR glTF"}
            </button>
          </div>

          {savedToast && (
            <p
              role="status"
              style={{
                margin: "0.25rem 0 0",
                fontSize: "0.84rem",
                color: "var(--amber-on-dark)",
              }}
            >
              {savedToast}
            </p>
          )}
        </div>

        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {liveStatus}
        </div>
      </aside>
    </div>
  );
}

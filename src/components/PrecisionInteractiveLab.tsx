"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { CeilingHeightFt } from "@/config/site";

/**
 * Interactive Architectural Precision Workbench for /precision.
 * Pure SVG + keyboard-accessible range/button controls (zero heavy JS, 100% WCAG 2.2 AA).
 * 1) Framed vs. Frameless Cross-Section X-Ray Scrubber (face frame + center stile dissolve -> 2 mm reveal)
 * 2) Scaled 8 ft / 9 ft / 10 ft North Texas Ceiling Stack Elevation Blueprint
 */
export function PrecisionInteractiveLab() {
  // 0 = Traditional Framed (face frame + 3" center stile); 100 = European Frameless (full overlay, 2 mm reveal)
  const [framelessPct, setFramelessPct] = useState(100);
  const [ceiling, setCeiling] = useState<CeilingHeightFt>(9);

  const t = framelessPct / 100; // 0..1
  const frameOpacity = Math.max(0, 1 - t * 1.25);
  const faceStileW = (1 - t) * 26; // px visual scale on 360px cabinet face
  const centerStileW = (1 - t) * 34;
  // Gap between doors narrows smoothly from wide framed reveal (36px) to exact razor 2 mm hairline (3px)
  const doorGap = 36 - t * 33;
  const doorOuterInset = (1 - t) * 24;
  const leftDoorW = (360 - doorOuterInset * 2 - doorGap) / 2;

  const ceilingSpecs: Record<
    CeilingHeightFt,
    {
      totalIn: number;
      mainWallIn: number;
      stackedIn: number;
      caption: string;
      note: string;
    }
  > = {
    8: {
      totalIn: 96,
      mainWallIn: 39,
      stackedIn: 0,
      caption: "8 ft ceiling · Single tall wall tier + 3\" molding",
      note: "Full-height wall boxes run straight into 3-inch crown molding with zero wasted soffit gap.",
    },
    9: {
      totalIn: 108,
      mainWallIn: 36,
      stackedIn: 15,
      caption: "9 ft ceiling · Main wall run + stacked upper tier + 3\" molding",
      note: "A dedicated stacked upper tier bridges nine-foot North Texas ceilings cleanly with 3-inch molding.",
    },
    10: {
      totalIn: 120,
      mainWallIn: 42,
      stackedIn: 21,
      caption: "10 ft ceiling · Tall wall run + deep stacked upper tier + 3\" molding",
      note: "Full-elevation ten-foot cabinetry built from modular wall boxes, tall stacked uppers, and 3-inch molding.",
    },
  };

  const cSpec = ceilingSpecs[ceiling];
  // Blueprint scale: 120" -> 270px vertical height
  const pxPerIn = 2.25;
  const baseH = 34.5 * pxPerIn;
  const counterH = 1.5 * pxPerIn;
  const splashH = 18 * pxPerIn;
  const wallH = cSpec.mainWallIn * pxPerIn;
  const stackH = cSpec.stackedIn * pxPerIn;
  const moldH = 3 * pxPerIn;
  const floorY = 296;

  return (
    <div style={{ display: "grid", gap: "2rem" }}>
      {/* 1. Interactive Framed vs. Frameless X-Ray Scrubber */}
      <div className="arch-card" style={{ padding: "clamp(1.25rem, 3vw, 2.25rem)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "1.4rem",
          }}
        >
          <div>
            <p className="mono-label" style={{ color: "var(--accent)", marginBottom: "0.4rem" }}>
              Interactive cross-section · 36&quot; base cabinet elevation
            </p>
            <h2 className="h2-serif" style={{ margin: 0 }}>
              Watch the face frame disappear.
            </h2>
          </div>
          <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-sm"
              aria-pressed={framelessPct === 0}
              style={
                framelessPct === 0
                  ? { borderColor: "var(--accent)", color: "var(--accent)" }
                  : undefined
              }
              onClick={() => setFramelessPct(0)}
            >
              Traditional framed
            </button>
            <button
              type="button"
              className="btn btn-sm"
              aria-pressed={framelessPct === 50}
              style={
                framelessPct === 50
                  ? { borderColor: "var(--accent)", color: "var(--accent)" }
                  : undefined
              }
              onClick={() => setFramelessPct(50)}
            >
              Overlay compare
            </button>
            <button
              type="button"
              className="btn btn-sm"
              aria-pressed={framelessPct === 100}
              style={
                framelessPct === 100
                  ? { borderColor: "var(--accent)", color: "var(--accent)" }
                  : undefined
              }
              onClick={() => setFramelessPct(100)}
            >
              European frameless (2 mm)
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
            gap: "2rem",
            alignItems: "center",
          }}
        >
          {/* Architectural CAD SVG Elevation */}
          <div
            style={{
              background: "#131110",
              border: "1px solid var(--border-strong)",
              padding: "1.25rem",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <svg
              viewBox="0 0 440 290"
              role="img"
              aria-label={`Architectural comparison diagram currently set to ${framelessPct}% frameless construction`}
              style={{ width: "100%", height: "auto", display: "block" }}
            >
              {/* Subtle drafting grid */}
              <defs>
                <pattern id="cad-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path
                    d="M 20 0 L 0 0 0 20"
                    fill="none"
                    stroke="rgba(241,238,231,0.06)"
                    strokeWidth="0.75"
                  />
                </pattern>
              </defs>
              <rect width="440" height="290" fill="url(#cad-grid)" />

              {/* Outer Carcass Box (x=40..400, y=38..236) */}
              <rect
                x="40"
                y="38"
                width="360"
                height="198"
                fill="#221f1c"
                stroke="#b79165"
                strokeWidth="1.5"
              />
              {/* Interior Full-Access Shelf Line */}
              <line
                x1="50"
                y1="138"
                x2="390"
                y2="138"
                stroke="rgba(241,238,231,0.42)"
                strokeWidth="3"
              />
              <text
                x="220"
                y="128"
                textAnchor="middle"
                fill="rgba(241,238,231,0.72)"
                fontSize="10"
                fontFamily="monospace"
                letterSpacing="1.2"
              >
                {t > 0.8
                  ? "FULL-WIDTH UNOBSTRUCTED ACCESS"
                  : "OPENING NARROWED BY FACE FRAME & STILE"}
              </text>

              {/* Translucent Full-Overlay Doors Gliding to 2 mm Reveal */}
              <rect
                x={40 + doorOuterInset}
                y={38 + doorOuterInset * 0.4}
                width={leftDoorW}
                height={198 - doorOuterInset * 0.8}
                fill="rgba(183, 145, 101, 0.24)"
                stroke="#f1eee7"
                strokeWidth="1.25"
              />
              <rect
                x={40 + doorOuterInset + leftDoorW + doorGap}
                y={38 + doorOuterInset * 0.4}
                width={leftDoorW}
                height={198 - doorOuterInset * 0.8}
                fill="rgba(183, 145, 101, 0.24)"
                stroke="#f1eee7"
                strokeWidth="1.25"
              />

              {/* Dissolving Traditional Face Frame + Center Stile */}
              {frameOpacity > 0.01 && (
                <g opacity={frameOpacity}>
                  {/* Left & Right Face Stiles */}
                  <rect
                    x="40"
                    y="38"
                    width={faceStileW}
                    height="198"
                    fill="rgba(209, 141, 67, 0.34)"
                    stroke="#d18d43"
                    strokeDasharray="4 3"
                  />
                  <rect
                    x={400 - faceStileW}
                    y="38"
                    width={faceStileW}
                    height="198"
                    fill="rgba(209, 141, 67, 0.34)"
                    stroke="#d18d43"
                    strokeDasharray="4 3"
                  />
                  {/* Vertical Center Stile */}
                  <rect
                    x={220 - centerStileW / 2}
                    y="38"
                    width={centerStileW}
                    height="198"
                    fill="rgba(209, 141, 67, 0.42)"
                    stroke="#d18d43"
                    strokeDasharray="4 3"
                  />
                </g>
              )}

              {/* Precision Center Gap Dimension Callout */}
              <line
                x1={220 - doorGap / 2}
                y1="258"
                x2={220 + doorGap / 2}
                y2="258"
                stroke="#d18d43"
                strokeWidth="1.5"
              />
              <line
                x1={220 - doorGap / 2}
                y1="242"
                x2={220 - doorGap / 2}
                y2="264"
                stroke="#d18d43"
                strokeWidth="1"
              />
              <line
                x1={220 + doorGap / 2}
                y1="242"
                x2={220 + doorGap / 2}
                y2="264"
                stroke="#d18d43"
                strokeWidth="1"
              />
              <text
                x="220"
                y="278"
                textAnchor="middle"
                fill="#f1eee7"
                fontSize="11"
                fontFamily="monospace"
                letterSpacing="1.4"
              >
                {t > 0.85
                  ? "EXACT 2.0 MM SHADOW REVEAL · ZERO CENTER STILE"
                  : t < 0.15
                    ? "EXPOSED FACE FRAME + VERTICAL CENTER STILE"
                    : "TRANSITIONING TO FULL-OVERLAY FRAMELESS"}
              </text>

              {/* Top Elevation Dimension Hairline */}
              <line x1="40" y1="20" x2="400" y2="20" stroke="rgba(241,238,231,0.35)" strokeWidth="1" />
              <text
                x="220"
                y="14"
                textAnchor="middle"
                fill="#b6aea3"
                fontSize="10"
                fontFamily="monospace"
                letterSpacing="1.2"
              >
                FACTORY-FINISHED EXTERIOR SIDES · FULL OVERLAY
              </text>
            </svg>
          </div>

          {/* Interactive Range Control + Plain-English Readout */}
          <div>
            <label
              htmlFor="frameless-xray-slider"
              className="mono-label"
              style={{ display: "block", marginBottom: "0.65rem", color: "var(--fg)" }}
            >
              Scrub construction geometry ({framelessPct}% frameless)
            </label>
            <input
              id="frameless-xray-slider"
              type="range"
              min={0}
              max={100}
              step={2}
              value={framelessPct}
              onChange={(e) => setFramelessPct(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent)", marginBottom: "1.25rem" }}
            />

            <div style={{ display: "grid", gap: "0.85rem" }}>
              <div
                style={{
                  padding: "0.85rem 1rem",
                  borderLeft: "2px solid var(--accent)",
                  background: "var(--bg-elevated)",
                }}
              >
                <p className="mono-label" style={{ color: "var(--accent)", marginBottom: "0.25rem" }}>
                  {t > 0.7 ? "Frameless European geometry" : "Traditional face-frame box"}
                </p>
                <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--fg-muted)" }}>
                  {t > 0.7
                    ? "Doors span the full cabinet face down to a 2 mm shadow reveal. Zero inner lip catches wide roasting pans, and no vertical center stile splits the opening."
                    : "A nailed front frame and center vertical stile shrink usable width inside the box and leave broad wood borders visible around every closed door."}
                </p>
              </div>
              <p className="mono-label" style={{ margin: 0 }}>
                Confirmed specs: frameless · full overlay · 2 mm reveal · no face frame or center stile · factory-finished sides.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Scaled 8 ft / 9 ft / 10 ft Ceiling Blueprint Switcher */}
      <div className="arch-card" style={{ padding: "clamp(1.25rem, 3vw, 2.25rem)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <p className="mono-label" style={{ color: "var(--accent)", marginBottom: "0.4rem" }}>
              8 ft · 9 ft · 10 ft vertical architecture
            </p>
            <h2 className="h2-serif" style={{ margin: 0 }}>
              Stacked to the ceiling with 3-inch molding.
            </h2>
          </div>
          <div style={{ display: "flex", gap: "0.45rem" }} role="group" aria-label="Select ceiling elevation">
            {([8, 9, 10] as CeilingHeightFt[]).map((ft) => (
              <button
                key={ft}
                type="button"
                className={`btn btn-sm ${ceiling === ft ? "btn-primary" : ""}`}
                aria-pressed={ceiling === ft}
                onClick={() => setCeiling(ft)}
              >
                {ft} ft ceiling
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "2rem",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: "#131110",
              border: "1px solid var(--border-strong)",
              padding: "1.25rem",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <svg
              viewBox="0 0 420 315"
              role="img"
              aria-label={`Scaled ${ceiling}-foot kitchen elevation diagram showing modular wall boxes and 3-inch crown molding`}
              style={{ width: "100%", height: "auto", display: "block" }}
            >
              {/* Ceiling datum line */}
              {(() => {
                const ceilY = floorY - cSpec.totalIn * pxPerIn;
                const wallBottomY = floorY - baseH - counterH - splashH;
                const wallTopY = wallBottomY - wallH;
                const stackTopY = stackH > 0 ? wallTopY - 2 - stackH : wallTopY;
                const moldTopY = stackTopY - moldH;
                return (
                  <>
                    {/* Ceiling Line */}
                    <line
                      x1="36"
                      y1={ceilY}
                      x2="384"
                      y2={ceilY}
                      stroke="#d18d43"
                      strokeWidth="1.5"
                      strokeDasharray="6 4"
                    />
                    <text
                      x="384"
                      y={ceilY - 6}
                      textAnchor="end"
                      fill="#d18d43"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {ceiling} FT CEILING ({cSpec.totalIn}&quot;)
                    </text>

                    {/* 3-inch Crown Molding */}
                    <rect
                      x="92"
                      y={moldTopY}
                      width="220"
                      height={moldH}
                      fill="#d18d43"
                      stroke="#f1eee7"
                      strokeWidth="0.75"
                    />
                    <text
                      x="324"
                      y={moldTopY + moldH / 2 + 3}
                      fill="#f1eee7"
                      fontSize="9.5"
                      fontFamily="monospace"
                    >
                      3&quot; MOLDING
                    </text>

                    {/* Stacked Upper Tier (9 ft & 10 ft) */}
                    {stackH > 0 && (
                      <>
                        <rect
                          x="92"
                          y={stackTopY}
                          width="109"
                          height={stackH}
                          fill="#2a241f"
                          stroke="#b79165"
                          strokeWidth="1.2"
                        />
                        <rect
                          x="203"
                          y={stackTopY}
                          width="109"
                          height={stackH}
                          fill="#2a241f"
                          stroke="#b79165"
                          strokeWidth="1.2"
                        />
                        <text
                          x="202"
                          y={stackTopY + stackH / 2 + 3}
                          textAnchor="middle"
                          fill="#f1eee7"
                          fontSize="9.5"
                          fontFamily="monospace"
                        >
                          STACKED UPPER TIER
                        </text>
                      </>
                    )}

                    {/* Main Wall Cabinets */}
                    <rect
                      x="92"
                      y={wallTopY}
                      width="109"
                      height={wallH}
                      fill="#352d25"
                      stroke="#f1eee7"
                      strokeWidth="1.1"
                    />
                    <rect
                      x="203"
                      y={wallTopY}
                      width="109"
                      height={wallH}
                      fill="#352d25"
                      stroke="#f1eee7"
                      strokeWidth="1.1"
                    />
                    <text
                      x="202"
                      y={wallTopY + wallH / 2 + 3}
                      textAnchor="middle"
                      fill="#f1eee7"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      MAIN WALL RUN
                    </text>

                    {/* Backsplash Zone */}
                    <rect
                      x="92"
                      y={wallBottomY}
                      width="220"
                      height={splashH}
                      fill="rgba(220,212,199,0.14)"
                      stroke="rgba(241,238,231,0.2)"
                    />
                    <text
                      x="202"
                      y={wallBottomY + splashH / 2 + 3}
                      textAnchor="middle"
                      fill="#b6aea3"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      BACKSPLASH ZONE
                    </text>

                    {/* Countertop */}
                    <rect
                      x="88"
                      y={floorY - baseH - counterH}
                      width="228"
                      height={counterH}
                      fill="#e8e2d7"
                    />

                    {/* Base Cabinet + Toe Kick */}
                    <rect
                      x="92"
                      y={floorY - baseH}
                      width="109"
                      height={baseH - 10}
                      fill="#352d25"
                      stroke="#f1eee7"
                      strokeWidth="1.1"
                    />
                    <rect
                      x="203"
                      y={floorY - baseH}
                      width="109"
                      height={baseH - 10}
                      fill="#352d25"
                      stroke="#f1eee7"
                      strokeWidth="1.1"
                    />
                    <rect x="96" y={floorY - 10} width="212" height="10" fill="#1c1916" />
                    <text
                      x="202"
                      y={floorY - baseH / 2}
                      textAnchor="middle"
                      fill="#f1eee7"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      BASE CABINET RUN
                    </text>

                    {/* Floor Line */}
                    <line x1="36" y1={floorY} x2="384" y2={floorY} stroke="#f1eee7" strokeWidth="1.5" />
                    <text x="42" y={floorY + 13} fill="#b6aea3" fontSize="9.5" fontFamily="monospace">
                      FINISHED FLOOR (0&quot;)
                    </text>

                    {/* Vertical Elevation Arrow */}
                    <line x1="60" y1={ceilY} x2="60" y2={floorY} stroke="#d18d43" strokeWidth="1" />
                    <text
                      x="54"
                      y={(ceilY + floorY) / 2}
                      textAnchor="end"
                      fill="#f1eee7"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {ceiling}&apos;
                    </text>
                  </>
                );
              })()}
            </svg>
          </div>

          <div>
            <p className="mono-label" style={{ color: "var(--accent)", marginBottom: "0.45rem" }}>
              {cSpec.caption}
            </p>
            <p className="prose" style={{ marginBottom: "1.25rem" }}>
              {cSpec.note}
            </p>
            <p style={{ fontSize: "0.86rem", color: "var(--fg-muted)", marginBottom: "1.5rem" }}>
              Elevation diagram uses stand-in 32 mm proportions (PLACEHOLDER_DIMS) pending confirmation
              of exact stocked box heights against the Woodoo catalog. Confirmed 3-inch crown molding
              caps every 8, 9, and 10 ft run.
            </p>
            <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
              <Link
                href={`/compose?layout=island&collection=flat&finish=classic-walnut&ceiling=${ceiling}`}
                className="btn btn-primary btn-sm"
              >
                Test {ceiling} ft in 3D studio
              </Link>
              <Link href="/trade/send-a-plan" className="btn btn-sm">
                Send ceiling measurements
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";

export interface FinishSpecimenItem {
  slug: string;
  name: string;
  shortNote: string;
  swatchHex: string;
  swatchImage: string;
  collections: Array<{ slug: string; name: string }>;
}

type LightMode = "morning" | "midday" | "afternoon";

const LIGHT_MODES: Record<
  LightMode,
  { label: string; kelvin: string; filter: string; sheenOverlay: string; note: string }
> = {
  morning: {
    label: "North morning",
    kelvin: "5600 K",
    filter: "brightness(1.02) saturate(0.92) contrast(1.02)",
    sheenOverlay:
      "linear-gradient(115deg, rgba(220,234,255,0.16) 0%, rgba(255,255,255,0) 48%, rgba(19,17,16,0.16) 100%)",
    note: "Cool indirect northern exposure reveals true neutral undertones without amber shift.",
  },
  midday: {
    label: "Texas midday",
    kelvin: "4800 K",
    filter: "brightness(1.07) saturate(1.0) contrast(1.04)",
    sheenOverlay:
      "linear-gradient(160deg, rgba(255,252,244,0.14) 0%, rgba(255,255,255,0) 55%, rgba(19,17,16,0.12) 100%)",
    note: "High neutral light brings out recessed Shaker shadows and tight 2 mm shadow lines.",
  },
  afternoon: {
    label: "Late afternoon",
    kelvin: "3800 K",
    filter: "brightness(0.98) sepia(0.14) saturate(1.12) contrast(1.06)",
    sheenOverlay:
      "linear-gradient(122deg, rgba(255,204,132,0.24) 0%, rgba(255,190,110,0.04) 46%, rgba(19,17,16,0.24) 100%)",
    note: "Raking 3800 K late-Texas light deepens oak warmth and grazes dark Iron Black pores.",
  },
};

/**
 * Lightweight interactive five-finish Daylight Inspector for /collections.
 * Receives serialized specimen items from the Server Component to keep client JS strictly under 170 KB gzip.
 */
export function MaterialLightInspector({ items }: { items: FinishSpecimenItem[] }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [light, setLight] = useState<LightMode>("afternoon");

  const active = items[selectedIdx] ?? items[0];
  const lm = LIGHT_MODES[light];

  return (
    <div>
      {/* Five Swatch Selector Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(195px, 1fr))",
          gap: "0.9rem",
          marginBottom: "1.5rem",
        }}
        role="group"
        aria-label="Select a cabinet finish to inspect under daylight"
      >
        {items.map((f, idx) => {
          const isSelected = idx === selectedIdx;
          const usedIn = f.collections.map((c) => c.name).join(" · ");
          return (
            <button
              key={f.slug}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedIdx(idx)}
              className="arch-card"
              style={{
                padding: "0.9rem",
                textAlign: "left",
                cursor: "pointer",
                borderColor: isSelected ? "var(--accent)" : undefined,
                boxShadow: isSelected ? "0 0 0 1px var(--accent)" : undefined,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.swatchImage}
                alt={`${f.name} finish reference`}
                style={{
                  width: "100%",
                  aspectRatio: "4 / 3",
                  objectFit: "cover",
                  display: "block",
                  marginBottom: "0.75rem",
                  border: "1px solid var(--border)",
                }}
              />
              <span
                style={{
                  display: "block",
                  fontFamily: "var(--font-sans)",
                  fontWeight: 600,
                  fontSize: "1.02rem",
                  color: "var(--fg)",
                  marginBottom: "0.2rem",
                }}
              >
                {f.name}
              </span>
              <span
                className="mono-label"
                style={{
                  display: "block",
                  fontSize: "0.66rem",
                  color: isSelected ? "var(--accent)" : "var(--fg-muted)",
                }}
              >
                {usedIn}
              </span>
            </button>
          );
        })}
      </div>

      {/* Expanded Raking-Light Specimen Board */}
      <div
        className="arch-card"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.75rem",
          alignItems: "center",
          padding: "clamp(1.15rem, 2.8vw, 2rem)",
        }}
      >
        <div
          style={{
            position: "relative",
            aspectRatio: "16 / 10",
            border: "1px solid var(--border-strong)",
            overflow: "hidden",
            background: active.swatchHex,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={active.swatchImage}
            alt={`${active.name} under ${lm.label} (${lm.kelvin})`}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              filter: lm.filter,
              transition: "filter 0.35s ease",
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background: lm.sheenOverlay,
              pointerEvents: "none",
            }}
          />
          <span
            className="mono-label"
            style={{
              position: "absolute",
              left: "0.75rem",
              bottom: "0.75rem",
              background: "rgba(19, 17, 16, 0.84)",
              color: "#f1eee7",
              padding: "0.3rem 0.6rem",
              fontSize: "0.68rem",
            }}
          >
            {active.name} · {lm.label} ({lm.kelvin})
          </span>
        </div>

        <div>
          <p className="mono-label" style={{ color: "var(--accent)", marginBottom: "0.4rem" }}>
            Specimen board · Daylight study
          </p>
          <h3 className="h2-serif" style={{ marginBottom: "0.55rem" }}>
            {active.name}
          </h3>
          <p style={{ margin: "0 0 0.85rem", color: "var(--fg)" }}>{active.shortNote}</p>
          <p style={{ margin: "0 0 1.2rem", fontSize: "0.92rem", color: "var(--fg-muted)" }}>
            {lm.note}
          </p>

          <div
            style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", marginBottom: "1.25rem" }}
            role="group"
            aria-label="Switch lighting temperature"
          >
            {(Object.keys(LIGHT_MODES) as LightMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className="btn btn-sm"
                aria-pressed={light === mode}
                style={
                  light === mode
                    ? { borderColor: "var(--accent)", color: "var(--accent)" }
                    : undefined
                }
                onClick={() => setLight(mode)}
              >
                {LIGHT_MODES[mode].label}
              </button>
            ))}
          </div>

          <p className="mono-label" style={{ marginBottom: "0.55rem" }}>
            Available in {active.collections.length} door{" "}
            {active.collections.length === 1 ? "style" : "styles"}
          </p>
          <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
            {active.collections.map((c) => (
              <Link
                key={c.slug}
                href={`/compose?collection=${c.slug}&finish=${active.slug}&layout=l-shape&ceiling=9`}
                className="btn btn-primary btn-sm"
              >
                Open {c.name} in 3D
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

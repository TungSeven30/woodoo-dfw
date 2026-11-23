import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PRECISION_PILLARS } from "@/config/content";
import { PrecisionHero3D } from "@/components/PrecisionHero3D";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Frameless Precision & 2 mm Reveal",
  description:
    "How European-style frameless construction delivers a 2 mm full-overlay reveal, full-access interiors without a centre stile, and 8, 9, and 10 ft ceiling systems.",
  alternates: { canonical: "/precision" },
};

export default function PrecisionPage() {
  return (
    <div className="page-shell">
      <section className="section-pad hairline-bottom">
        <div className="container">
          <p className="mono-label" style={{ marginBottom: "0.7rem" }}>
            Engineering · Frameless system
          </p>
          <h1 className="h1-serif" style={{ maxWidth: "16ch", marginBottom: "1rem" }}>
            Precision is the proof.
          </h1>
          <p className="prose" style={{ marginBottom: "2rem" }}>
            Real European frameless cabinetry does not hide gaps behind face frames. Full-overlay
            doors align across the box with a 2 mm reveal, factory-finished sides, and zero centre
            stile.
          </p>

          <PrecisionHero3D />
        </div>
      </section>

      <section className="section-pad hairline-bottom">
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {PRECISION_PILLARS.map((pillar) => (
              <article key={pillar.code} className="arch-card">
                <p className="mono-label" style={{ color: "var(--accent)", marginBottom: "0.55rem" }}>
                  {pillar.code}
                </p>
                <h2 className="h3-sans" style={{ marginBottom: "0.65rem" }}>
                  {pillar.title}
                </h2>
                <p style={{ margin: 0, color: "var(--fg-muted)", fontSize: "0.96rem" }}>
                  {pillar.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Ceiling Stack Comparison for 8 / 9 / 10 ft North Texas Homes */}
      <section className="section-pad">
        <div className="container">
          <p className="mono-label" style={{ marginBottom: "0.55rem" }}>
            8 ft · 9 ft · 10 ft vertical architecture
          </p>
          <h2 className="h2-serif" style={{ marginBottom: "1rem" }}>
            Stacked to the ceiling with 3-inch molding.
          </h2>
          <p className="prose" style={{ marginBottom: "2rem" }}>
            North Texas remodels and custom builds span eight-, nine-, and ten-foot ceilings.
            Stacked modular upper boxes paired with 3-inch molding finish every elevation cleanly.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {[
              {
                ft: 8,
                desc: "Full-height wall cabinets finished cleanly to 8 ft with 3-inch crown molding.",
                bars: ["3\" molding", "Main wall cabinet", "18\" backsplash", "Base cabinet + counter"],
              },
              {
                ft: 9,
                desc: "Main wall cabinets plus a stacked upper tier and 3-inch crown meeting 9 ft ceilings.",
                bars: ["3\" molding", "Stacked upper box", "Main wall cabinet", "Base cabinet + counter"],
              },
              {
                ft: 10,
                desc: "Tall wall runs crowned by deep stacked upper cabinets and 3-inch molding up to 10 ft.",
                bars: ["3\" molding", "Tall stacked upper box", "Tall wall cabinet", "Base cabinet + counter"],
              },
            ].map((item) => (
              <div key={item.ft} className="arch-card">
                <span className="mono-label" style={{ color: "var(--accent)" }}>
                  {item.ft}-foot ceiling system
                </span>
                <div
                  style={{
                    margin: "1rem 0",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.3rem",
                  }}
                >
                  {item.bars.map((bar, i) => (
                    <div
                      key={bar}
                      style={{
                        padding: i === 0 ? "0.28rem 0.65rem" : "0.62rem 0.75rem",
                        background: i === 0 ? "var(--accent)" : "var(--bg-elevated)",
                        color: i === 0 ? "var(--accent-fg)" : "var(--fg)",
                        border: "1px solid var(--border)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.72rem",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      {bar}
                    </div>
                  ))}
                </div>
                <p style={{ margin: "0 0 1rem", fontSize: "0.9rem", color: "var(--fg-muted)" }}>
                  {item.desc}
                </p>
                <Link
                  href={`/compose?layout=island&collection=flat&finish=classic-walnut&ceiling=${item.ft}`}
                  className="btn btn-sm"
                >
                  View {item.ft} ft in 3D
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

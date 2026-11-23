import React from "react";
import type { Metadata } from "next";
import { PRECISION_PILLARS } from "@/config/content";
import { PrecisionHero3D } from "@/components/PrecisionHero3D";
import { PrecisionInteractiveLab } from "@/components/PrecisionInteractiveLab";
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

      {/* Interactive Architectural Cross-Section & Scaled 8/9/10 ft Ceiling Blueprint */}
      <section className="section-pad">
        <div className="container">
          <PrecisionInteractiveLab />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

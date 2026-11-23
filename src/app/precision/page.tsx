import React from "react";
import type { Metadata } from "next";
import { PRECISION_PILLARS } from "@/config/content";
import { PrecisionHero3D } from "@/components/PrecisionHero3D";
import { PrecisionInteractiveLab } from "@/components/PrecisionInteractiveLab";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Frameless Precision & 2 mm Reveal",
  description:
    "How European-style frameless construction delivers a 2 mm full-overlay reveal, full-access interiors without a center stile, and 8, 9, and 10 ft ceiling systems.",
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
            Look at the gaps. <span className="tone-2">Two millimeters, every one.</span>
          </h1>
          <p className="prose" style={{ marginBottom: "2rem" }}>
            Frameless cabinets have no face frame to hide behind. Full-overlay doors cover the box
            edge to edge, with a 2 mm reveal, finished sides, and no center stile.
          </p>

          <PrecisionHero3D />
        </div>
      </section>

      <section className="section-pad hairline-bottom">
        <div className="container">
          <div className="spec-list">
            {PRECISION_PILLARS.map((pillar) => (
              <article key={pillar.code} className="spec-list-item">
                <p className="spec-code">{pillar.code}</p>
                <h2 className="h3-sans">{pillar.title}</h2>
                <p>{pillar.body}</p>
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

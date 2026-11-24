import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PRECISION_PILLARS } from "@/config/content";
import { SiteFooter } from "@/components/SiteFooter";
import { Media } from "@/components/Media";

export const metadata: Metadata = {
  title: "Frameless Precision & 2 mm Reveal",
  description:
    "How European-style frameless construction delivers a 2 mm full-overlay reveal, full-access interiors without a center stile, and 8, 9, and 10 ft ceiling systems.",
  alternates: { canonical: "/precision" },
};

export default function PrecisionPage() {
  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="container">
          <p className="mono-label">How it&apos;s built</p>
          <h1 className="display-serif" style={{ maxWidth: "14ch", marginTop: "0.6rem" }}>
            Look at the gaps. <span className="tone-2">Two millimeters, every one.</span>
          </h1>
          <p className="lede">
            Frameless cabinets have no face frame to hide behind. Full-overlay doors cover the box
            edge to edge, with a 2 mm gap, finished sides, and no center stile.
          </p>
        </div>
      </section>

      <div className="container">
        <div className="detail-pair">
          <div>
            <Media name="detail-reveal" shape="port" priority sizes="(max-width: 900px) 100vw, 45vw" />
            <h3 className="h3-sans">One thin, even line</h3>
            <p>Doors sit on the face of the box, so the gap between them stays the same 2 mm everywhere.</p>
          </div>
          <div>
            <Media name="detail-interior" shape="port" priority sizes="(max-width: 900px) 100vw, 45vw" />
            <h3 className="h3-sans">The whole width is yours</h3>
            <p>No face frame and no post in the middle. Wide pans and trays slide straight in.</p>
          </div>
        </div>
      </div>

      <section className="section-pad">
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

      <div className="container">
        <div className="feature hairline-top">
          <Media name="kitchen-ivory-flat" shape="land" sizes="(max-width: 900px) 100vw, 60vw" />
          <div className="feature-body">
            <h2 className="h2-serif">
              Up to the ceiling. <span className="tone-2">8, 9, or 10 feet.</span>
            </h2>
            <p>
              Stacked upper cabinets and a 3-inch molding take the run all the way up, so there is no
              dusty gap above the cabinets and no filler that looks like an afterthought.
            </p>
            <div className="btn-row">
              <Link href="/collections" className="btn btn-primary">
                See the collections
              </Link>
              <Link href="/trade/send-a-plan" className="btn">
                Send ceiling measurements
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: "clamp(3rem, 7vw, 6rem)" }} />

      <SiteFooter />
    </div>
  );
}

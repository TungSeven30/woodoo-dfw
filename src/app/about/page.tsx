import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ABOUT_COPY, LOCAL_DFW_COMMUNITIES } from "@/config/content";
import { SITE_CONFIG } from "@/config/site";
import { SiteFooter } from "@/components/SiteFooter";
import { Media } from "@/components/Media";

export const metadata: Metadata = {
  title: "About Our DFW Branch",
  description:
    "The Dallas–Fort Worth branch bringing European-style frameless RTA kitchen and bath cabinets manufactured in Malaysia to North Texas builders and homeowners.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="container">
          <p className="mono-label" style={{ color: "var(--accent)", marginBottom: "0.75rem" }}>
            {ABOUT_COPY.eyebrow}
          </p>
          <h1 className="h1-serif" style={{ maxWidth: "18ch", marginBottom: "1.4rem" }}>
            {ABOUT_COPY.headline}
          </h1>
          <p
            className="prose"
            style={{ fontSize: "1.22rem", color: "var(--fg)", marginBottom: "2rem", maxWidth: "62ch" }}
          >
            {ABOUT_COPY.lead}
          </p>

          {/* Editorial Pull-Quote */}
          <blockquote
            style={{
              margin: "0 0 2rem",
              padding: "1.25rem 0 1.25rem 1.5rem",
              borderLeft: "2px solid var(--accent)",
              maxWidth: "56ch",
            }}
          >
            <p
              className="h2-serif"
              style={{
                fontSize: "clamp(1.5rem, 2.6vw, 2.15rem)",
                lineHeight: 1.18,
                margin: 0,
                color: "var(--fg)",
              }}
            >
              “{ABOUT_COPY.pullQuote}”
            </p>
          </blockquote>

          <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
            <Link href="/collections" className="btn btn-primary">
              Explore collections
            </Link>
            <Link href="/precision" className="btn">
              See the 2 mm reveal
            </Link>
          </div>
        </div>
      </section>

      <div className="container">
        <Media name="kitchen-white-shaker" shape="wide" priority sizes="100vw" />
      </div>

      <section className="section-pad">
        <div className="container">
          <div className="spec-list">
            {ABOUT_COPY.sections.map((sec) => (
              <article key={sec.title} className="spec-list-item">
                <p className="spec-code">{sec.chapter}</p>
                <h2 className="h3-sans">{sec.title}</h2>
                <p>{sec.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="container">
        <div className="feature hairline-top">
          <Media name="bath-walnut" shape="port" sizes="(max-width: 900px) 100vw, 55vw" />
          <div className="feature-body">
            <h2 className="h2-serif">
              Kitchens and baths. <span className="tone-2">One system for both.</span>
            </h2>
            <p>
              The same frameless boxes, door styles and finishes run from the kitchen to the
              vanity, so a whole house can match.
            </p>
            <div className="btn-row">
              <Link href="/collections" className="btn btn-primary">
                See the collections
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* North Texas Service Footprint */}
      <section className="section-pad">
        <div className="container">
          <div
            className="hairline-top"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1.75rem",
              alignItems: "start",
              paddingTop: "2.5rem",
            }}
          >
            <div>
              <p className="mono-label" style={{ color: "var(--accent)", marginBottom: "0.45rem" }}>
                North Texas supply footprint
              </p>
              <h2 className="h2-serif" style={{ marginBottom: "0.7rem" }}>
                Local stock and one point of contact across DFW.
              </h2>
              <p style={{ margin: 0, color: "var(--fg-muted)" }}>
                {SITE_CONFIG.BRAND_NAME} supports remodelers, builders, architects, and homeowners
                across the metroplex with showroom consultations, warehouse pickup once open, LTL
                freight, and white-glove delivery.
              </p>
            </div>
            <div>
              <p className="mono-label" style={{ marginBottom: "0.65rem" }}>
                Communities served
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
                {LOCAL_DFW_COMMUNITIES.map((city) => (
                  <span
                    key={city}
                    className="mono-label"
                    style={{
                      padding: "0.4rem 0.8rem",
                      borderRadius: 999,
                      background: "var(--bg-surface)",
                      color: "var(--fg)",
                    }}
                  >
                    {city}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

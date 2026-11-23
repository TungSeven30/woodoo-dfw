import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ABOUT_COPY, LOCAL_DFW_COMMUNITIES } from "@/config/content";
import { SITE_CONFIG } from "@/config/site";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "About Our DFW Branch",
  description:
    "The Dallas–Fort Worth branch bringing European-style frameless RTA kitchen and bath cabinets manufactured in Malaysia to North Texas builders and homeowners.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="page-shell">
      <section className="section-pad hairline-bottom">
        <div className="container" style={{ maxWidth: "1040px" }}>
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
              Inspect 2 mm precision
            </Link>
            <Link href="/trade/send-a-plan" className="btn">
              Send a plan
            </Link>
            <Link href="/showroom" className="btn">
              Join preview list
            </Link>
          </div>
        </div>
      </section>

      {/* Architectural Monograph Chapters */}
      <section className="section-pad hairline-bottom">
        <div className="container" style={{ maxWidth: "1040px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {ABOUT_COPY.sections.map((sec) => (
              <article key={sec.title} className="arch-card" style={{ padding: "1.65rem" }}>
                <span className="mono-label" style={{ color: "var(--accent)" }}>
                  {sec.chapter}
                </span>
                <h2 className="h2-serif" style={{ fontSize: "1.75rem", margin: "0.55rem 0 0.85rem" }}>
                  {sec.title}
                </h2>
                <p style={{ margin: 0, color: "var(--fg-muted)", lineHeight: 1.65 }}>{sec.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* North Texas Service Footprint */}
      <section className="section-pad">
        <div className="container" style={{ maxWidth: "1040px" }}>
          <div
            className="arch-card"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1.75rem",
              alignItems: "center",
              padding: "clamp(1.4rem, 3vw, 2.25rem)",
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
                      padding: "0.35rem 0.65rem",
                      border: "1px solid var(--border-strong)",
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

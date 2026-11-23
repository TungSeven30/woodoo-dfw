import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ABOUT_COPY } from "@/config/content";
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
        <div className="container" style={{ maxWidth: "960px" }}>
          <p className="mono-label" style={{ color: "var(--accent)", marginBottom: "0.7rem" }}>
            {ABOUT_COPY.eyebrow}
          </p>
          <h1 className="h1-serif" style={{ marginBottom: "1.2rem" }}>
            {ABOUT_COPY.headline}
          </h1>
          <p className="prose" style={{ fontSize: "1.2rem", color: "var(--fg)", marginBottom: "1.75rem" }}>
            {ABOUT_COPY.lead}
          </p>
          <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
            <Link href="/collections" className="btn btn-primary">
              Explore collections
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

      <section className="section-pad">
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {ABOUT_COPY.sections.map((sec, idx) => (
              <article key={sec.title} className="arch-card">
                <span className="mono-label" style={{ color: "var(--accent)" }}>
                  0{idx + 1}
                </span>
                <h2 className="h3-sans" style={{ margin: "0.45rem 0 0.65rem" }}>
                  {sec.title}
                </h2>
                <p style={{ margin: 0, color: "var(--fg-muted)" }}>{sec.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

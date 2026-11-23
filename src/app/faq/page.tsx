import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { FAQ_ITEMS } from "@/config/content";
import { buildFaqJsonLd } from "@/lib/seo";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Cabinetry FAQ — Frameless & DFW",
  description:
    "Plain answers on frameless vs framed cabinets, 8/9/10 ft sizing, Malaysian manufacturing, delivery, and customer-arranged installation in Dallas–Fort Worth.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  const faqLd = buildFaqJsonLd();

  return (
    <div className="page-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <section className="section-pad hairline-bottom">
        <div className="container" style={{ maxWidth: "900px" }}>
          <p className="mono-label" style={{ marginBottom: "0.65rem" }}>
            Frequently asked questions
          </p>
          <h1 className="h1-serif" style={{ marginBottom: "1rem" }}>
            Plain answers.
          </h1>
          <p className="prose" style={{ marginBottom: "1.5rem" }}>
            How European frameless cabinets compare with framed boxes, how our 8, 9, and 10 ft
            systems stack, where cabinets are manufactured, and how installation works.
          </p>
          <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
            <Link href="/trade/send-a-plan" className="btn btn-primary">
              Send a plan
            </Link>
            <Link href="/showroom" className="btn">
              Book a visit
            </Link>
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="container" style={{ maxWidth: "900px", display: "grid", gap: "1rem" }}>
          {FAQ_ITEMS.map((item, idx) => (
            <details
              key={item.q}
              open={idx < 3}
              className="arch-card"
              style={{ cursor: "pointer" }}
            >
              <summary
                className="h3-sans"
                style={{
                  listStyle: "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <span>{item.q}</span>
                <span className="mono-label" aria-hidden="true">
                  0{idx + 1}
                </span>
              </summary>
              <p
                style={{
                  margin: "0.9rem 0 0",
                  color: "var(--fg-muted)",
                  maxWidth: "66ch",
                }}
              >
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

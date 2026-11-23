import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PROCESS_STEPS } from "@/config/content";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Our Seven-Step Process",
  description:
    "From product inspiration and design consultation through production, delivery, pickup, and post-installation support. Your installer, your schedule.",
  alternates: { canonical: "/process" },
};

export default function ProcessPage() {
  return (
    <div className="page-shell">
      <section className="section-pad hairline-bottom">
        <div className="container">
          <p className="mono-label" style={{ marginBottom: "0.7rem" }}>
            Start to finish
          </p>
          <h1 className="h1-serif" style={{ maxWidth: "16ch", marginBottom: "1rem" }}>
            Seven steps. One point of contact.
          </h1>
          <p className="prose" style={{ marginBottom: "1.6rem" }}>
            Clear finish choices, verified part lists, plain answers on price and stock, and a
            person who stays with your project through delivery and post-installation support.
            Customers arrange their own installation. Your installer, your schedule.
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
        <div className="container" style={{ maxWidth: "960px" }}>
          <ol
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "grid",
              gap: "1rem",
            }}
          >
            {PROCESS_STEPS.map((step) => (
              <li
                key={step.number}
                className="arch-card"
                style={{
                  display: "grid",
                  gridTemplateColumns: "84px 1fr",
                  gap: "1.25rem",
                  alignItems: "start",
                }}
              >
                <span
                  className="h2-serif"
                  style={{ color: "var(--accent)", lineHeight: 1 }}
                  aria-hidden="true"
                >
                  {step.number}
                </span>
                <div>
                  <h2 className="h3-sans" style={{ marginBottom: "0.45rem" }}>
                    {step.title}
                  </h2>
                  <p style={{ margin: 0, color: "var(--fg-muted)", maxWidth: "60ch" }}>
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

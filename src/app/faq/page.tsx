import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { FAQ_ITEMS } from "@/config/content";
import { buildFaqJsonLd } from "@/lib/seo";
import { SiteFooter } from "@/components/SiteFooter";
import { Media } from "@/components/Media";

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

      <section className="page-hero">
        <div className="container">
          <p className="mono-label">Questions</p>
          <h1 className="display-serif" style={{ maxWidth: "14ch", marginTop: "0.6rem" }}>
            Plain answers. <span className="tone-2">No fine print.</span>
          </h1>
          <p className="lede">
            Frameless versus framed, how the 8, 9 and 10 ft systems stack, where the cabinets are
            made, and how installation works.
          </p>
        </div>
      </section>

      <section className="section-pad" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="faq-list">
            {FAQ_ITEMS.map((item, idx) => (
              <details key={item.q} open={idx === 0} className="faq-item">
                <summary>
                  <span>{item.q}</span>
                  <span className="faq-icon" aria-hidden="true" />
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <div className="container">
        <div className="feature hairline-top">
          <Media name="showroom" shape="land" sizes="(max-width: 900px) 100vw, 55vw" />
          <div className="feature-body">
            <h2 className="h2-serif">
              Still wondering? <span className="tone-2">Ask a person.</span>
            </h2>
            <p>
              Send a plan and we will check every cabinet, filler and trim piece. Or come see the
              finishes and talk it through.
            </p>
            <div className="btn-row">
              <Link href="/trade/send-a-plan" className="btn btn-primary">
                Send a plan
              </Link>
              <Link href="/contact" className="btn">
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

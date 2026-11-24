import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  SITE_CONFIG,
  getDisplayAddress,
  isPlaceholderValue,
} from "@/config/site";
import { TradeAccountForm } from "@/components/LeadForms";
import { SiteFooter } from "@/components/SiteFooter";
import { Media } from "@/components/Media";

export const metadata: Metadata = {
  title: "Contact the DFW Team",
  description:
    "Reach the Dallas–Fort Worth cabinetry team for builder plans, trade accounts, homeowner showroom previews, and referral partnerships.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const address = getDisplayAddress();
  const hasPhone = !isPlaceholderValue(SITE_CONFIG.PHONE);
  const hasEmail = !isPlaceholderValue(SITE_CONFIG.EMAIL);

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="container feature" style={{ paddingBlock: 0 }}>
          <div className="feature-body">
            <p className="mono-label">Dallas–Fort Worth</p>
            <h1 className="display-serif" style={{ marginTop: "0.6rem" }}>
              Talk with <span className="tone-2">a person.</span>
            </h1>
            <p className="lede">
              Questions about collections, finishes, delivery or the DFW opening? Write to us below.
              A person reads every message.
            </p>
            <dl className="fact-row" style={{ gridTemplateColumns: "1fr", margin: "0 0 1.5rem" }}>
              <div>
                <dt>Showroom and warehouse</dt>
                <dd>{address}</dd>
              </div>
              {hasPhone && (
                <div>
                  <dt>Phone</dt>
                  <dd>
                    <a href={`tel:${SITE_CONFIG.PHONE}`}>{SITE_CONFIG.PHONE}</a>
                  </dd>
                </div>
              )}
              {hasEmail && (
                <div>
                  <dt>Email</dt>
                  <dd>
                    <a href={`mailto:${SITE_CONFIG.EMAIL}`}>{SITE_CONFIG.EMAIL}</a>
                  </dd>
                </div>
              )}
            </dl>
          </div>
          <Media name="consultation" shape="port" priority sizes="(max-width: 900px) 100vw, 45vw" />
        </div>
      </section>

      <section className="section-pad hairline-top">
        <div className="container form-split">
          <div>
            <h2 className="h2-serif">
              Send a message. <span className="tone-2">We&apos;ll write back.</span>
            </h2>
            <p className="prose" style={{ marginTop: "1rem" }}>
              Have drawings already? <Link href="/trade/send-a-plan">Send a plan</Link> instead and
              we&apos;ll return a full cabinet list. Want to see the finishes?{" "}
              <Link href="/showroom">Book a visit</Link>.
            </p>
          </div>
          <TradeAccountForm mode="contact" />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

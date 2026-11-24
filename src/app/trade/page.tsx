import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { SITE_CONFIG } from "@/config/site";
import { TRADE_BENEFITS } from "@/config/content";
import { TradeAccountForm } from "@/components/LeadForms";
import { SiteFooter } from "@/components/SiteFooter";
import { Media } from "@/components/Media";

export const metadata: Metadata = {
  title: "Trade Program for DFW Builders",
  description:
    "Frameless European RTA cabinets for independent builders, remodelers, architects, and interior designers in Dallas–Fort Worth. Send a plan or open a trade account.",
  alternates: { canonical: "/trade" },
};

export default function TradePage() {
  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="container">
          <p className="mono-label">Builders · Remodelers · Designers · Architects</p>
          <h1 className="display-serif" style={{ maxWidth: "15ch", marginTop: "0.6rem" }}>
            Send us the plan. <span className="tone-2">We&apos;ll send back every piece.</span>
          </h1>
          <p className="lede">
            One missing filler can stall a job. A person on our DFW team checks your drawings by hand,
            box by box, panel by panel, down to the toe kicks and molding, and gives you plain answers
            on price and availability.
          </p>
          <div className="btn-row">
            <Link href="/trade/send-a-plan" className="btn btn-primary">
              Send a plan
            </Link>
            <a href="#trade-account" className="btn">
              Open a trade account
            </a>
          </div>
        </div>
      </section>

      <div className="container">
        <Media name="loading-dock" shape="wide" priority sizes="100vw" />
      </div>

      {/* Trade Benefits */}
      <section className="section-pad hairline-bottom">
        <div className="container">
          <h2 className="h2-serif" style={{ maxWidth: "20ch", marginBottom: "1.75rem" }}>
            The trade program. <span className="tone-2">Built around how jobs actually run.</span>
          </h2>
          <div className="spec-list">
            {TRADE_BENEFITS.map((item, i) => (
              <div key={item.title} className="spec-list-item">
                <span className="spec-code">0{i + 1}</span>
                <h3 className="h3-sans">{item.title}</h3>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Flat-pack vs. assembled */}
      <section className="section-pad hairline-bottom">
        <div className="container">
          <h2 className="h2-serif" style={{ maxWidth: "20ch", marginBottom: "2rem" }}>
            Flat-pack or assembled. <span className="tone-2">Your call, job by job.</span>
          </h2>
          <div className="detail-pair">
            <div>
              <Media name="flatpack" shape="land" sizes="(max-width: 900px) 100vw, 45vw" />
              <h3 className="h3-sans">Flat-pack</h3>
              <p>
                Every side, shelf, door and filler arrives flat and packed tight. Easy to carry up
                stairs and through a house that is still being lived in.
              </p>
            </div>
            <div>
              <Media name="assembled" shape="land" sizes="(max-width: 900px) 100vw, 45vw" />
              <h3 className="h3-sans">Assembled</h3>
              <p>
                Boxes arrive whole, so your crew goes straight to layout, fillers and molding on
                your schedule.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trade Account Application */}
      <section id="trade-account" className="section-pad hairline-bottom">
        <div className="container form-split">
          <div className="sticky-aside">
            <p className="mono-label" style={{ marginBottom: "0.55rem" }}>
              Trade application
            </p>
            <h2 className="h2-serif" style={{ marginBottom: "0.75rem" }}>
              Apply for a DFW trade account.
            </h2>
            <p style={{ color: "var(--fg-muted)", margin: 0 }}>
              Open to independent builders, remodelers, interior designers and architects across
              Dallas, Fort Worth, Richardson, Plano, Frisco, McKinney and Allen.
            </p>
            <details id="referral-partner" className="faq-item" style={{ marginTop: "2rem" }}>
              <summary>
                <span>Realtor or referral partner?</span>
                <span className="faq-icon" aria-hidden="true" />
              </summary>
              <p>
                Send clients who are upgrading a builder-grade kitchen. They get to see the
                cabinets in person, with one design contact through delivery.
              </p>
              <TradeAccountForm mode="referral-partner" />
            </details>
          </div>
          <TradeAccountForm mode="trade-account" />
        </div>
      </section>

      {/* Optional Dealer Channel (Feature Flagged — Off by Default) */}
      {SITE_CONFIG.featureFlags.dealerChannel && (
        <section id="dealer-inquiry" className="section-pad">
          <div className="container" style={{ maxWidth: "880px" }}>
            <p className="mono-label" style={{ marginBottom: "0.55rem" }}>
              Dealer &amp; reseller channel
            </p>
            <h2 className="h2-serif" style={{ marginBottom: "0.75rem" }}>
              Dealer inquiry.
            </h2>
            <TradeAccountForm mode="dealer-inquiry" />
          </div>
        </section>
      )}

      <SiteFooter />
    </div>
  );
}

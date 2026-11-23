import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { SITE_CONFIG } from "@/config/site";
import { TRADE_BENEFITS } from "@/config/content";
import { TradeAccountForm } from "@/components/LeadForms";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Trade Program for DFW Builders",
  description:
    "Frameless European RTA cabinets for independent builders, remodelers, architects, and interior designers in Dallas–Fort Worth. Send a plan or open a trade account.",
  alternates: { canonical: "/trade" },
};

export default function TradePage() {
  return (
    <div className="page-shell">
      <section className="section-pad hairline-bottom">
        <div className="container">
          <p className="mono-label" style={{ marginBottom: "0.7rem" }}>
            Independent builders · Remodelers · Designers · Architects
          </p>
          <h1 className="h1-serif" style={{ maxWidth: "16ch", marginBottom: "1rem" }}>
            Send us the plan. We&apos;ll send back every piece.
          </h1>
          <p className="prose" style={{ marginBottom: "1.75rem" }}>
            A single missing filler can stall an entire job site. Our DFW trade team reviews your
            drawings by hand, checks boxes, panels, toe kicks, and 3-inch molding together, and
            gives plain answers on pricing and availability.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href="/trade/send-a-plan" className="btn btn-primary">
              Send a plan now
            </Link>
            <a href="#trade-account" className="btn">
              Open a trade account
            </a>
            <a href="#referral-partner" className="btn">
              Become a referral partner
            </a>
          </div>
        </div>
      </section>

      {/* Trade Benefits */}
      <section className="section-pad hairline-bottom">
        <div className="container">
          <p className="mono-label" style={{ marginBottom: "0.55rem" }}>
            Trade program benefits
          </p>
          <h2 className="h2-serif" style={{ marginBottom: "1.75rem" }}>
            Built around how North Texas jobs actually run.
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {TRADE_BENEFITS.map((item, i) => (
              <div key={item.title} className="arch-card">
                <span className="mono-label" style={{ color: "var(--accent)" }}>
                  0{i + 1}
                </span>
                <h3 className="h3-sans" style={{ margin: "0.4rem 0 0.5rem" }}>
                  {item.title}
                </h3>
                <p style={{ margin: 0, color: "var(--fg-muted)", fontSize: "0.94rem" }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trade Account Application */}
      <section id="trade-account" className="section-pad hairline-bottom">
        <div className="container" style={{ maxWidth: "880px" }}>
          <p className="mono-label" style={{ marginBottom: "0.55rem" }}>
            Trade application
          </p>
          <h2 className="h2-serif" style={{ marginBottom: "0.75rem" }}>
            Apply for a DFW trade account.
          </h2>
          <p className="prose" style={{ marginBottom: "1.75rem" }}>
            Open for independent builders, remodelers, interior designers, and architects across
            Dallas, Fort Worth, Richardson, Plano, Frisco, McKinney, and Allen.
          </p>
          <TradeAccountForm mode="trade-account" />
        </div>
      </section>

      {/* Realtor & Referral Partners */}
      <section id="referral-partner" className="section-pad hairline-bottom">
        <div className="container" style={{ maxWidth: "880px" }}>
          <p className="mono-label" style={{ marginBottom: "0.55rem" }}>
            Realtors &amp; referral partners
          </p>
          <h2 className="h2-serif" style={{ marginBottom: "0.75rem" }}>
            Send your clients somewhere you trust.
          </h2>
          <p className="prose" style={{ marginBottom: "1.75rem" }}>
            Help buyers upgrading builder-grade kitchens see European frameless cabinetry in person,
            with a single design point of contact through delivery.
          </p>
          <TradeAccountForm mode="referral-partner" />
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

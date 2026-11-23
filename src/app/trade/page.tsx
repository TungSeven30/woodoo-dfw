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
            Send us the plan. <span className="tone-2">We&apos;ll send back every piece.</span>
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

      {/* Flat-Pack vs. Assembled Builder Format Comparison */}
      <section className="section-pad hairline-bottom">
        <div className="container">
          <p className="mono-label" style={{ marginBottom: "0.55rem" }}>
            Supply format · Choose per project
          </p>
          <h2 className="h2-serif" style={{ marginBottom: "1.5rem" }}>
            Flat-pack RTA or pre-assembled. Your call on every job.
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
              gap: "1.5rem",
            }}
          >
            <div className="arch-card" style={{ padding: "1.6rem" }}>
              <span className="mono-label" style={{ color: "var(--accent)" }}>
                Format A · Ready-to-assemble flat-pack
              </span>
              <h3 className="h2-serif" style={{ fontSize: "1.65rem", margin: "0.45rem 0 0.7rem" }}>
                Built for tight job sites and freight protection.
              </h3>
              <p style={{ margin: "0 0 1rem", color: "var(--fg-muted)", fontSize: "0.95rem" }}>
                Every side, shelf, door, toe kick, and filler arrives flat and packed tightly — easy
                to carry through narrow townhome staircases, high-rise freight elevators, and active
                remodel corridors without scuffing finished ends.
              </p>
              <p className="mono-label" style={{ margin: 0 }}>
                Best for: Multi-story remodels · Tight staging footprints · LTL freight
              </p>
            </div>
            <div className="arch-card" style={{ padding: "1.6rem" }}>
              <span className="mono-label" style={{ color: "var(--accent)" }}>
                Format B · Assembled boxes
              </span>
              <h3 className="h2-serif" style={{ fontSize: "1.65rem", margin: "0.45rem 0 0.7rem" }}>
                Built for fast set-and-level crew days.
              </h3>
              <p style={{ margin: "0 0 1rem", color: "var(--fg-muted)", fontSize: "0.95rem" }}>
                Cabinets arrive boxed and whole so your carpentry crew moves straight into wall
                layout, scribing fillers, hanging stacked uppers, and setting 3-inch crown molding on
                your schedule.
              </p>
              <p className="mono-label" style={{ margin: 0 }}>
                Best for: Ground-floor new builds · Tight install calendars · Local pickup / white-glove
              </p>
            </div>
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

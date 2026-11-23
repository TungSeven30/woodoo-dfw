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
      <section className="section-pad hairline-bottom">
        <div className="container" style={{ maxWidth: "920px" }}>
          <p className="mono-label" style={{ marginBottom: "0.65rem" }}>
            Dallas–Fort Worth
          </p>
          <h1 className="h1-serif" style={{ marginBottom: "1rem" }}>
            Talk with a person.
          </h1>
          <p className="prose" style={{ marginBottom: "1.75rem" }}>
            Have a specific question about collections, finishes, delivery, or opening timing in
            North Texas? Write directly below, or jump straight to Send a plan or Book a visit.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1rem",
              marginBottom: "2.25rem",
            }}
          >
            <div className="arch-card">
              <span className="mono-label">Showroom &amp; Warehouse</span>
              <p style={{ margin: "0.4rem 0 0", fontWeight: 500 }}>{address}</p>
            </div>
            {/* Phone and email cards appear only once real details are configured. */}
            {hasPhone && (
              <div className="arch-card">
                <span className="mono-label">Phone</span>
                <p style={{ margin: "0.4rem 0 0", fontWeight: 500 }}>{SITE_CONFIG.PHONE}</p>
              </div>
            )}
            {hasEmail && (
              <div className="arch-card">
                <span className="mono-label">Email</span>
                <p style={{ margin: "0.4rem 0 0", fontWeight: 500 }}>{SITE_CONFIG.EMAIL}</p>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", marginBottom: "2.25rem" }}>
            <Link href="/trade/send-a-plan" className="btn btn-primary btn-sm">
              Send a plan
            </Link>
            <Link href="/showroom" className="btn btn-sm">
              Book a visit
            </Link>
          </div>

          <TradeAccountForm mode="contact" />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

import React from "react";
import type { Metadata } from "next";
import { SITE_CONFIG } from "@/config/site";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: `Terms of use, concept render disclosures, and installation responsibilities for ${SITE_CONFIG.BRAND_NAME}.`,
  alternates: { canonical: "/legal/terms" },
};

export default function TermsPage() {
  return (
    <div className="page-shell">
      <section className="section-pad">
        <div className="container prose" style={{ maxWidth: "74ch" }}>
          <p className="mono-label" style={{ marginBottom: "0.65rem" }}>
            Legal
          </p>
          <h1 className="h1-serif" style={{ color: "var(--fg)", marginBottom: "1.25rem" }}>
            Terms of use
          </h1>
          <h2 className="h3-sans" style={{ color: "var(--fg)", margin: "1.5rem 0 0.5rem" }}>
            Concept renders &amp; digital finishes
          </h2>
          <p>
            Interactive 3D kitchens, bathrooms, and finish previews on this website are concept
            renders created for layout exploration. Screen colour varies by display. Always inspect
            physical finish samples and approve your written cabinet list before placing an order.
          </p>
          <h2 className="h3-sans" style={{ color: "var(--fg)", margin: "1.5rem 0 0.5rem" }}>
            Quotes &amp; verification
          </h2>
          <p>
            This website does not generate binding prices, automated stock promises, or guaranteed
            delivery dates. Every quote, cabinet dimension, filler callout, and schedule is verified
            in writing by our Dallas–Fort Worth team.
          </p>
          <h2 className="h3-sans" style={{ color: "var(--fg)", margin: "1.5rem 0 0.5rem" }}>
            Installation responsibility
          </h2>
          <p>
            {SITE_CONFIG.BRAND_NAME} supplies cabinetry and coordinates delivery or pickup.
            Customers arrange their own installation and verify site measurements with their
            installer prior to order sign-off.
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

import React from "react";
import type { Metadata } from "next";
import { SITE_CONFIG } from "@/config/site";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy practices for ${SITE_CONFIG.BRAND_NAME} lead submissions, uploaded plans, and analytics.`,
  alternates: { canonical: "/legal/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="page-shell">
      <section className="section-pad">
        <div className="container prose" style={{ maxWidth: "74ch" }}>
          <p className="mono-label" style={{ marginBottom: "0.65rem" }}>
            Legal
          </p>
          <h1 className="h1-serif" style={{ color: "var(--fg)", marginBottom: "1.25rem" }}>
            Privacy policy
          </h1>
          <p>
            {SITE_CONFIG.BRAND_NAME} collects only the information you actively submit through our
            plan upload, consultation booking, preview list, trade account, referral, or contact
            forms.
          </p>
          <h2 className="h3-sans" style={{ color: "var(--fg)", margin: "1.5rem 0 0.5rem" }}>
            How we use your information
          </h2>
          <p>
            Drawings, measurements, contact details, and saved configurator specifications are used
            solely to prepare cabinet layouts, itemized quotes, showroom preview invitations, and
            trade account onboarding. We do not sell customer data or share drawings with third
            parties outside our estimating and fulfillment workflow.
          </p>
          <h2 className="h3-sans" style={{ color: "var(--fg)", margin: "1.5rem 0 0.5rem" }}>
            Analytics &amp; cookies
          </h2>
          <p>
            This site uses privacy-friendly, cookieless event measurement to understand scene
            engagement and form reliability without cross-site advertising trackers. Session storage
            is used strictly to remember optional sound and display preferences during your visit.
          </p>
          <h2 className="h3-sans" style={{ color: "var(--fg)", margin: "1.5rem 0 0.5rem" }}>
            Requests &amp; deletion
          </h2>
          <p>
            To update or remove submitted plans or contact records, reach out through our contact
            page. Formal Texas LLC legal entity details will be published here prior to showroom
            opening.
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

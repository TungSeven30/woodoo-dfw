import React, { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  SITE_CONFIG,
  getDisplayAddress,
  isPlaceholderValue,
  isShowroomOpen,
} from "@/config/site";
import { LOCAL_DFW_COMMUNITIES } from "@/config/content";
import { BookVisitForm } from "@/components/LeadForms";
import { TestimonialsBlock } from "@/components/TestimonialsBlock";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "DFW Showroom & Design Visits",
  description:
    "Join the Dallas–Fort Worth showroom preview list or request a virtual kitchen design consultation for European-style frameless cabinets.",
  alternates: { canonical: "/showroom" },
};

export default function ShowroomPage() {
  const open = isShowroomOpen();
  const address = getDisplayAddress();
  const hasOpeningDate = !isPlaceholderValue(SITE_CONFIG.OPENING_DATE);

  return (
    <div className="page-shell">
      <section className="section-pad hairline-bottom">
        <div className="container">
          <p className="mono-label" style={{ color: "var(--accent)", marginBottom: "0.65rem" }}>
            {open ? "Dallas–Fort Worth Showroom" : "DFW showroom — opening soon"}
          </p>
          <h1 className="h1-serif" style={{ maxWidth: "16ch", marginBottom: "1rem" }}>
            {open ? "See the grain in person." : "Be first through the doors."}
          </h1>
          <p className="prose" style={{ marginBottom: "1.5rem" }}>
            {open
              ? "Walk through full-scale frameless kitchen displays, handle every finish board, and review your room dimensions with a design consultant."
              : "Our Dallas–Fort Worth showroom and local warehouse are preparing to open. Join the preview list for early access, or start with a virtual design consultation right now."}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1rem",
              marginTop: "1.5rem",
            }}
          >
            <div className="arch-card">
              <span className="mono-label">Location</span>
              <p style={{ margin: "0.4rem 0 0", fontWeight: 500 }}>{address}</p>
            </div>
            <div className="arch-card">
              <span className="mono-label">Status</span>
              <p style={{ margin: "0.4rem 0 0", fontWeight: 500 }}>
                {hasOpeningDate ? `Opening ${SITE_CONFIG.OPENING_DATE}` : "Preview list & virtual consultations open"}
              </p>
            </div>
            <div className="arch-card">
              <span className="mono-label">Service area</span>
              <p style={{ margin: "0.4rem 0 0", fontSize: "0.92rem", color: "var(--fg-muted)" }}>
                {LOCAL_DFW_COMMUNITIES.slice(0, 7).join(", ")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="container" style={{ maxWidth: "880px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <div>
              <p className="mono-label" style={{ marginBottom: "0.4rem" }}>
                {open ? "Book a visit" : "Preview list & virtual design"}
              </p>
              <h2 className="h2-serif">
                {open ? "Schedule your consultation." : "Reserve your preview invite or virtual session."}
              </h2>
            </div>
            <Link href="/compose" className="btn btn-sm">
              Compose a layout first
            </Link>
          </div>

          <Suspense fallback={<p className="mono-label">Loading booking form...</p>}>
            <BookVisitForm />
          </Suspense>
        </div>
      </section>

      <TestimonialsBlock />
      <SiteFooter />
    </div>
  );
}

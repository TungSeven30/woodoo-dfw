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
import { Media } from "@/components/Media";

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
      <section className="page-hero">
        <div className="container">
          <p className="mono-label">
            {open ? "Dallas–Fort Worth showroom" : "DFW showroom · opening soon"}
          </p>
          <h1 className="display-serif" style={{ maxWidth: "14ch", marginTop: "0.6rem" }}>
            {open ? (
              <>
                See the grain. <span className="tone-2">Touch every finish.</span>
              </>
            ) : (
              <>
                Be first through <span className="tone-2">the doors.</span>
              </>
            )}
          </h1>
          <p className="lede">
            {open
              ? "Walk through full-size kitchen displays, handle every finish sample, and go over your room with a designer."
              : "Our Dallas–Fort Worth showroom is getting ready to open. Join the list to hear first, or start now with a virtual design consultation."}
          </p>
          <div className="btn-row">
            <a href="#book" className="btn btn-primary">
              {open ? "Book a visit" : "Join the list"}
            </a>
            <Link href="/collections" className="btn">
              See the collections
            </Link>
          </div>
        </div>
      </section>

      <div className="container">
        <Media name="showroom" shape="wide" priority sizes="100vw" />
        <dl className="fact-row">
          <div>
            <dt>Location</dt>
            <dd>{address}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              {hasOpeningDate
                ? `Opening ${SITE_CONFIG.OPENING_DATE}`
                : "Preview list and virtual consultations open now"}
            </dd>
          </div>
          <div>
            <dt>Serving</dt>
            <dd>{LOCAL_DFW_COMMUNITIES.slice(0, 7).join(", ")}</dd>
          </div>
        </dl>
      </div>

      <section id="book" className="section-pad hairline-top">
        <div className="container form-split">
          <div>
            <h2 className="h2-serif">
              {open ? (
                <>
                  Book a visit. <span className="tone-2">Bring your measurements.</span>
                </>
              ) : (
                <>
                  Get on the list. <span className="tone-2">Or start designing now.</span>
                </>
              )}
            </h2>
            <p className="prose" style={{ marginTop: "1rem" }}>
              Tell us a little about your room. A person reads every request and replies by email or
              phone, whichever you prefer.
            </p>
            <Link href="/compose" className="btn btn-sm" style={{ marginTop: "0.5rem" }}>
              Sketch a layout in 3D first
            </Link>
          </div>
          <Suspense fallback={<p className="mono-label">Loading the form…</p>}>
            <BookVisitForm />
          </Suspense>
        </div>
      </section>

      <TestimonialsBlock />
      <SiteFooter />
    </div>
  );
}

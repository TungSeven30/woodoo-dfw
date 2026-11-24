import React, { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { SendAPlanForm } from "@/components/LeadForms";
import { SiteFooter } from "@/components/SiteFooter";
import { Media } from "@/components/Media";

export const metadata: Metadata = {
  title: "Send a Plan for Cabinet Quote",
  description:
    "Upload kitchen or bath plans (PDF, DWG, DXF, or hand sketches) for an itemized frameless cabinet list and direct quote from our Dallas–Fort Worth team.",
  alternates: { canonical: "/trade/send-a-plan" },
};

export default function SendAPlanPage() {
  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="container">
          <p className="mono-label">
            <Link href="/trade" style={{ color: "inherit" }}>
              Trade
            </Link>{" "}
            / Send a plan
          </p>
          <h1 className="display-serif" style={{ marginTop: "0.6rem" }}>
            Send a plan. <span className="tone-2">Get every piece back.</span>
          </h1>
        </div>
      </section>

      <section style={{ paddingBottom: "clamp(3.5rem, 8vw, 7rem)" }}>
        <div className="container form-split">
          <aside className="sticky-aside">
            <Media name="plan-table" shape="land" priority sizes="(max-width: 900px) 100vw, 40vw" />
            <ol className="step-list">
              <li>
                <strong>Upload what you have.</strong> PDF or CAD drawings, or a clear photo of a hand
                sketch with measurements.
              </li>
              <li>
                <strong>A person checks it.</strong> Fit, fillers, toe kicks, stacked uppers and
                3-inch molding, cabinet by cabinet.
              </li>
              <li>
                <strong>You get a full list and a quote.</strong> Every box, panel and trim piece,
                itemized.
              </li>
            </ol>
          </aside>
          <Suspense fallback={<p className="mono-label">Loading the form…</p>}>
            <SendAPlanForm />
          </Suspense>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

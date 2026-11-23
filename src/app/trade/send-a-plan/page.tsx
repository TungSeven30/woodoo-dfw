import React, { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { SendAPlanForm } from "@/components/LeadForms";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Send a Plan for Cabinet Quote",
  description:
    "Upload kitchen or bath plans (PDF, DWG, DXF, or hand sketches) for an itemized frameless cabinet list and direct quote from our Dallas–Fort Worth team.",
  alternates: { canonical: "/trade/send-a-plan" },
};

export default function SendAPlanPage() {
  return (
    <div className="page-shell">
      <section className="section-pad">
        <div className="container" style={{ maxWidth: "920px" }}>
          <p className="mono-label" style={{ marginBottom: "0.65rem" }}>
            <Link href="/trade" style={{ color: "inherit" }}>
              Trade
            </Link>{" "}
            / Plan takeoff &amp; quote
          </p>
          <h1 className="h1-serif" style={{ marginBottom: "0.9rem" }}>
            Send a plan.
          </h1>
          <p className="prose" style={{ marginBottom: "2.25rem" }}>
            Upload architectural drawings, CAD sheets, or clear photos of hand measurements. A real
            person checks cabinet fit, fillers, toe kicks, stacked upper heights, and 3-inch
            molding before returning an itemized quote.
          </p>

          <Suspense fallback={<p className="mono-label">Loading plan uploader...</p>}>
            <SendAPlanForm />
          </Suspense>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

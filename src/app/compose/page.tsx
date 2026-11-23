import React, { Suspense } from "react";
import type { Metadata } from "next";
import { ComposeStudio } from "@/components/ComposeStudio";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Compose Your Kitchen",
  description:
    "Configure frameless European cabinets in 3D across five room layouts, three door styles, five finishes, and 8, 9, or 10 ft ceilings.",
  alternates: { canonical: "/compose" },
  openGraph: {
    images: [{ url: "/og/island.png", width: 1200, height: 630, alt: "3D Kitchen Configurator concept render" }],
  },
};

export default function ComposePage() {
  return (
    <div className="page-shell theme-dark">
      <Suspense
        fallback={
          <div style={{ minHeight: "80vh", display: "grid", placeItems: "center" }}>
            <span className="mono-label">Preparing 3D studio...</span>
          </div>
        }
      >
        <ComposeStudio />
      </Suspense>
      <SiteFooter />
    </div>
  );
}

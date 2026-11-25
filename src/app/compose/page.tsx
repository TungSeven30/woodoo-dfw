import React, { Suspense } from "react";
import type { Metadata } from "next";
import { ComposeStudio } from "@/components/ComposeStudio";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Compose Your Kitchen",
  description:
    "Choose a room, a door style and a finish, and see your frameless kitchen in 3D at 8, 9 or 10 ft.",
  alternates: { canonical: "/compose" },
  openGraph: {
    images: [{ url: "/og/island.png", width: 1200, height: 630, alt: "3D Kitchen Configurator concept render" }],
  },
};

export default function ComposePage() {
  return (
    <div className="page-shell cs-page">
      <Suspense
        fallback={
          <div style={{ minHeight: "80vh", display: "grid", placeItems: "center", color: "#6f675e" }}>
            Loading the studio…
          </div>
        }
      >
        <ComposeStudio />
      </Suspense>
      <SiteFooter />
    </div>
  );
}

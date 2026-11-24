import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  COLLECTIONS,
  COLLECTION_LIST,
  CollectionSlug,
  FINISHES,
} from "@/config/site";
import { LAYOUT_ORDER, ROOM_LAYOUTS } from "@/config/layouts";
import { buildProductJsonLd } from "@/lib/seo";
import { CollectionHero3D } from "@/components/CollectionHero3D";
import { SiteFooter } from "@/components/SiteFooter";

export function generateStaticParams() {
  return COLLECTION_LIST.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!(slug in COLLECTIONS)) return { title: "Collection" };
  const col = COLLECTIONS[slug as CollectionSlug];
  return {
    title: `${col.name} Cabinets`,
    description: `${col.name} (${col.styleTag}) European-style frameless RTA cabinets in Dallas–Fort Worth. Available in ${col.finishes.map((f) => FINISHES[f].name).join(", ")}.`,
    alternates: { canonical: `/collections/${col.slug}` },
    openGraph: {
      images: [{ url: `/og/${col.slug}.png`, width: 1200, height: 630, alt: `${col.name} concept render` }],
    },
  };
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!(slug in COLLECTIONS)) notFound();
  const col = COLLECTIONS[slug as CollectionSlug];
  const productLd = buildProductJsonLd(col.slug);

  return (
    <div className="page-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
      />

      <section className="section-pad hairline-bottom">
        <div className="container">
          <p className="mono-label" style={{ marginBottom: "0.6rem" }}>
            <Link href="/collections" style={{ color: "inherit" }}>
              Collections
            </Link>{" "}
            / {col.styleTag}
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: "1.25rem",
              marginBottom: "2rem",
            }}
          >
            <div>
              <h1 className="h1-serif" style={{ marginBottom: "0.75rem" }}>
                {col.name}
              </h1>
              <p className="prose" style={{ margin: 0 }}>
                {col.summary} {col.profileNote}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
              <Link href="/trade/send-a-plan" className="btn btn-primary">
                Send a plan
              </Link>
              <Link href="/showroom" className="btn">
                Book a visit
              </Link>
            </div>
          </div>

          <CollectionHero3D slug={col.slug} />
        </div>
      </section>

      {/* Confirmed Construction Details */}
      <section className="section-pad hairline-bottom">
        <div className="container">
          <p className="mono-label" style={{ marginBottom: "0.55rem" }}>
            Confirmed specifications
          </p>
          <h2 className="h2-serif" style={{ marginBottom: "1.75rem" }}>
            Frameless construction across every box.
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: "1.15rem",
            }}
          >
            <div className="arch-card">
              <span className="mono-label">Reveal</span>
              <h3 className="h3-sans" style={{ margin: "0.35rem 0 0.4rem" }}>2 mm full overlay</h3>
              <p style={{ margin: 0, color: "var(--fg-muted)", fontSize: "0.92rem" }}>
                Doors sit full-overlay across the frameless box with a uniform 2 mm gap.
              </p>
            </div>
            <div className="arch-card">
              <span className="mono-label">Interior access</span>
              <h3 className="h3-sans" style={{ margin: "0.35rem 0 0.4rem" }}>No face frame or center stile</h3>
              <p style={{ margin: 0, color: "var(--fg-muted)", fontSize: "0.92rem" }}>
                Unobstructed interior width paired with factory-finished exterior sides.
              </p>
            </div>
            <div className="arch-card">
              <span className="mono-label">Vertical fit</span>
              <h3 className="h3-sans" style={{ margin: "0.35rem 0 0.4rem" }}>8, 9, and 10 ft ceilings</h3>
              <p style={{ margin: 0, color: "var(--fg-muted)", fontSize: "0.92rem" }}>
                Modular wall runs and stacked uppers topped with 3-inch molding.
              </p>
            </div>
            <div className="arch-card">
              <span className="mono-label">Supply format</span>
              <h3 className="h3-sans" style={{ margin: "0.35rem 0 0.4rem" }}>Flat-pack RTA or assembled</h3>
              <p style={{ margin: 0, color: "var(--fg-muted)", fontSize: "0.92rem" }}>
                Manufactured in Malaysia. Customers arrange their own installation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Jump straight into room layouts */}
      <section className="section-pad">
        <div className="container">
          <p className="mono-label" style={{ marginBottom: "0.55rem" }}>
            Test in room layouts
          </p>
          <h2 className="h2-serif" style={{ marginBottom: "1.5rem" }}>
            Open {col.name} in the 3D studio.
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1rem",
            }}
          >
            {LAYOUT_ORDER.map((lid) => {
              const room = ROOM_LAYOUTS[lid];
              return (
                <Link
                  key={lid}
                  href={`/compose?layout=${lid}&collection=${col.slug}&finish=${col.defaultFinish}&ceiling=${room.defaultCeiling}`}
                  className="arch-card"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <span className="mono-label" style={{ color: "var(--accent)" }}>
                    {room.footprintLabel}
                  </span>
                  <h3 className="h3-sans" style={{ margin: "0.35rem 0 0.4rem" }}>
                    {room.name}
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--fg-muted)" }}>
                    Launch {col.name} in {FINISHES[col.defaultFinish].name} →
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

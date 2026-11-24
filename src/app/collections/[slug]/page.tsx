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
import { Media } from "@/components/Media";
import { COLLECTION_IMAGE, type ImageKey } from "@/config/images";

const SECOND_IMAGE: Record<CollectionSlug, ImageKey | null> = {
  "traditional-shaker": "kitchen-white-shaker",
  "slim-shaker": null,
  flat: "kitchen-walnut-flat",
};
import { buildProductJsonLd } from "@/lib/seo";
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

  const second = SECOND_IMAGE[col.slug];

  return (
    <div className="page-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
      />

      <section className="page-hero">
        <div className="container">
          <p className="mono-label">
            <Link href="/collections" style={{ color: "inherit" }}>
              Collections
            </Link>{" "}
            / {col.styleTag}
          </p>
          <h1 className="display-serif" style={{ marginTop: "0.6rem" }}>
            {col.name}
          </h1>
          <p className="lede">{col.summary}</p>
          <ul className="swatch-row" aria-label={`${col.name} finishes`}>
            {col.finishes.map((fSlug) => (
              <li key={fSlug}>
                <span
                  className="swatch-dot"
                  style={{ backgroundImage: `url(${FINISHES[fSlug].swatchImage})` }}
                  aria-hidden="true"
                />
                {FINISHES[fSlug].name}
              </li>
            ))}
          </ul>
          <div className="btn-row">
            <Link href="/showroom" className="btn btn-primary">
              Book a visit
            </Link>
            <Link href="/trade/send-a-plan" className="btn">
              Send a plan
            </Link>
          </div>
        </div>
      </section>

      <div className="container">
        <Media name={COLLECTION_IMAGE[col.slug]} shape="wide" priority sizes="100vw" />
      </div>

      <section className="section-pad">
        <div className="container">
          <h2 className="h2-serif" style={{ maxWidth: "20ch", marginBottom: "2rem" }}>
            Look closer. <span className="tone-2">The details are the point.</span>
          </h2>
          <div className="detail-pair">
            <div>
              <Media name="detail-reveal" shape="port" sizes="(max-width: 900px) 100vw, 45vw" />
              <h3 className="h3-sans">An even 2 mm gap</h3>
              <p>Doors sit full overlay on the box, so the gap between them is the same thin line everywhere.</p>
            </div>
            <div>
              <Media name="detail-interior" shape="port" sizes="(max-width: 900px) 100vw, 45vw" />
              <h3 className="h3-sans">Nothing in the way</h3>
              <p>No face frame and no center stile. Open both doors and the whole shelf is yours.</p>
            </div>
          </div>
        </div>
      </section>

      {second ? (
        <div className="container">
          <Media name={second} shape="wide" sizes="100vw" />
        </div>
      ) : null}

      <section className="section-pad">
        <div className="container">
          <div className="spec-list">
            <article className="spec-list-item">
              <p className="spec-code">Reveal</p>
              <h3 className="h3-sans">2 mm, full overlay</h3>
              <p>Doors cover the frameless box edge to edge with a uniform 2 mm gap.</p>
            </article>
            <article className="spec-list-item">
              <p className="spec-code">Interior</p>
              <h3 className="h3-sans">No face frame, no center stile</h3>
              <p>Full-width access to every shelf, with factory-finished sides.</p>
            </article>
            <article className="spec-list-item">
              <p className="spec-code">Height</p>
              <h3 className="h3-sans">8, 9, and 10 ft ceilings</h3>
              <p>Stacked uppers finished with 3-inch molding for a built-in look.</p>
            </article>
            <article className="spec-list-item">
              <p className="spec-code">Format</p>
              <h3 className="h3-sans">Flat-pack or assembled</h3>
              <p>Made in Malaysia. You choose your installer and your schedule.</p>
            </article>
          </div>
          <div className="btn-row" style={{ marginTop: "2.5rem" }}>
            <Link
              href={`/compose?collection=${col.slug}&finish=${col.defaultFinish}&layout=l-shape&ceiling=9`}
              className="btn btn-primary"
            >
              Plan a kitchen with {col.name}
            </Link>
            <Link href="/collections" className="btn">
              See all collections
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { COLLECTION_LIST, FINISHES, FINISH_ORDER } from "@/config/site";
import { Media } from "@/components/Media";
import { COLLECTION_IMAGE } from "@/config/images";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Cabinet Collections & Finishes",
  description:
    "Explore Traditional Shaker, Slim Shaker, and Flat frameless European RTA cabinets across five curated finishes for Dallas–Fort Worth homes.",
  alternates: { canonical: "/collections" },
  openGraph: {
    images: [{ url: "/og/traditional-shaker.png", width: 1200, height: 630, alt: "Frameless cabinet collections concept render" }],
  },
};

export default function CollectionsPage() {
  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="container">
          <p className="mono-label">Three door styles · Five finishes</p>
          <h1 className="display-serif" style={{ maxWidth: "14ch", marginTop: "0.6rem" }}>
            Fewer choices. <span className="tone-2">Made well.</span>
          </h1>
          <p className="lede">
            Every door sits full overlay on a frameless box, with a 2 mm gap, finished sides, and
            proportions built for 8, 9, and 10 ft ceilings.
          </p>
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
        {COLLECTION_LIST.map((col, idx) => (
          <article
            key={col.slug}
            className={`feature hairline-top${idx % 2 === 1 ? " is-flip" : ""}`}
            aria-labelledby={`col-${col.slug}`}
          >
            <Media name={COLLECTION_IMAGE[col.slug]} shape="land" priority={idx === 0} />
            <div className="feature-body">
              <p className="mono-label">{col.styleTag}</p>
              <h2 id={`col-${col.slug}`} className="h2-serif">
                {col.name}
              </h2>
              <p>{col.summary}</p>
              <ul className="swatch-row" aria-label={`${col.name} finishes`}>
                {col.finishes.map((fSlug) => {
                  const f = FINISHES[fSlug];
                  return (
                    <li key={fSlug}>
                      <span
                        className="swatch-dot"
                        style={{ backgroundImage: `url(${f.swatchImage})` }}
                        aria-hidden="true"
                      />
                      {f.name}
                    </li>
                  );
                })}
              </ul>
              <div className="btn-row">
                <Link href={`/collections/${col.slug}`} className="btn btn-primary">
                  View {col.name}
                </Link>
                <Link
                  href={`/compose?collection=${col.slug}&finish=${col.defaultFinish}&layout=l-shape&ceiling=9`}
                  className="btn"
                >
                  Try it in 3D
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className="section-pad hairline-top">
        <div className="container">
          <h2 className="h2-serif" style={{ maxWidth: "18ch", marginBottom: "1.75rem" }}>
            Five finishes. <span className="tone-2">See them in person before you order.</span>
          </h2>
          <ul className="finish-strip">
            {FINISH_ORDER.map((fSlug) => {
              const f = FINISHES[fSlug];
              return (
                <li key={fSlug}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.swatchImage} alt={`${f.name} finish sample`} loading="lazy" />
                  <span className="finish-name">{f.name}</span>
                  <span className="finish-cols">
                    {COLLECTION_LIST.filter((c) => c.finishes.includes(fSlug))
                      .map((c) => c.name)
                      .join(" · ")}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mono-label" style={{ marginTop: "1.25rem" }}>
            Screens shift color. Physical finish samples are the reference.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

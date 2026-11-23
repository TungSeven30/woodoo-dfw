import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { COLLECTION_LIST, FINISHES, FINISH_ORDER } from "@/config/site";
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
      <section className="section-pad hairline-bottom">
        <div className="container">
          <p className="mono-label" style={{ marginBottom: "0.7rem" }}>
            Three door styles · Five finishes
          </p>
          <h1 className="h1-serif" style={{ maxWidth: "16ch", marginBottom: "1.1rem" }}>
            Fewer choices, made well.
          </h1>
          <p className="prose" style={{ marginBottom: "1.75rem" }}>
            Every door mounts full-overlay on a frameless box with a 2 mm reveal, factory-finished
            sides, and proportions built for 8, 9, and 10 ft Texas ceilings.
          </p>
          <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
            <Link href="/compose" className="btn btn-primary">
              Compose your kitchen
            </Link>
            <Link href="/trade/send-a-plan" className="btn">
              Send a plan
            </Link>
            <Link href="/showroom" className="btn">
              Book a visit
            </Link>
          </div>
        </div>
      </section>

      {/* Three Collections */}
      <section className="section-pad hairline-bottom">
        <div className="container" style={{ display: "grid", gap: "2rem" }}>
          {COLLECTION_LIST.map((col, idx) => (
            <article
              key={col.slug}
              className="arch-card"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
                gap: "2rem",
                alignItems: "center",
              }}
            >
              <div>
                <p className="mono-label" style={{ color: "var(--accent)", marginBottom: "0.45rem" }}>
                  0{idx + 1} · {col.styleTag}
                </p>
                <h2 className="h2-serif" style={{ marginBottom: "0.75rem" }}>
                  {col.name}
                </h2>
                <p className="prose" style={{ marginBottom: "1.25rem" }}>
                  {col.summary} {col.profileNote}
                </p>

                <p className="mono-label" style={{ marginBottom: "0.55rem" }}>
                  Available finishes
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginBottom: "1.4rem" }}>
                  {col.finishes.map((fSlug) => {
                    const f = FINISHES[fSlug];
                    return (
                      <span
                        key={fSlug}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.45rem",
                          padding: "0.35rem 0.7rem",
                          border: "1px solid var(--border-strong)",
                          fontSize: "0.86rem",
                        }}
                      >
                        <span
                          className="swatch-dot"
                          style={{ width: 16, height: 16, backgroundImage: `url(${f.swatchImage})` }}
                          aria-hidden="true"
                        />
                        {f.name}
                      </span>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
                  <Link href={`/collections/${col.slug}`} className="btn btn-primary btn-sm">
                    Inspect in 3D
                  </Link>
                  <Link
                    href={`/compose?collection=${col.slug}&finish=${col.defaultFinish}&layout=l-shape&ceiling=9`}
                    className="btn btn-sm"
                  >
                    Try in room studio
                  </Link>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "0.65rem",
                }}
              >
                {col.finishes.map((fSlug) => {
                  const f = FINISHES[fSlug];
                  return (
                    <div
                      key={fSlug}
                      style={{
                        position: "relative",
                        aspectRatio: "4 / 3",
                        border: "1px solid var(--border)",
                        overflow: "hidden",
                        background: f.swatchHex,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={f.swatchImage}
                        alt={`${f.name} wood grain swatch`}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                      <span
                        className="mono-label"
                        style={{
                          position: "absolute",
                          left: "0.55rem",
                          bottom: "0.5rem",
                          background: "rgba(19, 17, 16, 0.8)",
                          color: "#f1eee7",
                          padding: "0.2rem 0.45rem",
                          fontSize: "0.66rem",
                        }}
                      >
                        {f.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Complete Five-Finish Reference Band */}
      <section className="section-pad">
        <div className="container">
          <p className="mono-label" style={{ marginBottom: "0.55rem" }}>
            Finish palette
          </p>
          <h2 className="h2-serif" style={{ marginBottom: "1.75rem" }}>
            Five finishes. Selected to age quietly.
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "1rem",
            }}
          >
            {FINISH_ORDER.map((fSlug) => {
              const f = FINISHES[fSlug];
              const usedIn = COLLECTION_LIST.filter((c) => c.finishes.includes(fSlug))
                .map((c) => c.name)
                .join(" · ");
              return (
                <div key={fSlug} className="arch-card" style={{ padding: "1rem" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.swatchImage}
                    alt={`${f.name} finish reference`}
                    style={{
                      width: "100%",
                      aspectRatio: "1 / 1",
                      objectFit: "cover",
                      display: "block",
                      marginBottom: "0.85rem",
                      border: "1px solid var(--border)",
                    }}
                  />
                  <h3 className="h3-sans" style={{ fontSize: "1.15rem", marginBottom: "0.25rem" }}>
                    {f.name}
                  </h3>
                  <p style={{ margin: "0 0 0.5rem", fontSize: "0.88rem", color: "var(--fg-muted)" }}>
                    {f.shortNote}
                  </p>
                  <span className="mono-label" style={{ fontSize: "0.68rem" }}>
                    {usedIn}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mono-label" style={{ marginTop: "1.25rem" }}>
            Note: Swatches shown are digital wood references; inspect physical finish boards in person before ordering.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

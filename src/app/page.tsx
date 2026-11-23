import React from "react";
import Link from "next/link";
import { FILM_SCENES, LOCAL_DFW_COMMUNITIES } from "@/config/content";
import { COLLECTION_LIST, FINISHES, SITE_CONFIG, isShowroomOpen } from "@/config/site";
import { FilmShell } from "@/components/FilmShell";
import { SiteFooter } from "@/components/SiteFooter";

export default function HomePage() {
  const open = isShowroomOpen();

  return (
    <>
      <FilmShell />

      {/* Semantic Ordered Narrative for Screen Readers & Search Engine Crawlers */}
      <section className="sr-only" aria-label="Full cabinetry story">
        <p>{SITE_CONFIG.BRAND_NAME} — It arrives flat. It leaves whole.</p>
        <ol>
          {FILM_SCENES.map((scene) => (
            <li key={scene.id}>
              <p>{scene.headline}</p>
              <p>{scene.subline}</p>
              <p>{scene.srDescription}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Architectural Summary & Quick Directory below Scene 8 for crawlers and visitors scrolling past the Film */}
      <section id="film-end" tabIndex={-1} className="theme-dark section-pad hairline-top" aria-label="DFW overview and quick paths">
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "2.25rem",
              alignItems: "start",
            }}
          >
            <div>
              <p className="mono-label" style={{ color: "var(--amber-on-dark)", marginBottom: "0.6rem" }}>
                Dallas–Fort Worth Branch
              </p>
              <h2 className="h2-serif" style={{ marginBottom: "0.9rem" }}>
                Three door styles. Five finishes. Built for 8, 9, and 10 ft ceilings.
              </h2>
              <p style={{ color: "#b6aea3", maxWidth: "46ch", margin: "0 0 1.4rem" }}>
                European-style frameless RTA kitchen and bath cabinets manufactured in Malaysia,
                engineered with a 2 mm full-overlay reveal and factory-finished sides. Serving
                independent builders, remodelers, designers, and homeowners across{" "}
                {LOCAL_DFW_COMMUNITIES.slice(0, 7).join(", ")}.
              </p>
              <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
                <Link href="/trade/send-a-plan" className="btn btn-primary">
                  Send a plan
                </Link>
                <Link href="/showroom" className="btn">
                  {open ? "Book a showroom visit" : "Join the preview list"}
                </Link>
                <Link href="/compose" className="btn">
                  Compose your kitchen
                </Link>
              </div>
            </div>

            <div style={{ display: "grid", gap: "0.9rem" }}>
              {COLLECTION_LIST.map((col) => (
                <Link
                  key={col.slug}
                  href={`/collections/${col.slug}`}
                  className="arch-card"
                  style={{
                    textDecoration: "none",
                    color: "var(--paper)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <span className="mono-label" style={{ color: "var(--amber-on-dark)" }}>
                      {col.styleTag}
                    </span>
                    <h3 className="h3-sans" style={{ margin: "0.2rem 0 0.25rem" }}>
                      {col.name}
                    </h3>
                    <p style={{ margin: 0, fontSize: "0.86rem", color: "#b6aea3" }}>
                      {col.finishes.map((f) => FINISHES[f].name).join(" · ")}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.3rem" }} aria-hidden="true">
                    {col.finishes.map((f) => (
                      <span
                        key={f}
                        className="swatch-dot"
                        style={{ backgroundImage: `url(${FINISHES[f].swatchImage})` }}
                      />
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}

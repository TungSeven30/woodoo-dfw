import React from "react";
import Link from "next/link";
import { FILM_SCENES, LOCAL_DFW_COMMUNITIES } from "@/config/content";
import { COLLECTION_LIST, FINISHES, SITE_CONFIG, isShowroomOpen } from "@/config/site";
import { Media } from "@/components/Media";
import { COLLECTION_IMAGE } from "@/config/images";
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

      {/* After the film: the product, in pictures */}
      <section id="film-end" tabIndex={-1} className="section-pad" aria-label="Collections and next steps">
        <div className="container">
          <p className="mono-label">Dallas–Fort Worth</p>
          <h2 className="display-serif" style={{ maxWidth: "15ch", margin: "0.6rem 0 1.1rem" }}>
            Three door styles. <span className="tone-2">Five finishes.</span>
          </h2>
          <p className="prose" style={{ marginBottom: "2.5rem" }}>
            European-style frameless kitchen and bath cabinets, made in Malaysia, with a 2 mm
            full-overlay gap and finished sides. For builders, remodelers, designers and homeowners
            across {LOCAL_DFW_COMMUNITIES.slice(0, 6).join(", ")}.
          </p>
          <div className="photo-grid">
            {COLLECTION_LIST.map((col) => (
              <Link key={col.slug} href={`/collections/${col.slug}`}>
                <Media name={COLLECTION_IMAGE[col.slug]} shape="port" sizes="(max-width: 900px) 100vw, 33vw" />
                <h3 className="h3-sans">{col.name}</h3>
                <p>{col.finishes.map((f) => FINISHES[f].name).join(" · ")}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="container">
        <div className="feature hairline-top">
          <Media name="detail-reveal" shape="land" sizes="(max-width: 900px) 100vw, 55vw" />
          <div className="feature-body">
            <h2 className="h2-serif">
              Two millimeters. <span className="tone-2">That&apos;s the whole gap.</span>
            </h2>
            <p>
              No face frame, no center stile, no thick bands of wood between the doors. Just one thin,
              even line, and a cabinet you can use edge to edge.
            </p>
            <div className="btn-row">
              <Link href="/precision" className="btn">
                How it&apos;s built
              </Link>
            </div>
          </div>
        </div>
      </div>

      <section className="section-pad hairline-top">
        <div className="container">
          <div className="detail-pair">
            <Link href="/trade" className="path-card">
              <Media name="flatpack" shape="land" sizes="(max-width: 900px) 100vw, 45vw" />
              <p className="mono-label">Builders · Remodelers · Designers</p>
              <h3 className="h2-serif">For the trade.</h3>
              <p>Send us the plan. A real person checks every cabinet, filler and trim piece.</p>
              <span className="btn btn-primary">Send a plan</span>
            </Link>
            <Link href="/showroom" className="path-card">
              <Media name="showroom" shape="land" sizes="(max-width: 900px) 100vw, 45vw" />
              <p className="mono-label">Homeowners</p>
              <h3 className="h2-serif">For your home.</h3>
              <p>See and touch the finishes, and work with a designer from sketch to delivery.</p>
              <span className="btn btn-primary">{open ? "Book a visit" : "Join the preview list"}</span>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}

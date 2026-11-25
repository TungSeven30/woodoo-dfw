import React from "react";
import Link from "next/link";
import { FINISHES, isShowroomOpen } from "@/config/site";
import { FINISH_PHOTOS, PHOTOS } from "@/config/photos";
import { ProductPhoto } from "@/components/ProductPhoto";
import { SiteFooter } from "@/components/SiteFooter";
import { DoorHero } from "@/components/DoorHero";
import { DrawingMark } from "@/components/DrawingMark";

export default function HomePage() {
  const open = isShowroomOpen();
  const visit = open ? "Book a visit" : "Join the preview list";

  return (
    <>
      <section className="pp-hero dw-hero" aria-labelledby="pp-hero-title">
        <div className="dw-hero-copy">
          <h1 id="pp-hero-title" className="pp-display">Frameless.</h1>
          <div className="dw-hero-side">
            <p className="pp-lede">European kitchen cabinetry, at home in Dallas–Fort&nbsp;Worth.</p>
            <div className="pp-actions">
              <Link href="/showroom" className="btn btn-primary">
                {visit}
              </Link>
              <Link href="/collections" className="pp-link">
                See the collections
              </Link>
            </div>
          </div>
        </div>
        <DoorHero photo={PHOTOS.heroKitchen} tall={PHOTOS.heroKitchenTall} />
        <p className="dw-caption">
          <span className="dw-dim" aria-hidden="true" />
          <span>
            <strong>2 mm.</strong> Every gap on this page is the gap between our doors.
          </span>
        </p>
      </section>

      <section className="pp-section" aria-labelledby="pp-cover">
        <div className="dw-copy pp-reveal">
          <DrawingMark n="01">No face frame</DrawingMark>
          <h2 id="pp-cover" className="pp-h2">
            Doors that cover the whole box.
          </h2>
          <p className="pp-body">
            There is no face frame around the opening. Doors and drawer fronts sit over the cabinet
            edge to edge, so the front reads as one surface and the inside opens to its full width.
          </p>
        </div>
        <div className="pp-bleed-wrap">
          <ProductPhoto photo={PHOTOS.islandOpenPlan} tall={PHOTOS.islandOpenPlanTall} className="pp-bleed pp-zoom" />
        </div>
      </section>

      <section className="pp-section pp-split" aria-labelledby="pp-gap">
        <div className="pp-split-photo">
          <ProductPhoto
            photo={PHOTOS.drawersGap}
            sizes="(max-width: 900px) 100vw, 50vw"
            className="pp-fill pp-zoom"
          />
        </div>
        <div className="pp-split-copy pp-reveal">
          <DrawingMark n="02">The reveal</DrawingMark>
          <p id="pp-gap" className="pp-number dw-dimensioned">
            2&thinsp;mm
          </p>
          <p className="pp-body">
            Between every door and drawer front. One even line, top to bottom, across the whole
            kitchen. Even a Texas-sized one.
          </p>
          <Link href="/precision" className="pp-link">
            How it’s built
          </Link>
        </div>
      </section>

      <section className="pp-section" aria-labelledby="pp-finishes">
        <div className="dw-copy pp-reveal">
          <DrawingMark n="03">Finishes</DrawingMark>
          <h2 id="pp-finishes" className="pp-h2">
            Five finishes. <span className="pp-quiet">Three door styles.</span>
          </h2>
          <p className="pp-body">Shown in real kitchens, in real daylight.</p>
        </div>
        <ul className="pp-finishes" role="list">
          {FINISH_PHOTOS.map((f) => (
            <li key={f.finish} className="pp-finish">
              <Link href="/collections">
                <div className="pp-finish-photo">
                  <ProductPhoto
                    photo={f}
                    sizes="(max-width: 760px) 82vw, (max-width: 1100px) 40vw, 20vw"
                    className="pp-fill"
                  />
                </div>
                <p className="pp-finish-name">{FINISHES[f.finish].name}</p>
                <p className="pp-finish-door">{f.door}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="pp-section" aria-labelledby="pp-bath">
        <div className="dw-copy pp-reveal">
          <DrawingMark n="04">Bath</DrawingMark>
          <h2 id="pp-bath" className="pp-h2">
            The bath, too.
          </h2>
          <p className="pp-body">Vanities and linen towers in the same doors and finishes as the kitchen.</p>
        </div>
        <div className="pp-bleed-wrap">
          <ProductPhoto photo={PHOTOS.bath} className="pp-bleed pp-zoom" />
        </div>
      </section>

      <section className="pp-section pp-studio" aria-labelledby="pp-studio">
        <div className="dw-copy pp-reveal">
          <DrawingMark n="05">Studio</DrawingMark>
          <h2 id="pp-studio" className="pp-h2">
            Try it on your room.
          </h2>
          <p className="pp-body">
            Pick a layout, a door and a finish, and see the whole kitchen in 3D at 8, 9 or 10&nbsp;ft.
          </p>
          <div className="pp-actions dw-actions">
            <Link href="/compose" className="btn btn-primary">
              Open the studio
            </Link>
          </div>
        </div>
      </section>

      <section id="film-end" tabIndex={-1} className="pp-section pp-paths" aria-label="Next steps">
        <Link href="/trade/send-a-plan" className="pp-path">
          <div className="pp-path-photo">
            <ProductPhoto photo={PHOTOS.trade} sizes="(max-width: 900px) 100vw, 50vw" className="pp-fill" />
          </div>
          <h2 className="pp-h3">For the trade.</h2>
          <p className="pp-body">Send a plan. A person checks every cabinet, filler and trim piece.</p>
          <span className="pp-link">Send a plan</span>
        </Link>
        <Link href="/showroom" className="pp-path">
          <div className="pp-path-photo">
            <ProductPhoto photo={PHOTOS.home} sizes="(max-width: 900px) 100vw, 50vw" className="pp-fill" />
          </div>
          <h2 className="pp-h3">For your home.</h2>
          <p className="pp-body">See the doors in person and plan your kitchen with a designer.</p>
          <span className="pp-link">{visit}</span>
        </Link>
      </section>

      <section className="dw-close" aria-label="Where it comes from">
        <p className="dw-close-line">
          Made in Malaysia. <span className="pp-quiet">At home in Texas.</span>
        </p>
      </section>

      <SiteFooter />
    </>
  );
}

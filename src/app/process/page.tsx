import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PROCESS_STEPS } from "@/config/content";
import { SiteFooter } from "@/components/SiteFooter";
import { Media } from "@/components/Media";
import type { ImageKey } from "@/config/images";

export const metadata: Metadata = {
  title: "Our Seven-Step Process",
  description:
    "From product inspiration and design consultation through production, delivery, pickup, and post-installation support. Your installer, your schedule.",
  alternates: { canonical: "/process" },
};

const PHASES: { label: string; title: string; tone: string; image: ImageKey; steps: string[] }[] = [
  {
    label: "Choose",
    title: "See it, touch it,",
    tone: "pick a direction.",
    image: "consultation",
    steps: ["01", "02"],
  },
  {
    label: "Plan",
    title: "Every piece on paper",
    tone: "before anything ships.",
    image: "plan-table",
    steps: ["03", "04", "05"],
  },
  {
    label: "Deliver",
    title: "Checked, staged,",
    tone: "and handed over complete.",
    image: "loading-dock",
    steps: ["06", "07"],
  },
];

export default function ProcessPage() {
  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="container">
          <p className="mono-label">Start to finish</p>
          <h1 className="display-serif" style={{ maxWidth: "15ch", marginTop: "0.6rem" }}>
            Seven steps. <span className="tone-2">One person the whole way.</span>
          </h1>
          <p className="lede">
            Clear finish choices, a checked parts list, and plain answers on price and stock. You
            arrange your own installer, on your own schedule.
          </p>
          <div className="btn-row">
            <Link href="/trade/send-a-plan" className="btn btn-primary">
              Send a plan
            </Link>
            <Link href="/showroom" className="btn">
              Book a visit
            </Link>
          </div>
        </div>
      </section>

      <div className="container">
        {PHASES.map((phase, idx) => (
          <section
            key={phase.label}
            className={`feature hairline-top${idx % 2 === 1 ? " is-flip" : ""}`}
            aria-labelledby={`phase-${phase.label}`}
          >
            <Media name={phase.image} shape="land" sizes="(max-width: 900px) 100vw, 55vw" />
            <div className="feature-body">
              <p className="mono-label">{phase.label}</p>
              <h2 id={`phase-${phase.label}`} className="h2-serif">
                {phase.title} <span className="tone-2">{phase.tone}</span>
              </h2>
              <ol className="process-steps">
                {PROCESS_STEPS.filter((s) => phase.steps.includes(s.number)).map((step) => (
                  <li key={step.number}>
                    <span className="process-num" aria-hidden="true">
                      {step.number}
                    </span>
                    <h3 className="h3-sans">{step.title}</h3>
                    <p>{step.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        ))}
      </div>

      <SiteFooter />
    </div>
  );
}

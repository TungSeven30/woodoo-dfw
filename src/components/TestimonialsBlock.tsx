import React from "react";
import { SITE_CONFIG } from "@/config/site";
import { PLACEHOLDER_TESTIMONIALS } from "@/config/content";

/**
 * Placeholder testimonial component built per Ground Rule 4.
 * Controlled via SITE_CONFIG.featureFlags.testimonials and clearly marked until written permission
 * is secured for Chicago quotes or verified DFW project feedback arrives.
 */
export function TestimonialsBlock() {
  if (!SITE_CONFIG.featureFlags.testimonials) return null;

  return (
    <section className="section-pad hairline-top" aria-label="Client feedback placeholders">
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.75rem", marginBottom: "2rem" }}>
          <div>
            <p className="mono-label" style={{ marginBottom: "0.45rem" }}>
              Client feedback · Placeholder slot
            </p>
            <h2 className="h2-serif">From builders and homeowners.</h2>
          </div>
          <span className="mono-label" style={{ color: "var(--accent)" }}>
            Awaiting written permission — see CONTENT-NEEDED.md
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {PLACEHOLDER_TESTIMONIALS.map((item) => (
            <figure
              key={item.id}
              className="arch-card"
              style={{ margin: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "1rem" }}
            >
              <blockquote style={{ margin: 0, color: "var(--fg-muted)", fontSize: "0.95rem" }}>
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <figcaption>
                <span className="mono-label" style={{ display: "block", color: "var(--fg)" }}>
                  {item.author}
                </span>
                <span className="mono-label" style={{ fontSize: "0.68rem" }}>
                  {item.role}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

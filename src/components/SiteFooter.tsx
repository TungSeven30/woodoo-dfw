import React from "react";
import Link from "next/link";
import {
  SITE_CONFIG,
  getDisplayAddress,
  isPlaceholderValue,
} from "@/config/site";
import { LOCAL_DFW_COMMUNITIES } from "@/config/content";

export function SiteFooter() {
  const addressText = getDisplayAddress();
  const hasPhone = !isPlaceholderValue(SITE_CONFIG.PHONE);
  const hasEmail = !isPlaceholderValue(SITE_CONFIG.EMAIL);

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="brand-mark" style={{ marginBottom: "0.9rem" }}>
              <span className="brand-mark-rule" aria-hidden="true" />
              <span>{SITE_CONFIG.BRAND_NAME}</span>
            </div>
            <p style={{ margin: "0 0 0.85rem", color: "#b6aea3", maxWidth: "36ch", fontSize: "0.95rem" }}>
              European-style frameless RTA kitchen and bath cabinets for Dallas–Fort Worth
              builders, remodelers, designers, and homeowners. Manufactured in Malaysia.
            </p>
            <p className="mono-label" style={{ margin: "0 0 0.35rem" }}>
              {addressText}
            </p>
            {hasPhone && (
              <p style={{ margin: "0.2rem 0", fontSize: "0.9rem" }}>
                <a href={`tel:${SITE_CONFIG.PHONE}`} style={{ color: "var(--paper)" }}>
                  {SITE_CONFIG.PHONE}
                </a>
              </p>
            )}
            {hasEmail && (
              <p style={{ margin: "0.2rem 0", fontSize: "0.9rem" }}>
                <a href={`mailto:${SITE_CONFIG.EMAIL}`} style={{ color: "var(--paper)" }}>
                  {SITE_CONFIG.EMAIL}
                </a>
              </p>
            )}
            <p style={{ margin: "0.9rem 0 0", color: "#9e968b", fontSize: "0.82rem" }}>
              Serving {LOCAL_DFW_COMMUNITIES.slice(0, 7).join(" · ")} and surrounding North Texas.
            </p>
          </div>

          <div>
            <p className="mono-label">Cabinetry</p>
            <ul className="footer-list">
              <li><Link href="/collections">All collections</Link></li>
              <li><Link href="/collections/traditional-shaker">Traditional Shaker</Link></li>
              <li><Link href="/collections/slim-shaker">Slim Shaker</Link></li>
              <li><Link href="/collections/flat">Flat</Link></li>
              <li><Link href="/compose">Compose your kitchen</Link></li>
              <li><Link href="/precision">Frameless precision</Link></li>
            </ul>
          </div>

          <div>
            <p className="mono-label">For Trade &amp; Home</p>
            <ul className="footer-list">
              <li><Link href="/trade/send-a-plan">Send a plan</Link></li>
              <li><Link href="/trade">Trade program</Link></li>
              <li><Link href="/showroom">Book a visit / Preview list</Link></li>
              <li><Link href="/process">Seven-step process</Link></li>
              <li><Link href="/faq">FAQ</Link></li>
              <li><Link href="/about">About the DFW branch</Link></li>
            </ul>
          </div>

          <div>
            <p className="mono-label">Direct</p>
            <ul className="footer-list">
              <li><Link href="/contact">Contact</Link></li>
              <li><Link href="/legal/privacy">Privacy policy</Link></li>
              <li><Link href="/legal/terms">Terms of use</Link></li>
            </ul>
            <p style={{ margin: "1.25rem 0 0", color: "#9e968b", fontSize: "0.8rem", lineHeight: 1.5 }}>
              Customers arrange their own installation. Your installer, your schedule. 3D room
              visuals are labeled as concept renders.
            </p>
          </div>
        </div>

        <div
          className="hairline-top"
          style={{
            marginTop: "2.75rem",
            paddingTop: "1.25rem",
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
            fontSize: "0.82rem",
            color: "#9e968b",
          }}
        >
          <span>
            &copy; {new Date().getFullYear()} {SITE_CONFIG.BRAND_NAME}. Dallas–Fort Worth, TX.
          </span>
          <span className="mono-label" style={{ fontSize: "0.68rem" }}>
            It arrives flat. It leaves whole.
          </span>
        </div>
      </div>
    </footer>
  );
}

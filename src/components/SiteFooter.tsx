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
            <p className="footer-blurb">
              Frameless kitchen and bath cabinetry for Dallas–Fort Worth homes, builders and
              designers. Made in Malaysia.
            </p>
            <p className="footer-small" style={{ margin: "0 0 0.35rem" }}>
              {addressText}
            </p>
            {hasPhone && (
              <p style={{ margin: "0.2rem 0", fontSize: "0.9rem" }}>
                <a href={`tel:${SITE_CONFIG.PHONE}`} className="footer-a">
                  {SITE_CONFIG.PHONE}
                </a>
              </p>
            )}
            {hasEmail && (
              <p style={{ margin: "0.2rem 0", fontSize: "0.9rem" }}>
                <a href={`mailto:${SITE_CONFIG.EMAIL}`} className="footer-a">
                  {SITE_CONFIG.EMAIL}
                </a>
              </p>
            )}
            <p className="footer-small" style={{ margin: "0.9rem 0 0" }}>
              Serving {LOCAL_DFW_COMMUNITIES.slice(0, 7).join(" · ")} and surrounding North Texas.
            </p>
          </div>

          <div>
            <p className="footer-h">Cabinetry</p>
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
            <p className="footer-h">For trade and home</p>
            <ul className="footer-list">
              <li><Link href="/trade/send-a-plan">Send a plan</Link></li>
              <li><Link href="/trade">Trade program</Link></li>
              <li><Link href="/showroom">Book a visit</Link></li>
              <li><Link href="/process">How it works</Link></li>
              <li><Link href="/faq">FAQ</Link></li>
              <li><Link href="/about">About the DFW branch</Link></li>
            </ul>
          </div>

          <div>
            <p className="footer-h">Company</p>
            <ul className="footer-list">
              <li><Link href="/contact">Contact</Link></li>
              <li><Link href="/legal/privacy">Privacy policy</Link></li>
              <li><Link href="/legal/terms">Terms of use</Link></li>
            </ul>
            <p className="footer-small" style={{ margin: "1.25rem 0 0" }}>
              You choose your own installer. Rooms shown in 3D are concept renders.
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
            fontSize: "0.8125rem",
            color: "#8a8279",
          }}
        >
          <span>
            &copy; {new Date().getFullYear()} {SITE_CONFIG.BRAND_NAME}. Dallas–Fort Worth, TX.
          </span>
          <span>
            2 mm between every door
          </span>
        </div>
      </div>
    </footer>
  );
}

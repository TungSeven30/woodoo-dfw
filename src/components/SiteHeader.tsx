"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE_CONFIG } from "@/config/site";
import { trackEvent } from "@/lib/analytics";

// Five primary destinations in the bar; the rest live in the mobile menu and the footer.
const NAV_LINKS = [
  { href: "/collections", label: "Collections" },
  { href: "/precision", label: "Precision" },
  { href: "/compose", label: "Compose" },
  { href: "/trade", label: "Trade" },
  { href: "/showroom", label: "Showroom" },
];

const MORE_LINKS = [
  { href: "/process", label: "Process" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpenedAtPath, setMenuOpenedAtPath] = useState<string | null>(null);
  const menuOpen = menuOpenedAtPath === pathname;
  const setMenuOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    setMenuOpenedAtPath((prev) => {
      const curr = prev === pathname;
      const target = typeof next === "function" ? next(curr) : next;
      return target ? pathname : null;
    });
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpenedAtPath(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link
            href="/"
            className="brand-mark"
            aria-label={`${SITE_CONFIG.BRAND_NAME} — home`}
          >
            {SITE_CONFIG.LOGO_SRC ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={SITE_CONFIG.LOGO_SRC}
                alt={SITE_CONFIG.LOGO_ALT}
                style={{ height: "28px", width: "auto" }}
              />
            ) : (
              <>
                <span className="brand-mark-rule" aria-hidden="true" />
                <span>{SITE_CONFIG.BRAND_NAME}</span>
              </>
            )}
          </Link>

          <nav className="header-nav" aria-label="Primary navigation">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? "page"
                    : undefined
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="header-actions">

            <Link
              href="/trade/send-a-plan"
              id="header-cta-send-plan"
              className="btn btn-quiet btn-sm header-hide-xs"
              onClick={() =>
                trackEvent("cta_click", {
                  cta: "send-a-plan",
                  location: "header",
                  page: pathname,
                })
              }
            >
              Send a plan
            </Link>

            <Link
              href="/showroom"
              id="header-cta-book-visit"
              className="btn btn-primary btn-sm"
              onClick={() =>
                trackEvent("cta_click", {
                  cta: "book-a-visit",
                  location: "header",
                  page: pathname,
                })
              }
            >
              Book a visit
            </Link>

            <button
              type="button"
              id="mobile-menu-toggle"
              className="btn btn-sm mobile-menu-btn"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav-drawer"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? "Close" : "Menu"}
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div
          id="mobile-nav-drawer"
          className="mobile-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
        >
          <nav className="mobile-drawer-nav" aria-label="Mobile navigation">
            <Link href="/" onClick={() => setMenuOpen(false)}>
              The Film
            </Link>
            {[...NAV_LINKS, ...MORE_LINKS].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link href="/contact" onClick={() => setMenuOpen(false)}>
              Contact
            </Link>
          </nav>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", paddingTop: "1.5rem" }}>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <Link
                href="/trade/send-a-plan"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => setMenuOpen(false)}
              >
                Send a plan
              </Link>
              <Link
                href="/showroom"
                className="btn"
                style={{ flex: 1, color: "var(--paper)", borderColor: "rgba(241,238,231,0.3)" }}
                onClick={() => setMenuOpen(false)}
              >
                Book a visit
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

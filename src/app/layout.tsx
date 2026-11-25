import type { Metadata, Viewport } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { SITE_CONFIG } from "@/config/site";
import { buildOrganizationJsonLd } from "@/lib/seo";
import { SiteProvider } from "@/components/SiteProvider";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

// Self-hosted, subsetted Google Fonts. One family carries display and UI; mono is only for part codes.
const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: true,
  variable: "--font-inter-tight",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
  variable: "--font-jetbrains-mono",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1eee7" },
    { media: "(prefers-color-scheme: dark)", color: "#f1eee7" },
  ],
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.SITE_URL),
  title: {
    default: `${SITE_CONFIG.BRAND_NAME} | Frameless Cabinets in DFW`,
    template: `%s | ${SITE_CONFIG.BRAND_NAME}`,
  },
  description:
    "Frameless European kitchen and bath cabinetry for Dallas–Fort Worth. Three door styles, five finishes, a 2 mm gap between every door.",
  openGraph: {
    type: "website",
    siteName: SITE_CONFIG.BRAND_NAME,
    title: `${SITE_CONFIG.BRAND_NAME} — Frameless kitchen cabinetry`,
    description:
      "Frameless European kitchen and bath cabinetry for Dallas–Fort Worth. Three door styles, five finishes.",
    images: [{ url: "/og/home.png", width: 1200, height: 630, alt: "Frameless cabinetry concept render" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og/home.png"],
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const orgJsonLd = buildOrganizationJsonLd();

  return (
    <html
      lang="en"
      className={`${interTight.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <SiteProvider>
          <SiteHeader />
          <main id="main-content">{children}</main>
        </SiteProvider>
        {plausibleDomain && (
          <Script
            defer
            data-domain={plausibleDomain}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}

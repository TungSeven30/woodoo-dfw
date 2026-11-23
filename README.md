# Woodoo Dallas — Launch Website (`woodoo-dfw`)

> **It arrives flat. It leaves whole.**

Launch website for the Dallas–Fort Worth branch of Woodoo Cabinetry: a continuous 9-scene scroll-driven 3D WebGL Film, real-time kitchen configurator (`/compose`), builder plan-upload & estimating workflow (`/trade/send-a-plan`), homeowner showroom preview booking (`/showroom`), and full server-rendered content architecture.

---

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Production Build & Start

```bash
npm run build
npm run start
```

---

## Configuration (`src/config/site.ts` & Environment Variables)

Every provisional brand string, contact detail, feature flag, and cabinet dimension lives in `src/config/site.ts` and can be overridden via environment variables without touching code:

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_BRAND_NAME` | `"Woodoo Dallas"` | Public DFW brand name used across header, footer, JSON-LD, and titles |
| `NEXT_PUBLIC_LOGO_SRC` | *(unset)* | Optional URL/path to SVG/PNG wordmark replacing the typographic wordmark |
| `NEXT_PUBLIC_SITE_URL` | `"https://dfw-preview.local"` | Canonical URL for Open Graph, sitemap, and robots.txt |
| `NEXT_PUBLIC_SHOWROOM_ADDRESS` | `"{{SHOWROOM_ADDRESS}}"` | Once set alongside opening date, unlocks full showroom visit copy |
| `NEXT_PUBLIC_OPENING_DATE` | `"{{OPENING_DATE}}"` | Until set, `/showroom` offers virtual consultations & preview list only |
| `NEXT_PUBLIC_PHONE` | `"{{PHONE}}"` | DFW business telephone |
| `NEXT_PUBLIC_EMAIL` | `"{{EMAIL}}"` | DFW business email |
| `NEXT_PUBLIC_RESPONSE_PROMISE` | `"{{RESPONSE_PROMISE}}"` | Never displayed until set |
| `NEXT_PUBLIC_CAL_BOOKING_URL` | *(unset)* | Optional Cal.com or Calendly link shown once showroom opens |
| `NEXT_PUBLIC_ENABLE_DEALER_CHANNEL` | `"false"` | Enables dealer/reseller inquiry form on `/trade` |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | *(unset)* | Enables cookieless Plausible analytics script |
| `HUBSPOT_ACCESS_TOKEN` | *(unset)* | Enables `HubSpotAdapter` inside `POST /api/leads` |
| `RESEND_API_KEY` | *(unset)* | Enables `ResendEmailAdapter` inside `POST /api/leads` |
| `LEAD_INBOX_EMAIL` | *(unset)* | Recipient email for `ResendEmailAdapter` |
| `TURNSTILE_SECRET_KEY` / `HCAPTCHA_SECRET_KEY` | *(unset)* | Enforces server-side Turnstile or hCaptcha verification on `POST /api/leads` |

All editable site copy lives in `src/config/content.ts`. All room layout floor plans live in `src/config/layouts.ts`.

---

## Architecture Highlights

- **Parametric Cabinet Generator (`src/engine/cabinet-generator.ts`):** Generates frameless full-overlay boxes with an exact **2.0 mm reveal**, no face frame or centre stile, factory-finished sides, stacked uppers for 8 / 9 / 10 ft ceilings, and 3-inch crown molding. Stand-in box dimensions are flagged `PLACEHOLDER_DIMS` until confirmed against the Woodoo PDF catalog.
- **Exact Hungarian Morphing (`src/engine/layout-morpher.ts`):** Matches panels 1-to-1 across L-Shape, Galley, Island, Bath Vanity, and U-Shape layouts using Kuhn–Munkres assignment with altitude-stratified non-colliding curved flight lanes.
- **Real CC0 Scanned Wood PBR & Physical Light Wipe (`src/engine/materials.ts`):** Progressive low-res WebP boot upgraded in the background to Basis Universal `.ktx2` maps + warm studio HDRI reflections + custom world-space grazing light-wipe transition shader + edge-banding normal differentiation.
- **Lazy-Loaded Procedural Web Audio Foley (`src/engine/sound.ts`):** Off by default; lazy-loaded only when toggled on. Synthesizes pentatonic wood tocks, concealed hinge clicks, soft-close slides, airy light-wipe sweeps, and subtle room tone capped at 8 simultaneous voices.
- **Tier A / B / C & Reduced Motion (`src/engine/device-tier.ts`):** Full desktop WebGL2 (Tier A), portrait-composed adaptive mobile WebGL2 (Tier B), art-directed pre-rendered stills & muted loops exported directly from the same 3D scenes (Tier C), and strictly static stills under `prefers-reduced-motion`.
- **Unified Lead Capture (`src/app/api/leads/route.ts`):** Zod-validated multipart + JSON endpoint with honeypot + Turnstile/hCaptcha verification, UTM + configurator attribution, local `.leads/inbox.ndjson` persistence, and HubSpot + Resend adapters.

---

## Deploying to Vercel

1. Push this Git repository to GitHub.
2. Import into Vercel (`vercel.json` is preconfigured for Next.js App Router).
3. Add environment variables from the table above (`HUBSPOT_ACCESS_TOKEN`, `RESEND_API_KEY`, `LEAD_INBOX_EMAIL`, `NEXT_PUBLIC_BRAND_NAME`, etc.).

---

## Documentation & Verification Artifacts

- `DECISIONS.md` — Creative direction, real wood-sampled colour tokens with verified contrast ratios, type specimen, architecture rationale, scene storyboard lengths, and compromises log.
- `CONTENT-NEEDED.md` — Complete register of placeholders, `PLACEHOLDER_DIMS`, stylised joinery awaiting catalog confirmation, swatch & photo inputs, and testimonial permissions.
- `verification/` — Automated verification reports: 21 scroll screenshots (`0%`–`100%`), desktop & mobile video recordings, Lighthouse reports, axe-core accessibility report, keyboard navigation log, bundle budget audit, and truth/copy audit.

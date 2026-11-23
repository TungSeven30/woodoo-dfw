# Content & Inputs Needed from the Founders

Every placeholder, unverified cabinet dimension, stylised joinery detail, missing asset, and legal permission required before public launch of the Dallas–Fort Worth website.

Zero numbers, prices, lead times, ratings, testimonials, or unconfirmed construction claims were invented in the build. Every item below maps directly to a config token or asset slot so the site can be updated without code changes.

---

## 1. Brand, Legal & Contact Placeholders (`src/config/site.ts`)

| Config Token | Current Value | Needed From Founders |
| :--- | :--- | :--- |
| `BRAND_NAME` | `"Woodoo Dallas"` (working title) | Confirm final public DFW brand name and written brand license/permission from Woodoo HQ (Adam). |
| `LOGO_SRC` | `null` (typographic wordmark fallback) | Provide final SVG wordmark/logotype (`public/brand/logo.svg` or light/dark SVG pair) once public name is settled. |
| `SHOWROOM_ADDRESS` | `"{{SHOWROOM_ADDRESS}}"` | Final leased DFW showroom and warehouse street address, city, ZIP, and confirmed hours. Until set, the site displays `"DFW showroom — opening soon"` and routes visitors to the preview list. |
| `OPENING_DATE` | `"{{OPENING_DATE}}"` | Confirmed public opening date (ISO date). Until set, `/showroom` offers virtual consultations and the preview list only. |
| `PHONE` | `"{{PHONE}}"` | Dedicated DFW business phone number. |
| `EMAIL` | `"{{EMAIL}}"` | Dedicated DFW general / trade inbox email address. |
| `RESPONSE_PROMISE` | `"{{RESPONSE_PROMISE}}"` | Confirmed quote / inquiry response window once Eric and Tung validate team capacity. Never shown until populated. |
| `CAL_BOOKING_URL` | `""` | Cal.com or Calendly scheduling link for showroom visits and design consultations (falls back to native "Request a time" form until set). |
| `STAT_TBD` | Not displayed | Any verified DFW project statistics, warranty terms, or delivery windows to publish post-launch (never publish Chicago revenue, margin, inventory, or capital figures). |

---

## 2. Cabinet Catalog Dimensions (`PLACEHOLDER_DIMS` in `src/config/site.ts`)

The official Woodoo Cabinetry specification catalog on `woodoocabinetry.com/catalog` is gated behind a lead-capture form and was not downloaded automatically. Until the founders supply the PDF specification catalog, the parametric 3D cabinet generator uses **standard North American 32 mm-system European frameless proportions**, flagged `PLACEHOLDER_DIMS` in `src/config/site.ts`:

| Cabinet Family | Stand-In Dimensions (`PLACEHOLDER_DIMS`) | Confirm Against Woodoo Catalog |
| :--- | :--- | :--- |
| Base cabinets (`B15`–`B36`, `DB24`–`DB36`, `SB36`) | `34.5"` H × `24"` D (`4.5"` recessed toe kick + `30"` carcass), widths `15"`, `18"`, `24"`, `30"`, `36"` | Confirm exact box height, toe-kick height/recess, depth, and stocked DFW width increments. |
| Wall cabinets (`W1830`–`W3642`) | `12"` D, heights `30"`, `36"`, `42"`, widths `18"`, `24"`, `30"`, `36"` | Confirm exact heights and depths for 8 ft, 9 ft, and 10 ft ceiling combinations. |
| Stacked upper cabinets (`WU2412`–`WU3618`) | `12"` D (or `24"` D over refrigerator/pantry), heights `12"`, `15"`, `18"` + `3"` crown molding | Confirm exact stacked box heights used with the confirmed 3-inch molding for 8 / 9 / 10 ft ceilings. |
| Tall pantry / oven cabinets (`TP2484`–`TP3096`) | `24"` D, widths `24"`, `30"`, heights `84"`, `93"`, `105"` | Confirm exact tall cabinet heights and door split proportions. |
| Bath vanities (`V30`–`V60`) & linen towers (`LT1884`) | Vanity `34.5"` H × `21"` D; Linen tower `18"` W × `21"` D × `84"` H | Confirm exact bath vanity height (`32.5"` vs `34.5"`), depth (`21"`), and linen tower widths. |
| Carcass & door panel thickness | `19 mm` (`3/4"`) carcass panels and doors; `6 mm` recessed back; `2.0 mm` reveal (confirmed) | Confirm actual carcass board thickness (`16 mm` vs `18 mm` vs `19 mm`), door thickness, and Shaker / Slim Shaker rail & stile widths (stand-in: `57 mm` Traditional Shaker, `22 mm` Slim Shaker). |

---

## 3. Stylised Joinery Details Shown in 3D Motion (Never Stated in Copy Yet)

Per Ground Rule 7, only the following construction facts are confirmed and stated in website copy: **frameless construction, full overlay, 2 mm reveal, no face frame or centre stile, factory-finished sides, and 8 / 9 / 10 ft ceiling system with 3-inch molding**.

The following details appear visually in the 3D assembly animation as **stylised motion representations** and are intentionally omitted from all written claims until confirmed in writing from the official Woodoo specification catalog:

- [ ] **Back panel grooves / dadoes** (visualised sliding into carcass grooves in Scene 2)
- [ ] **Shelf pin holes & metallic shelf pins** (visualised seating shelves in Scene 2)
- [ ] **Adjustable interior shelves** (visualised re-spacing in Scene 4)
- [ ] **Concealed European cup hinges** (visualised seating before door hang in Scene 2)
- [ ] **Soft-close hinge & drawer slide action** (implied by damped docking motion and subtle foley, not claimed in copy)
- [ ] **Drawer box joinery (dovetail / metal-sided)** (simplified box interior shown in motion)
- [ ] **Edge banding construction & material (PVC / ABS / wood veneer)** (subtle edge tonal shift rendered in PBR shader)
- [ ] **Carcass core substrate (plywood vs furniture board / MDF)** (not claimed anywhere in copy)

---

## 4. Finish Swatches & Photography

- [ ] **Physical swatch scans / color-calibrated photos** of the five official Woodoo finishes (`Premium Oak`, `Ivory Oak`, `Classic Walnut`, `Iron Black`, `Frosty White`). Current PBR textures are CC0 real wood veneer scans from Poly Haven color-calibrated as architectural stand-ins.
- [ ] **DFW showroom photography** once build-out is completed. All 3D kitchen and bathroom visuals currently carry a visible `"Concept render"` label.
- [ ] **First local project case study photography** (e.g., Tung & Krystal's kitchen remodel or first founding homeowner/builder installs) with written homeowner/builder photo release.

---

## 5. Testimonials & Permissions

- [ ] **Written permission for Chicago testimonials** (Nosterio Designs, Boxhouzz, Marcin Rax, Mark Paul) OR first verified DFW client testimonials. The testimonial component is built and gated behind `featureFlags.testimonials` in `src/config/site.ts`, populated with clearly marked placeholder text (`{{TESTIMONIAL_*}}`) so no unpermissioned quotes are ever published.

---

## 6. Integrations, CRM & Compliance

- [ ] **CRM / Inbox environment variables**: `HUBSPOT_ACCESS_TOKEN` (if using HubSpot), `RESEND_API_KEY` + `LEAD_INBOX_EMAIL` (for email forwarding), `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` (or `HCAPTCHA_*`) for production spam protection.
- [ ] **Privacy-friendly analytics domain**: `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (or Vercel Analytics enabled on Vercel deploy).
- [ ] **Dealer channel decision**: Flip `featureFlags.dealerChannel` in `src/config/site.ts` to `true` only if the founders decide to accept reseller/dealer inquiries in DFW.
- [ ] **Warranty policy text & formal Texas LLC legal entity name**: Update `/legal/privacy`, `/legal/terms`, and FAQ warranty detail once the DFW entity and supplier warranty terms are finalized.

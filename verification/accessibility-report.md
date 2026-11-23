# Accessibility & Keyboard Navigation Audit Report

Generated: 2026-11-23T19:10:56.721Z
Total WCAG 2.2 AA axe-core violations across 10 audited views: **0**

## Automated axe-core Results (WCAG 2.0 / 2.1 / 2.2 AA)

| Route / View | Violations | Rules Passed |
| :--- | :---: | :---: |
| `/ (Live 3D Film · Scene 7 HUD & Rail)` | 0 | 24 |
| `/` | 0 | 25 |
| `/collections` | 0 | 25 |
| `/collections/traditional-shaker` | 0 | 25 |
| `/compose` | 0 | 29 |
| `/precision` | 0 | 29 |
| `/trade` | 0 | 28 |
| `/trade/send-a-plan` | 0 | 29 |
| `/showroom` | 0 | 28 |
| `/faq` | 0 | 25 |

> **PASS:** Zero (0) WCAG 2.0 / 2.1 / 2.2 AA violations detected across every audited route, including the live interactive 3D Film HUD, configurator, and plan-upload forms.

## Keyboard Focus Path Verification Log

### Route: `/`
1. `a (Skip to main content)`
2. `a (Woodoo Dallas)`
3. `a (Collections)`
4. `a (Compose)`
5. `a (Precision)`
6. `a (Trade)`
7. `a (Showroom)`
8. `a (Process)`
9. `a (About)`
10. `a (FAQ)`
11. `button#sound-toggle-btn (Sound off)`
12. `button#lighter-version-toggle (3D version)`
13. `a#header-cta-send-plan (Send a plan)`
14. `a#header-cta-book-visit (Book a visit)`
15. `a (Skip to trade)`
16. `a (Skip to homeowners)`

### Route: `/compose`
1. `a (Skip to main content)`
2. `a (Woodoo Dallas)`
3. `a (Collections)`
4. `a (Compose)`
5. `a (Precision)`
6. `a (Trade)`
7. `a (Showroom)`
8. `a (Process)`
9. `a (About)`
10. `a (FAQ)`
11. `button#sound-toggle-btn (Sound off)`
12. `button#lighter-version-toggle (3D version)`
13. `a#header-cta-send-plan (Send a plan)`
14. `a#header-cta-book-visit (Book a visit)`
15. `button (Perspective)`
16. `button (Plan view)`

### Route: `/trade/send-a-plan`
1. `a (Skip to main content)`
2. `a (Woodoo Dallas)`
3. `a (Collections)`
4. `a (Compose)`
5. `a (Precision)`
6. `a (Trade)`
7. `a (Showroom)`
8. `a (Process)`
9. `a (About)`
10. `a (FAQ)`
11. `button#sound-toggle-btn (Sound off)`
12. `button#lighter-version-toggle (3D version)`
13. `a#header-cta-send-plan (Send a plan)`
14. `a#header-cta-book-visit (Book a visit)`
15. `a (Trade)`
16. `input#plan-files-input ()`

## Reduced Motion & Screen Reader Structure

- `prefers-reduced-motion: reduce` video elements rendered: **0** (strictly 0; static Tier C stills only).
- Homepage 3D canvas carries `aria-hidden="true"`; full ordered 9-scene narrative is present in semantic HTML `<ol>` for screen readers and crawlers.
- Configurator updates emit live status changes via `aria-live="polite"`.
- Every form field has explicit `<label htmlFor>`, inline error messages, keyboard-accessible file upload, and preserved system cursor.
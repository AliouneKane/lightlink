# LightLink web

PAN's functional frontend prototype for LightLink: a responsive French interface to inspect neighborhood power status, explore an interactive map, try local outage reports and energy sharing, and review illustrative forecasts. Team approval of the prototype (task 29) is pending.

PAN approved the logo and visual identity, then requested a denser dashboard based on Linkwarden's layout. The current design direction is a compact workspace with a French dashboard title, small statistics, energy-offer image rails and closely spaced sections. It includes a collapsible sidebar, light/dark theme and the “Modifier la disposition” dashboard-layout menu with section visibility checkboxes and reordering. The executed checks and visual inspection are described below; team approval of the prototype remains pending.

## Run locally

Use Node.js and npm. From the repository root:

```sh
cd web
npm ci
npm run dev
```

Open `http://localhost:3000`. No API key or `.env` file is needed for this local demonstration.

```sh
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

The browser tests use Playwright with Chromium. To run a production build locally, use `npm run build` followed by `npm run start`. Formatting commands are `npm run format` and `npm run format:check`.

## Stack and routes

- Next.js 16.3.8 App Router, React 19.3.0 and TypeScript.
- Self-hosted Manrope, Lucide icons and a temporary SVG identity in `public/lightlink-mark.svg`.
- Leaflet/react-leaflet with OpenStreetMap tiles for the prototype, without an API key. The planned production choice between Google Maps and Mapbox still needs team approval (task 17).

The local Linkwarden clone at commit `474dd11632b32db30cde52460b2711ecadb1886e` was inspected for dashboard proportions: 288 px expanded sidebar, 12 px content spacing, approximately 84 px statistics, and 240 px offer cards with 160 px-high images. The implementation in `web` is original; no Linkwarden source component or stylesheet is copied. The existing Next.js architecture, routes and demonstration domain logic remain in place. No Linkwarden Yarn workspace, Prisma client, worker or backend is installed. The intact reference clone is ignored by the root `.gitignore` rule `/linkwarden/`; its AGPL-3.0 license remains with that clone. See [DESIGN_REFERENCE.md](../docs/DESIGN_REFERENCE.md) for provenance, layout mapping and the read-before-install inspection.

Energy illustrations in `public/images/solar.png`, `generator.png` and `battery.png` are original AI-generated assets served locally. They illustrate demonstration energy sources; they do not depict actual hosts or their addresses.

| Route         | Prototype behavior                                                                                  |
| ------------- | --------------------------------------------------------------------------------------------------- |
| `/`           | Dashboard, selected neighborhood, map, local activity and nearby offers.                            |
| `/carte`      | Interactive map, search, filters and neighborhood details.                                          |
| `/previsions` | Illustrative risk, confidence, time windows and duration estimates.                                 |
| `/partage`    | Solar, generator and battery offers; distance sorting; local offer creation and simulated requests. |
| `/communaute` | Demonstration reports and local power-status contributions.                                         |
| `/parametres` | Local name/neighborhood profile, demonstration alert preference and data reset.                     |

Sign-in and registration interfaces open from the profile button. They are demonstration screens; they do not authenticate users, create a remote account or store a password. Student, merchant and generator-owner personas describe user journeys, not authorization roles.

## Demonstration data and boundaries

`src/lib/energy.ts` defines ten zones: Osu, Labone, East Legon, Adabraka, Cantonments, Dansoman, Airport Residential, Achimota, Madina and Tema Community 1. The reference scenario is dated 4 October 2026, 15:42 GMT. Neighborhood status, reports, hosts, offers, forecast percentages, estimates and schedules are simulated; no official ECG schedule is imported and no production prediction model runs.

`localStorage` key `lightlink.demo.v1` stores reports, offers, simulated requests, the local profile and the alert preference. Updates appear across tabs on the same browser origin. Stored input is validated on read. If storage is unavailable, the current session can continue without persistence across reloads. Reset the scenario in Settings.

`lightlink.display.v1` separately stores the light/dark theme, collapsed sidebar, expanded/collapsed pilot-neighborhood group, section visibility and section order. Click the yellow arrow beside “Quartiers pilotes” to toggle its links, or use Enter/Space while the button is focused. Preferences survive reloads and synchronize across tabs on the same origin; existing stored preferences remain compatible. Resetting local data in Settings restores display defaults: dark theme, expanded sidebar and neighborhood group, and all dashboard sections visible in their original order. If browser storage is unavailable, display changes remain usable for the current session without persistence across reloads.

Map coordinates point to approximate neighborhood centers, never a host's address. Distances are straight-line distances between centers, not travel routes. The initial offers suggest contributions of 5–20 GHS; no payment is collected. A request remains a local pending simulation: no owner is contacted, no address is disclosed, and acceptance/refusal/completion are future backend work.

There is no real authentication, backend write, report delivery, push notification or synchronization queue. Offline contributions stay on the device. OpenStreetMap tiles require internet access; tile loading and failure states are shown, while local information remains available. The app also includes an offline banner, form errors, an application error page, keyboard dialog handling and reduced-motion support.

## Review and future deployment

The PDF sources and PAN task status are documented in [PAN_WEB_SCOPE.md](../docs/PAN_WEB_SCOPE.md). The scope separates technically delivered frontend work from team acceptance and future integrations. Run the checks on the commit being reviewed.

Checks executed on 5 October 2026: ESLint, TypeScript, the production build and all 16 unit tests pass. The complete browser suite has 48 cases: 46 pass and two are intentionally skipped by viewport (mobile navigation on desktop, desktop sidebar collapse on mobile). The 16 Axe audits using WCAG A/AA tags are included in the 46 passing cases, not additional tests. They cover the six pages and inspected dialogs at 1440 × 1000 and 360 × 800. The new neighborhood-group tests cover arrow clicks, keyboard activation, persistence and neighborhood navigation on both viewports. The Leaflet map surface is excluded from these audits; map controls and the neighborhood list remain covered. These targeted automated checks do not establish general WCAG conformance.

Screenshots were inspected at 1440 px desktop and 390 px mobile widths for dark/light themes, the collapsed 56 px sidebar and the reporting form. Secondary pages were also inspected at 1440 and 360 px widths: introductory copy is muted and 13 px, the Sharing page's `sharing-banner` remains intentionally commented out, and the no-payment reminder is compact and placed beside the filters. No horizontal overflow was observed, and the mobile chart was corrected. The 404 page and its return to the dashboard were verified.

The last CSS adjustment applies `align-items: start` to `community-page-grid` to prevent the activity panel from stretching. The production build and four targeted checks pass after this change: Community accessibility and overflow across all six routes on desktop and mobile. Updated screenshots were inspected. The demonstration scenario deliberately remains dated 4 October, separate from the verification date.

Dependency audit (26 October 2026): `npm audit` reports no vulnerability, development tooling included, since `next` was updated to 16.4.1 (Dependabot PR #14); the earlier audit had flagged `next` 16.3.8 as critical. Details and the mobile findings: [`docs/QUALITE_ET_SECURITE.md`](../docs/QUALITE_ET_SECURITE.md).

Task 46 is not deployed. For a future Vercel deployment with Salam, import the repository, set Root Directory to `web`, select the Next.js preset, and use `npm ci` / `npm run build`. Configure pull-request previews and verify the resulting URL. Add backend environment variables only when their integration is ready; never commit secrets.

The planning PDFs disagree on the contest deadline: 31 October in the implementation plan versus 18 December reported from DoraHacks in the task distribution. Confirm the official date with Tech Hub Africa.

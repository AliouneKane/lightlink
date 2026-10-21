# LightLink · Web

The LightLink web app: neighbourhood power status, live map of Accra, outage forecasts and energy sharing, in French. Built with Next.js.

<img src="../docs/images/web-dashboard.jpg" alt="LightLink web dashboard" width="100%" />

## Run it

```sh
cd web
npm ci
npm run dev      # http://localhost:3000
```

No key is needed: without `web/.env.local` the app runs in **demo mode**, with data kept in the browser.

For **live mode**, create `web/.env.local` with the project's public values (never the secret key):

```sh
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key>
```

The badge at the top right shows the mode: **DÉMO**, **CONNEXION…**, **EN DIRECT** or **HORS LIGNE**.

## Pages

| Route         | Page                                                                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `/`           | Dashboard: my neighbourhood, neighbourhoods without power, nearby offers, map, forecast, community. Sections can be reordered and hidden |
| `/carte`      | Map of the 10 pilot neighbourhoods: reported outages, announced ECG outages (dashed ring), energy offers                                 |
| `/previsions` | Forecast of the day, risk by hour, confidence, ECG calendar and the _« Avez-vous du courant ? »_ question                                |
| `/partage`    | Energy offers by source and distance, my requests, requests received on my offers                                                        |
| `/communaute` | Recent reports by neighbourhood                                                                                                          |
| `/parametres` | Profile, light or dark theme, reset                                                                                                      |

Dialogs: report an outage, publish an offer, account (sign up and sign in in live mode), notifications, help.

## Demo mode and live mode

|                           | Demo mode                                             | Live mode                                                        |
| ------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| Neighbourhood states      | Demonstration scenario                                | `zone_status` view, refreshed on every report (Realtime)         |
| Forecast                  | Model output for 16 Oct 2026, labelled with its date  | Today's row of `predictions`                                     |
| ECG calendar              | Real October 2026 announcements + a labelled demo one | `ecg_schedules`                                                  |
| Reports, offers, requests | Kept in this browser (`localStorage`)                 | Supabase; an anonymous session opens only when the resident acts |
| Accounts                  | Demonstration screens                                 | E-mail sign-up and sign-in                                       |
| Notifications             | Demonstration list                                    | The resident's inbox                                             |

When the database does not answer, the app never shows invented states: neighbourhoods read _« État inconnu »_ and the map explains why.

## Checks

```sh
npm run format:check
npm run lint
npm run typecheck
npm test                       # unit tests (Vitest)
npm run build:e2e              # production build, forced to demo mode
npx playwright install chromium
npm run test:e2e               # 46 browser journeys, desktop and mobile sizes, with Axe accessibility audits
```

`build:e2e` forces demo mode so browser tests never write to the real database, even if `web/.env.local` holds keys.

## Structure

| Path                | Content                                                |
| ------------------- | ------------------------------------------------------ |
| `src/app/`          | Routes (App Router)                                    |
| `src/components/`   | App shell, dashboard, map (Leaflet), dialogs           |
| `src/lib/live.ts`   | Supabase client and live hooks                         |
| `src/lib/energy.ts` | Re-exports the shared logic of `../shared/`            |
| `tests/`            | Playwright journeys                                    |
| `public/`           | Logo and energy illustrations (original, AI-generated) |

## Notes

- **Stack**: Next.js 16 (App Router), React 19, TypeScript, Leaflet with OpenStreetMap tiles, Manrope, Lucide icons.
- **Privacy**: map markers sit on neighbourhood centres, never on a home; distances are straight lines between centres.
- **Design**: dashboard proportions inspired by Linkwarden, original implementation; see [DESIGN_REFERENCE.md](../docs/DESIGN_REFERENCE.md).
- **Deployment**: on Vercel, set _Root Directory_ to `web`, build with `npm ci` and `npm run build`, and add the two public variables above.

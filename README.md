# LightLink

> During dumsor, your neighbor becomes your power source.

LightLink is a mobile + web app that turns localized power outages into neighborhood energy solidarity. Built for the Tech Hub Africa Hackathon 2026, track: Electricity Efficiency.

## The problem

In Ghana, power cuts (dumsor) are often localized: one neighborhood is in the dark while nearby ones still have electricity. Small shops close, students cannot work, people waste time looking for light, and owners of generators or solar panels waste their surplus energy.

## The solution

LightLink combines three pillars:

- Know: real-time information from geolocated community reports and official ECG schedules.
- Predict: smart prediction of outages and their duration, with a confidence level.
- Share: matching people who have surplus energy (generator, solar) with people who need it.

## Data sources

- **Official ECG announcements**: X, Instagram, the ECG website and press articles, with links in [docs/SOURCES_HORAIRES_ECG.md](docs/SOURCES_HORAIRES_ECG.md). Collected files are in `data/`; new announcements are copied by hand into `data/saisie/` ([how](data/saisie/README.md)).
- **Community reports** in the app, aggregated by neighbourhood in the database (`zone_status` view).
- **Residents' answers** to "Avez-vous du courant ?" during announced outages, which measure how often ECG announcements are held.
- **No simulated data in the forecasts**: the rules model in `prediction/` combines real ECG announcements with each neighbourhood's base rate. See [prediction/README.md](prediction/README.md) for every parameter and its source.

## Tech stack

- Mobile: React Native / Expo (SDK 57) with TypeScript and Expo Router
- Web: Next.js
- Backend, auth, realtime: Supabase (Postgres, row level security, Realtime)
- Maps: Leaflet on the web, native maps on mobile
- Prediction: rules model in Python (standard library only), daily forecasts written to Supabase by GitHub Actions
- Notifications: not built yet (simulated)

## Repository structure

- `mobile/`: React Native / Expo app
- `web/`: Next.js app
- `shared/`: logic shared by both apps (neighbourhoods, ECG announcements, forecasts, live mode)
- `backend/`: Supabase migrations, seed and database tests
- `prediction/`: forecast model, ECG schedule import, tests
- `data/`: ECG announcements collected by the team, one CSV format for every source
- `docs/`: documentation (screens and user journeys, ECG sources, user tests, database model)

## Team: LightLink Squad

- Alioune Abdou Salam Kane
- Ndeye Ramatoulaye Ndoye Fall
- Judicaël Oscar Kafando
- Papa Amadou Niang

## Getting started

You need [Node.js](https://nodejs.org/) 20.19.4 or newer and Python 3.9 or newer. Docker is only needed to run Supabase locally. In Windows PowerShell, use `npm.cmd` and `npx.cmd` if script execution is restricted.

### Demo mode or live mode

Both apps run in two modes:

- **Demo mode** (default): no account, no key, no `.env` file. Data stays on the device. Forecasts show the model's real output for 16 Oct 2026, labelled with that date.
- **Live mode**: reports, the map, ECG schedules and today's forecasts come from Supabase. Put the project's **public** URL and publishable key in `web/.env.local` and `mobile/.env` (variable names in [.env.example](.env.example)). Never put the secret key or the database password in an app; [backend/README.md](backend/README.md) explains how to connect a project.

### Web

```sh
cd web
npm ci
npm run dev        # http://localhost:3000
```

### Mobile

```sh
cd mobile
npm ci
npm start
```

Install Expo Go (SDK 57) from [expo.dev/go](https://expo.dev/go), connect the phone to the same Wi-Fi as the computer and scan the QR code. If Expo Go asks you to sign in, run `npx expo start --offline` instead, or sign in with `npx expo login`. Reports made without network wait on the phone and leave when it comes back. See [the mobile README](mobile/README.md) for the browser preview.

### Prediction

```sh
python3 prediction/predict.py --date 2026-10-16    # forecast per neighbourhood, writes SQL
python3 prediction/backtest.py                     # compares the model with simple baselines
python3 -m unittest discover -s prediction/tests
```

### Database

```sh
cd backend
npm ci
npm run test:sql   # migrations, access rules and views on an in-memory Postgres, no Docker
```

`npm run start:db` and `npm run start` run Supabase locally with Docker; see [backend/README.md](backend/README.md).

### Checks before a pull request

```sh
cd web && npm run lint && npm run typecheck && npm test
npm run build:e2e && npx playwright install chromium && npm run test:e2e   # demo mode, even with keys
cd ../mobile && npm run typecheck && npm test && npm run test:e2e
```

The same checks run on GitHub Actions for every pull request. Never commit secrets: this repository is public.

## Documentation

- [Screens and user journeys](docs/PARCOURS_ET_ECRANS.md)
- [Where the ECG publishes its schedules](docs/SOURCES_HORAIRES_ECG.md)
- [User test protocol](docs/TESTS_UTILISATEURS.md)
- [Database model](docs/MODELISATION_BASE_DE_DONNEES.md) and [why Supabase](docs/DECISION_SUPABASE.md)
- [Forecast model](prediction/README.md), [backend](backend/README.md), [web](web/README.md), [mobile](mobile/README.md)

## License

MIT

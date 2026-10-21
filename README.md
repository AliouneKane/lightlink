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

- Official ECG schedules (website, Facebook, X, media releases).
- Community reports in the app, aggregated by neighborhood / feeder.
- Historical patterns by weekday, hour, zone and season.
- MVP: smart rules + historical averages + ECG schedules. Later: machine learning (Random Forest or time series).

## Tech stack

- Mobile: React Native / Expo with TypeScript and Expo Router (local frontend prototype)
- Web: Next.js
- Backend, auth, realtime: Supabase or Firebase
- Maps: native Google Maps / Apple Maps in the mobile prototype; production provider still to validate
- Notifications: Firebase Cloud Messaging
- Prediction: rules first, ML later

## Repository structure

- mobile/ : React Native / Expo mobile frontend, local demonstration data
- web/ : Next.js app
- backend/ : database, rules and APIs
- prediction/ : outage prediction logic
- docs/ : documentation
- shared/ : demonstration energy model shared by the mobile and web frontends

## Team: LightLink Squad

- Alioune Abdou Salam Kane
- Ndeye Ramatoulaye Ndoye Fall
- Judicaël Oscar Kafando
- Papa Amadou Niang

## Getting started

The mobile frontend runs with Expo. From the repository root:

```sh
cd mobile
npm ci
npm start
```

Use an Expo Go version compatible with SDK 57 from [the Expo Go download page](https://expo.dev/go), then scan the terminal's QR code with your phone on the same network. In Windows PowerShell, use `npm.cmd` and `npx.cmd` if script execution is restricted. See [the mobile README](mobile/README.md) for browser preview, checks and native setup limits, and [PAN's mobile scope](docs/PAN_MOBILE_SCOPE.md) for delivered frontend behavior and pending validation. Without `mobile/.env` the app is a local demo. With the public Supabase values in `mobile/.env`, reports, the live map, ECG schedules and forecasts come from the database, and reports made offline are sent when the network is back. Payment and push notifications remain future integrations.

The functional PAN web prototype runs locally with demonstration data. From the repository root:

```sh
cd web
npm ci
npm run dev
```

Open `http://localhost:3000`. Without a `.env.local` file the app is a local demo: reports, offers, requests and profile changes stay in this browser. With the public Supabase URL and key in `web/.env.local` (see [the backend README](backend/README.md)), reports, the live map, ECG schedules, forecasts and accounts come from the database; energy sharing stays simulated.

```sh
npm run lint
npm run typecheck
npm run test
npm run build:e2e   # demo mode, even when web/.env.local holds Supabase keys
npx playwright install chromium
npm run test:e2e
```

See [the web README](web/README.md) for routes, data limits and future Vercel setup, and [PAN's web scope](docs/PAN_WEB_SCOPE.md) for task status and reference documents. Never commit secrets: this repository is public.

## License

MIT

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

- Mobile: React Native / Expo (planned; latest task distribution)
- Web: Next.js
- Backend, auth, realtime: Supabase or Firebase
- Maps: Google Maps or Mapbox
- Notifications: Firebase Cloud Messaging
- Prediction: rules first, ML later

## Repository structure

- mobile/ : mobile app placeholder (React Native / Expo planned)
- web/ : Next.js app
- backend/ : database, rules and APIs
- prediction/ : outage prediction logic
- docs/ : documentation

## Team: LightLink Squad

- Alioune Abdou Salam Kane
- Ndeye Ramatoulaye Ndoye Fall
- Judicaël Oscar Kafando
- Papa Amadou Niang

## Getting started

The functional PAN web prototype runs locally with demonstration data. From the repository root:

```sh
cd web
npm ci
npm run dev
```

Open `http://localhost:3000`. The local prototype needs no API key or `.env` file. Reports, offers, requests and profile changes stay in this browser; authentication, live ECG data and the backend are future integrations. Team validation of the frontend is pending.

```sh
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

See [the web README](web/README.md) for routes, data limits and future Vercel setup, and [PAN's web scope](docs/PAN_WEB_SCOPE.md) for task status and reference documents. Never commit secrets: this repository is public.

## License

MIT

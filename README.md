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

- Mobile: Flutter
- Web: Next.js
- Backend, auth, realtime: Supabase or Firebase
- Maps: Google Maps or Mapbox
- Notifications: Firebase Cloud Messaging
- Prediction: rules first, ML later

## Repository structure

- mobile/ : Flutter app
- web/ : Next.js app
- backend/ : database, rules and APIs
- prediction/ : outage prediction logic
- docs/ : documentation

## Team: LightLink Squad

- Alioune Abdou Salam Kane
- Ndeye Ramatoulaye Ndoye Fall
- Judicael Oscar Kafando
- Papa Amadou Niang

## Getting started

Setup instructions are coming soon. Copy .env.example to .env and fill in your own values. Never commit secrets: this repository is public.

## License

MIT

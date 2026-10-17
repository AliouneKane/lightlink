# backend

LightLink uses **Supabase** (Postgres, Auth, Realtime, row level security). Decision: [docs/DECISION_SUPABASE.md](../docs/DECISION_SUPABASE.md). Never commit secrets: use `.env`.

## Contents

- `supabase/config.toml`: local project settings.
- `supabase/migrations/`, applied in order:
  - `20261014000000_init_phase2.sql`: tables `zones`, `profiles`, `outage_reports`, `ecg_schedules`, the `zone_status` view, rate limit and RLS policies.
  - `20261017000000_announcement_checks.sql`: report kinds `powered` and `unstable` (as offered by the apps), `ecg_schedules.partial`, and the `announcement_outcomes` view. During an announced outage the apps ask "Avez-vous du courant ?"; the view counts, per announcement, residents cut and residents with power. The prediction model reads it to learn how often ECG announcements are held (`python3 prediction/predict.py --outcomes <export.csv>`).
  - `20261017000100_dated_zone_groups.sql`: load-shedding groups of each zone, with source and validity period (groups change between plans).
- `supabase/seed.sql`: the 10 pilot zones (same ids as `shared/energy.ts`) and the dated groups, generated from `data/` by `python3 prediction/build_zone_groups.py`.
- `scripts/test-migrations.mjs`: applies every migration and the seed to an in-memory Postgres and checks the views, **without Docker**.

## Test the migrations without Docker

```sh
cd backend
npm ci
npm run test:sql   # about 1 second, nothing to start or stop
```

## Run locally

Needs Node.js and Docker running. Pick the lightest command that does the job:

| Command | Starts | Disk (images) | Use it to |
|---|---|---|---|
| `npm run test:sql` | nothing (in-memory Postgres) | 21 MB | check migrations and views, no Docker |
| `npm run start:db` | Supabase Postgres only (~70 MB RAM) | ~1.9 GB | run migrations and seed on the real Supabase image, connect with `psql` |
| `npm run start` | Postgres, Auth, REST API, Realtime, Studio | ~5 GB | wire the apps to the backend |

`supabase/config.toml` switches off the services LightLink does not use (analytics, storage, edge functions, test mailbox): 3.4 GB of images less than the default stack (storage 1.39, edge runtime 1.07, Logflare 0.70, Vector 0.21, mailbox 0.05).

```sh
cd backend
npm ci
npm run start     # starts Postgres, Auth, Realtime, Studio (http://127.0.0.1:54323)
npm run reset     # re-applies migrations and seed
npm run status    # prints the local API URL and anon key for .env
npm run stop
```

Copy the local `API URL` and `anon key` from `npm run status` into `.env` (see `.env.example`).

## Link a hosted project

```sh
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

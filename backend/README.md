# backend

LightLink uses **Supabase** (Postgres, Auth, Realtime, row level security). Decision: [docs/DECISION_SUPABASE.md](../docs/DECISION_SUPABASE.md). Never commit secrets: use `.env`.

## Contents

- `supabase/config.toml`: local project settings.
- `supabase/migrations/`, applied in order:
  - `20261014000000_init_phase2.sql`: tables `zones`, `profiles`, `outage_reports`, `ecg_schedules`, the `zone_status` view, rate limit and RLS policies.
  - `20261017000000_announcement_checks.sql`: report kinds `powered` and `unstable` (as offered by the apps), `ecg_schedules.partial`, and the `announcement_outcomes` view. During an announced outage the apps ask "Avez-vous du courant ?"; the view counts, per announcement, residents cut and residents with power. The prediction model reads it to learn how often ECG announcements are held (`python3 prediction/predict.py --outcomes <export.csv>`).
  - `20261017000100_dated_zone_groups.sql`: load-shedding groups of each zone, with source and validity period (groups change between plans).
  - `20261017000200_phase2_live.sql`: planned or surprise outages in `zone_status`, report positions checked against the neighbourhood, re-runnable ECG schedule import.
  - `20261020000000_predictions.sql`: daily forecasts of the rules model (`prediction/`), public and read-only for users.
  - `20261021000000_offline_reports.sql`: observation time and stable id for reports sent after an offline period.
  - `20261021000100_retry_rate_limit.sql`: a retried report skips the rate limit.
  - `20261021000200_simulated_reports.sql`: simulated demo reports, labelled and reserved to the demo script.
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

## Connect the apps to the hosted project

Once, by a team member who owns the Supabase project:

```sh
cd backend
npx supabase login
npx supabase link --project-ref <project-ref>      # asks the database password
npx supabase db push --include-seed                # migrations + zones, groups, ECG schedules
npx supabase config push                           # auth settings, incl. anonymous sign-ins
```

Then give each app the two **public** values (Project Settings > API). Never the `service_role` key.

| App | File (git-ignored) | Variables |
|---|---|---|
| Web | `web/.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Mobile | `mobile/.env` | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` |

Without these values both apps stay local demos. With them, reports go to the database, the map follows `zone_status` live, the ECG calendar reads `ecg_schedules`, the web creates real accounts, and the mobile keeps reports made offline until the network is back.

Check the whole chain (anonymous report, Realtime, map, access rules) on the hosted project:

```sh
SUPABASE_URL=https://<project-ref>.supabase.co SUPABASE_ANON_KEY=<anon key> npm run test:live
```

### Demo data for a live presentation

With few real reports, the live map is almost empty. For a demo (task 69):

```sh
npm run demo:on    # 10 realistic reports in Osu, Labone, Dansoman and Madina, observed in the last hour
npm run demo:off   # removes every simulated report
```

Simulated reports are labelled `[SIMULÉ]`, shown as "Données simulées" by the apps, never count in the measure of ECG announcements, and leave the map by themselves after 2 hours. App users cannot create them (migration `20261021000200_simulated_reports.sql`).

For the daily import of ECG schedules and forecasts (`.github/workflows/daily-data.yml`), add the repository secret `SUPABASE_DB_URL` (Project Settings > Database > Connection string, session pooler).

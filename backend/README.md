# backend

LightLink uses **Supabase** (Postgres, Auth, Realtime, row level security). Decision: [docs/DECISION_SUPABASE.md](../docs/DECISION_SUPABASE.md). Never commit secrets: use `.env`.

## Contents

- `supabase/config.toml`: local project settings.
- `supabase/migrations/`: tables `zones`, `profiles`, `outage_reports`, `ecg_schedules`, the `zone_status` view, rate limit and RLS policies.
- `supabase/seed.sql`: the 10 pilot zones (same ids as `shared/energy.ts`).

## Run locally

Needs Node.js and Docker running.

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

# LightLink · Backend

The LightLink database on **Supabase** (Postgres, Auth, Realtime, row level security). The rules that must hold for everyone (anti-abuse limits, privacy of addresses, sharing rules, alerts) live here, so the web and mobile apps behave the same. Why Supabase: [DECISION_SUPABASE.md](../docs/DECISION_SUPABASE.md). How it fits together: [ARCHITECTURE.md](../docs/ARCHITECTURE.md).

## Commands

Run from `backend/` after `npm ci`.

| Command | What it does | Needs |
|---|---|---|
| `npm run test:sql` | Applies every migration and the seed to an in-memory Postgres and checks access rules, views, sharing and notifications (about 2 s) | Nothing |
| `npm run test:live` | End-to-end test on the hosted project: anonymous report, Realtime, map, access rules, full sharing flow, read speed | `SUPABASE_URL` and `SUPABASE_ANON_KEY` (public values) |
| `npm run test:load` | 100 simulated reports at once on the hosted project, then deleted | Linked project |
| `npm run demo:on` / `demo:off` | Adds or removes 10 labelled simulated reports for a live presentation | Linked project |
| `npm run start:db` | Supabase Postgres alone in Docker (about 70 MB of RAM, 1.9 GB of images) | Docker |
| `npm run start` · `reset` · `status` · `stop` | The full local stack (Postgres, Auth, REST, Realtime, Studio, about 5 GB of images) | Docker |

`supabase/config.toml` switches off the services LightLink does not use (analytics, storage, edge functions, test mailbox), which saves 3.4 GB of images.

## Migrations

Applied in order from `supabase/migrations/`.

| Migration | Adds |
|---|---|
| `20261014000000_init_phase2` | Zones, profiles, reports, ECG schedules, the `zone_status` view, rate limit (5 reports per 10 minutes), access rules |
| `20261017000000_announcement_checks` | Report kinds *powered* and *unstable*, partial ECG announcements, the `announcement_outcomes` view (how many residents were cut during each announcement) |
| `20261017000100_dated_zone_groups` | Load-shedding groups of each zone, with source and validity period |
| `20261017000200_phase2_live` | Planned or surprise outages, positions checked against the neighbourhood (5 km), re-runnable ECG import |
| `20261020000000_predictions` | Daily forecasts, public and read-only |
| `20261021000000_offline_reports` | Observation time and anti-duplicate id for reports sent after an offline period |
| `20261021000100_retry_rate_limit` | A retried report does not count against the rate limit |
| `20261021000200_simulated_reports` | Simulated demo reports, labelled and reserved to the demo script |
| `20261022000000_energy_sharing` | Offers, requests, private addresses, fixed energy places, abuse reports, `energy_options()` search ([rules](../docs/REGLES_PARTAGE.md)) |
| `20261022000100_notifications` | Phones, followed zones, notification inbox, alerts written by the database and sent with `pg_net` |

`supabase/seed.sql` holds the 10 pilot zones, their dated groups and the real ECG schedules. Its generated sections come from `data/` (`python3 prediction/build_zone_groups.py`, `python3 prediction/import_schedules.py --write-seed`); the CI checks they are up to date.

## Connect a hosted project

Once, by the project owner:

```sh
cd backend
npx supabase login
npx supabase link --project-ref <project-ref>   # asks the database password
npx supabase db push --include-seed             # migrations, zones, groups, ECG schedules
npx supabase config push                        # auth settings, including anonymous sign-ins
```

Then give each app the two **public** values from *Project Settings → API*. Never the secret (`service_role`) key, never the database password.

| App | File (ignored by Git) | Variables |
|---|---|---|
| Web | `web/.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Mobile | `mobile/.env` | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` |

**Daily import.** The *Daily data import* workflow loads the ECG schedules of `data/`, today's and tomorrow's forecasts, and queues the reminders, every morning at 05:00 GMT. It needs the repository secret `SUPABASE_DB_URL` (*Connect → Session pooler*, with the database password).

## Demo data for a presentation

With few real reports the live map is almost empty. Just before presenting:

```sh
npm run demo:on    # 10 reports in Osu, Labone, Dansoman and Madina, observed in the last hour
npm run demo:off   # removes them
```

Simulated reports are labelled *[SIMULÉ]*, shown as *« Données simulées »* by the apps, never count in the measure of ECG announcements, trigger no alert, and leave the map by themselves after 2 hours. App users cannot create them.

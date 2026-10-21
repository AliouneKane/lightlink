-- LightLink: daily outage forecasts written by prediction/predict.py (rules model, real ECG data).
-- Everyone can read them; only the import job (database owner) writes them.

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  zone_id text not null references public.zones (id) on delete cascade,
  generated_at timestamptz not null default now(),
  window_start timestamptz not null,
  window_end timestamptz not null,
  probability integer not null check (probability between 0 and 100),
  confidence integer not null check (confidence between 0 and 100),
  expected_duration_min integer not null check (expected_duration_min >= 0),
  -- Risk in % at 06, 08, 10, 12, 14, 16, 17, 18, 19, 20, 21 and 23 h (GMT), as drawn by the apps.
  hourly_risks jsonb not null default '[]'::jsonb,
  -- What the forecast rests on: "annonce ECG" or "taux de base" (+ " + délestage").
  basis text not null default '',
  method text not null check (method in ('rules', 'random_forest', 'xgboost', 'ensemble')),
  model_version text not null,
  check (window_end > window_start)
);

create index predictions_zone_day on public.predictions (zone_id, window_start desc);

alter table public.predictions enable row level security;
create policy "Predictions are public" on public.predictions for select using (true);

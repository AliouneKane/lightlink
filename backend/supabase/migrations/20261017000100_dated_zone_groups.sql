-- LightLink: load-shedding groups of each pilot zone, dated by source.
-- The ECG assigns groups by electrical feeder, not by neighbourhood: one zone can sit in several
-- groups, and groups change from one load-shedding plan to the next (Adabraka: A, B and D in 2023,
-- A in 2026). Every membership therefore carries its source and validity period.
-- Data: generated from data/ by prediction/build_zone_groups.py (see seed.sql).

create table public.ecg_groups (
  id text primary key check (id in ('A', 'B', 'C', 'D')),
  label text not null
);

create table public.zone_groups (
  zone_id text not null references public.zones (id),
  group_id text not null references public.ecg_groups (id),
  -- True when no locality of this group designates the whole zone (sub-locality or "Parts of").
  is_partial boolean not null,
  source text not null,
  valid_from date not null,
  valid_to date not null check (valid_to >= valid_from),
  primary key (zone_id, group_id, source)
);
create index zone_groups_validity_idx on public.zone_groups (valid_from, valid_to);

alter table public.ecg_groups enable row level security;
alter table public.zone_groups enable row level security;
create policy "groups are public" on public.ecg_groups for select using (true);
create policy "zone groups are public" on public.zone_groups for select using (true);

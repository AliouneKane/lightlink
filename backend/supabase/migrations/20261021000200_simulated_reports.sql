-- LightLink: simulated reports for demos (task 69), always labelled and removable.
-- Only the database owner (backend/scripts/demo-data.mjs) can write them; an app user cannot.
-- They count on the live map (labelled "Données simulées" by the apps) but never in the
-- measure of ECG announcement reliability.

alter table public.outage_reports
  add column simulated boolean not null default false,
  alter column user_id drop not null,
  add constraint outage_reports_user_or_simulated check (user_id is not null or simulated);

create function public.forbid_simulated_from_users()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.simulated and (select auth.uid()) is not null then
    raise exception 'Simulated reports are reserved to the demo script' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger outage_reports_simulated_check
  before insert or update on public.outage_reports
  for each row execute function public.forbid_simulated_from_users();

-- The rate limit and the position check concern residents, not the demo script.
create or replace function public.limit_report_rate()
returns trigger
language plpgsql
as $$
begin
  if new.simulated then
    return new;
  end if;
  if new.client_id is not null and exists (
    select 1 from public.outage_reports where client_id = new.client_id
  ) then
    return new;
  end if;
  if (
    select count(*) from public.outage_reports
    where user_id = new.user_id and created_at > now() - interval '10 minutes'
  ) >= 5 then
    raise exception 'Too many reports, try again later' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- zone_status: same columns, plus how many of the counted reports are simulated.
create or replace view public.zone_status with (security_invoker = true) as
with live as (
  select
    z.id as zone_id,
    z.name,
    z.lat,
    z.lng,
    count(r.id) filter (where r.kind = 'outage') as outage_reports,
    count(r.id) filter (where r.kind = 'restored') as restored_reports,
    max(r.observed_at) as last_report_at,
    count(r.id) filter (where r.kind = 'powered') as powered_reports,
    count(r.id) filter (where r.simulated) as simulated_reports
  from public.zones z
  left join public.outage_reports r
    on r.zone_id = z.id and r.observed_at > now() - interval '2 hours'
  group by z.id
),
planned as (
  select zone_id, max(ends_at) as planned_until
  from public.ecg_schedules
  where now() >= starts_at and now() < ends_at
  group by zone_id
)
select
  l.zone_id,
  l.name,
  l.lat,
  l.lng,
  l.outage_reports,
  l.restored_reports,
  l.last_report_at,
  case
    when l.outage_reports >= 3 and l.outage_reports > l.restored_reports + l.powered_reports
      then 'confirmed_outage'
    when l.outage_reports > l.restored_reports + l.powered_reports
      then 'probable_outage'
    else 'powered'
  end as status,
  l.powered_reports,
  p.planned_until is not null as planned_now,
  p.planned_until,
  case
    when l.outage_reports <= l.restored_reports + l.powered_reports then null
    when p.planned_until is not null then 'planned'
    else 'surprise'
  end as outage_origin,
  l.simulated_reports
from live l
left join planned p on p.zone_id = l.zone_id;

-- Residents' answers only: a simulated report never measures an ECG announcement.
create or replace view public.announcement_outcomes with (security_invoker = true) as
with answers as (
  select distinct on (s.id, r.user_id)
    s.id as schedule_id,
    r.kind
  from public.ecg_schedules s
  join public.outage_reports r
    on r.zone_id = s.zone_id
    and r.observed_at >= s.starts_at
    and r.observed_at < s.ends_at
    and r.kind in ('outage', 'powered')
    and not r.simulated
  order by s.id, r.user_id, r.observed_at desc
)
select
  s.id as schedule_id,
  s.zone_id,
  s.starts_at,
  s.ends_at,
  s.kind,
  s.partial,
  count(a.kind) filter (where a.kind = 'outage') as residents_cut,
  count(a.kind) filter (where a.kind = 'powered') as residents_powered,
  s.ends_at <= now() as finished
from public.ecg_schedules s
left join answers a on a.schedule_id = s.id
group by s.id;

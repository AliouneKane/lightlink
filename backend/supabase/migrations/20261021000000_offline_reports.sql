-- LightLink: reports sent after an offline period keep the time they were observed,
-- and a report retried after a lost network answer is stored once.

-- observed_at: when the resident saw the outage. created_at stays the reception time,
-- used by the rate limit so nobody escapes it by backdating.
-- client_id: chosen by the phone when the report is queued, the same on every retry.
alter table public.outage_reports
  add column observed_at timestamptz,
  add column client_id uuid unique;
update public.outage_reports set observed_at = created_at;

-- An observation cannot be in the future nor older than the 24 h a phone may stay offline.
-- Without a value, the report was observed when received.
create function public.check_report_observed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.observed_at := coalesce(new.observed_at, new.created_at);
  if new.observed_at > new.created_at + interval '5 minutes' then
    raise exception 'Observation time is in the future' using errcode = 'P0001';
  end if;
  if new.observed_at < new.created_at - interval '24 hours' then
    raise exception 'Observation older than 24 hours' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger outage_reports_observed_at_check
  before insert on public.outage_reports
  for each row execute function public.check_report_observed_at();
alter table public.outage_reports alter column observed_at set not null;
create index outage_reports_zone_observed_idx on public.outage_reports (zone_id, observed_at desc);

-- Neighbourhood state: reports observed in the last 2 hours (same columns as before).
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
    count(r.id) filter (where r.kind = 'powered') as powered_reports
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
  end as outage_origin
from live l
left join planned p on p.zone_id = l.zone_id;

-- Answers to an announcement: observed during its window, even if sent later.
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

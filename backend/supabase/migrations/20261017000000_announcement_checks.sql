-- LightLink: measure whether official ECG announcements happen.
-- During an announced window the app asks residents of the zone "Avez-vous du courant ?".
-- Their answers are ordinary reports ('powered' or 'outage'), so no new table and the same
-- row level security, rate limit and realtime as every other report.
-- The prediction model reads announcement_outcomes to calibrate two parameters that no public
-- source provides (prediction/README.md): how often announcements are held, and how much of a
-- neighbourhood a partial announcement ("Parts of X") actually cuts.

-- 'powered' and 'unstable' are the statuses the web and mobile apps already offer.
alter table public.outage_reports drop constraint outage_reports_kind_check;
alter table public.outage_reports add constraint outage_reports_kind_check
  check (kind in ('outage', 'restored', 'unstable', 'powered'));

-- Partial = the ECG names only part of the zone ("Parts of Madina", a sub-locality).
-- Kinds aligned with data/: faults and dated load-shedding calendars are announcements too.
alter table public.ecg_schedules add column partial boolean not null default false;
alter table public.ecg_schedules drop constraint ecg_schedules_kind_check;
alter table public.ecg_schedules add constraint ecg_schedules_kind_check
  check (kind in ('planned', 'emergency', 'fault', 'load_shedding'));

-- 'powered' contradicts an outage exactly like 'restored' does.
create or replace view public.zone_status with (security_invoker = true) as
select
  z.id as zone_id,
  z.name,
  z.lat,
  z.lng,
  count(r.id) filter (where r.kind = 'outage') as outage_reports,
  count(r.id) filter (where r.kind = 'restored') as restored_reports,
  max(r.created_at) as last_report_at,
  case
    when count(r.id) filter (where r.kind = 'outage') >= 3
      and count(r.id) filter (where r.kind = 'outage') > count(r.id) filter (where r.kind in ('restored', 'powered'))
      then 'confirmed_outage'
    when count(r.id) filter (where r.kind = 'outage') > count(r.id) filter (where r.kind in ('restored', 'powered'))
      then 'probable_outage'
    else 'powered'
  end as status,
  count(r.id) filter (where r.kind = 'powered') as powered_reports
from public.zones z
left join public.outage_reports r
  on r.zone_id = z.id and r.created_at > now() - interval '2 hours'
group by z.id;

-- One line per announcement: how many residents were cut or had power during the window.
-- Each resident counts once, with their latest answer. Only counts leave the view, never who answered.
create view public.announcement_outcomes with (security_invoker = true) as
with answers as (
  select distinct on (s.id, r.user_id)
    s.id as schedule_id,
    r.kind
  from public.ecg_schedules s
  join public.outage_reports r
    on r.zone_id = s.zone_id
    and r.created_at >= s.starts_at
    and r.created_at < s.ends_at
    and r.kind in ('outage', 'powered')
  order by s.id, r.user_id, r.created_at desc
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

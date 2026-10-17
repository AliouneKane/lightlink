-- LightLink phase 2: planned or surprise outages, checked report positions, ECG schedule import.

-- Distance between two points on Earth, in kilometres (haversine).
create function public.distance_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select 2 * 6371 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ))
$$;

-- Task 53: a report with a position must come from the reported neighbourhood.
-- 5 km from the zone centre covers the largest pilot neighbourhood plus phone GPS error.
-- The position stays optional and is never shown to other users (only the zone centre is).
create function public.check_report_position()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  zone public.zones%rowtype;
begin
  if (new.lat is null) <> (new.lng is null) then
    raise exception 'Position incomplete: give both latitude and longitude, or neither' using errcode = 'P0001';
  end if;
  if new.lat is not null then
    select * into zone from public.zones where id = new.zone_id;
    if public.distance_km(new.lat, new.lng, zone.lat, zone.lng) > 5 then
      raise exception 'Position too far from the reported neighbourhood' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
create trigger outage_reports_position_check
  before insert on public.outage_reports
  for each row execute function public.check_report_position();

-- Tasks 65-66: the import script can be re-run every day without duplicates.
alter table public.ecg_schedules add column localities text not null default '';
alter table public.ecg_schedules
  add constraint ecg_schedules_unique_window unique (zone_id, starts_at, ends_at, kind);

-- Task 68: is an ECG schedule running now, and was a reported outage planned or a surprise?
create or replace view public.zone_status with (security_invoker = true) as
with live as (
  select
    z.id as zone_id,
    z.name,
    z.lat,
    z.lng,
    count(r.id) filter (where r.kind = 'outage') as outage_reports,
    count(r.id) filter (where r.kind = 'restored') as restored_reports,
    max(r.created_at) as last_report_at,
    count(r.id) filter (where r.kind = 'powered') as powered_reports
  from public.zones z
  left join public.outage_reports r
    on r.zone_id = z.id and r.created_at > now() - interval '2 hours'
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

-- LightLink: two defects found by PAN in the review of #10.
-- 1. The rate limit (5 reports in 10 minutes) and the live map count reports by created_at,
--    which an app user could set to a past date. The database now sets it for the API roles.
--    The owner (import, demo and test scripts) keeps control of it.
-- 2. "reports are public" let anyone, without an account, read the GPS position of a report.
--    The position only serves to check that the resident is in the neighbourhood (task 53):
--    it is checked, then not kept. Positions stored before are erased.

create function public.set_report_server_time()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.created_at := now();
  end if;
  return new;
end;
$$;
-- Before insert triggers run in name order: this one comes before the observation time
-- check and the rate limit, which both read created_at.
create trigger outage_reports_created_at
  before insert on public.outage_reports
  for each row execute function public.set_report_server_time();

create or replace function public.check_report_position()
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
  -- Checked, not kept: the table is public and the position is never shown.
  new.lat := null;
  new.lng := null;
  return new;
end;
$$;

update public.outage_reports set lat = null, lng = null where lat is not null or lng is not null;

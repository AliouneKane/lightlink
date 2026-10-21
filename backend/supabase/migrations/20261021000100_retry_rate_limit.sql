-- LightLink: the retry of a report already stored is not a new report.
-- BEFORE INSERT triggers run before ON CONFLICT detects the duplicate, so the rate limit
-- refused the retry of a 5th report with "Too many reports" (PAN's review of #6).
-- A known client_id skips the limit; the insert then does nothing.
create or replace function public.limit_report_rate()
returns trigger
language plpgsql
as $$
begin
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

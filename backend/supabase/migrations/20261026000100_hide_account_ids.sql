-- LightLink: account ids are no longer readable through the public API (found after the
-- review of #10). Offers are public with the host's name and account id (host_id), and
-- reports with the reporter's account id (user_id): anyone, without an account, could
-- link a named host to every report of the same phone (neighbourhoods, hours).
-- The API roles now read every column except these two. The database keeps using them
-- (rate limit, answers to announcements, own offer checks) with the owner's rights.

revoke select on public.outage_reports from anon, authenticated;
grant select (id, zone_id, kind, description, lat, lng, created_at, observed_at, client_id, simulated)
  on public.outage_reports to anon, authenticated;

revoke select on public.offers from anon, authenticated;
grant select (id, zone_id, host_name, title, source, capacity, price, slots, description, status,
  starts_at, ends_at, created_at)
  on public.offers to anon, authenticated;

-- Triggers that read the hidden columns of other rows.
alter function public.limit_report_rate() security definer set search_path = '';
alter function public.check_offer_request() security definer;

-- Rules that check "is this offer mine?" read host_id through this function, since the
-- querying resident may no longer read the column.
create function public.is_offer_host(offer uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.offers where id = offer and host_id = (select auth.uid()))
$$;

drop policy "hosts write their offer details" on public.offer_private_details;
create policy "hosts write their offer details" on public.offer_private_details
  for all to authenticated
  using ((select public.is_offer_host(offer_id)))
  with check ((select public.is_offer_host(offer_id)));

drop policy "requesters and hosts read requests" on public.offer_requests;
create policy "requesters and hosts read requests" on public.offer_requests
  for select to authenticated
  using (requester_id = (select auth.uid()) or (select public.is_offer_host(offer_id)));

-- Counts each resident once per announcement; it only publishes totals per announcement.
alter view public.announcement_outcomes set (security_invoker = false);

-- The apps need to know which offers are mine, not who hosts the others.
create function public.my_offers()
returns setof public.offers
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.offers where host_id = (select auth.uid())
$$;
revoke execute on function public.my_offers() from public, anon;
grant execute on function public.my_offers() to authenticated;

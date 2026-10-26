-- LightLink phase 3: energy sharing (tasks 78 to 82, 89 to 92).
--
-- Sharing rules (task 78, see docs/REGLES_PARTAGE.md):
--   * an offer is "available", then "full" when every place is taken, then "closed";
--   * it lasts at most 12 hours and disappears from searches once ended;
--   * searches look 10 km around the resident's neighbourhood (25 km when the whole
--     neighbourhood is cut, with fixed energy places added: task 91);
--   * a resident cannot request their own offer, keeps one request per offer, and at most
--     3 pending requests at a time;
--   * a request goes pending -> accepted or refused (host), accepted -> finished (host or
--     requester), pending or accepted -> cancelled (requester).
-- Privacy (task 89): offers only show the neighbourhood centre; the exact place is in
-- offer_private_details, readable by the host and by requesters once accepted.

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  zone_id text not null references public.zones (id),
  -- First name shown on the offer (profiles stay private).
  host_name text not null default 'Voisin' check (char_length(trim(host_name)) between 1 and 50),
  title text not null check (char_length(trim(title)) between 3 and 100),
  source text not null check (source in ('solar', 'generator', 'battery')),
  capacity text not null check (char_length(trim(capacity)) between 1 and 100),
  -- Suggested contribution in GHS (task 88). LightLink collects no payment.
  price numeric(7, 2) not null default 0 check (price between 0 and 1000),
  slots integer not null check (slots between 1 and 50),
  description text not null default '' check (char_length(description) <= 600),
  status text not null default 'available' check (status in ('available', 'full', 'closed')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at and ends_at <= starts_at + interval '12 hours')
);
create index offers_open_idx on public.offers (zone_id) where status <> 'closed';

create table public.offer_private_details (
  offer_id uuid primary key references public.offers (id) on delete cascade,
  address text not null check (char_length(trim(address)) between 3 and 200)
);

create table public.offer_requests (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete cascade,
  requester_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'refused', 'cancelled', 'finished')),
  message text not null default '' check (char_length(message) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (offer_id, requester_id)
);
create index offer_requests_requester_idx on public.offer_requests (requester_id, status);

-- Fixed places where residents can charge or find power (task 92), filled by the team.
create table public.energy_places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('charging_hub', 'solar_hub', 'fuel_station', 'public_place')),
  zone_id text not null references public.zones (id),
  lat double precision not null,
  lng double precision not null,
  opening_hours text not null default '',
  source_url text not null,
  verified_at date not null
);

-- Abuse reports (task 90): residents can file them, only the team reads them.
create table public.abuse_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  offer_id uuid references public.offers (id) on delete cascade,
  report_id uuid references public.outage_reports (id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 3 and 500),
  created_at timestamptz not null default now(),
  check ((offer_id is null) <> (report_id is null))
);

-- Row level security ---------------------------------------------------------------------
alter table public.offers enable row level security;
alter table public.offer_private_details enable row level security;
alter table public.offer_requests enable row level security;
alter table public.energy_places enable row level security;
alter table public.abuse_reports enable row level security;

create policy "open offers are public" on public.offers for select using (true);
create policy "hosts create their offers" on public.offers
  for insert to authenticated with check (host_id = (select auth.uid()));
create policy "hosts update their offers" on public.offers
  for update to authenticated using (host_id = (select auth.uid()))
  with check (host_id = (select auth.uid()));

create policy "hosts write their offer details" on public.offer_private_details
  for all to authenticated
  using (exists (select 1 from public.offers o where o.id = offer_id and o.host_id = (select auth.uid())))
  with check (exists (select 1 from public.offers o where o.id = offer_id and o.host_id = (select auth.uid())));
create policy "accepted requesters read the exact place" on public.offer_private_details
  for select to authenticated
  using (exists (
    select 1 from public.offer_requests r
    where r.offer_id = offer_private_details.offer_id
      and r.requester_id = (select auth.uid())
      and r.status in ('accepted', 'finished')
  ));

create policy "requesters and hosts read requests" on public.offer_requests
  for select to authenticated
  using (
    requester_id = (select auth.uid())
    or exists (select 1 from public.offers o where o.id = offer_id and o.host_id = (select auth.uid()))
  );
create policy "residents request offers" on public.offer_requests
  for insert to authenticated
  with check (requester_id = (select auth.uid()) and status = 'pending');
-- Status changes go through set_request_status(), which checks who may do what.

create policy "energy places are public" on public.energy_places for select using (true);
create policy "residents report abuse" on public.abuse_reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));

-- Rules on requests -----------------------------------------------------------------------
create function public.check_offer_request()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  offer public.offers%rowtype;
begin
  select * into offer from public.offers where id = new.offer_id;
  if offer.host_id = new.requester_id then
    raise exception 'You cannot request your own offer' using errcode = 'P0001';
  end if;
  if offer.status <> 'available' or offer.ends_at <= now() then
    raise exception 'This offer is no longer available' using errcode = 'P0001';
  end if;
  if (
    select count(*) from public.offer_requests
    where requester_id = new.requester_id and status = 'pending'
  ) >= 3 then
    raise exception 'Too many pending requests' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger offer_requests_check
  before insert on public.offer_requests
  for each row execute function public.check_offer_request();

-- Who may move a request to which status. Returns the new status.
create function public.set_request_status(request_id uuid, new_status text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.offer_requests%rowtype;
  host uuid;
  me uuid := auth.uid();
  allowed boolean;
begin
  select * into request from public.offer_requests where id = request_id for update;
  if not found then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;
  select host_id into host from public.offers where id = request.offer_id;
  allowed := case
    when me = host then
      (request.status = 'pending' and new_status in ('accepted', 'refused'))
      or (request.status = 'accepted' and new_status = 'finished')
    when me = request.requester_id then
      (request.status in ('pending', 'accepted') and new_status = 'cancelled')
      or (request.status = 'accepted' and new_status = 'finished')
    else false
  end;
  if not coalesce(allowed, false) then
    raise exception 'This change is not allowed' using errcode = 'P0001';
  end if;
  if new_status = 'accepted' and (
    select count(*) from public.offer_requests
    where offer_id = request.offer_id and status = 'accepted'
  ) >= (select slots from public.offers where id = request.offer_id) then
    raise exception 'Every place is already taken' using errcode = 'P0001';
  end if;
  update public.offer_requests set status = new_status, updated_at = now() where id = request_id;
  return new_status;
end;
$$;
revoke all on function public.set_request_status(uuid, text) from public;
grant execute on function public.set_request_status(uuid, text) to authenticated;

-- An offer is "full" while every place is taken, "available" again when one frees up.
create function public.sync_offer_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  taken integer;
begin
  select count(*) into taken from public.offer_requests
  where offer_id = new.offer_id and status = 'accepted';
  update public.offers
  set status = case when taken >= slots then 'full' else 'available' end
  where id = new.offer_id and status <> 'closed';
  return new;
end;
$$;
create trigger offer_requests_sync_offer
  after insert or update of status on public.offer_requests
  for each row execute function public.sync_offer_status();

-- Searching (tasks 81 and 91) ----------------------------------------------------------------
-- Open offers around a neighbourhood, nearest first. When the whole neighbourhood is cut
-- (confirmed outage), the radius grows to 25 km and fixed energy places are added.
create function public.energy_options(origin_zone text, max_km double precision default 10)
returns table (
  kind text,
  id uuid,
  title text,
  source text,
  zone_id text,
  lat double precision,
  lng double precision,
  distance_km double precision,
  price numeric,
  places_left integer,
  ends_at timestamptz
)
language sql
stable
-- Counts accepted requests, which residents cannot read: only the number leaves the function.
security definer
set search_path = ''
as $$
  with origin as (
    select z.lat, z.lng,
      coalesce((select s.status = 'confirmed_outage' from public.zone_status s where s.zone_id = z.id), false) as cut
    from public.zones z where z.id = origin_zone
  ),
  radius as (
    select case when cut then greatest(max_km, 25) else max_km end as km from origin
  ),
  offers as (
    select 'offer'::text, o.id, o.title, o.source, o.zone_id, z.lat, z.lng,
      public.distance_km(origin.lat, origin.lng, z.lat, z.lng),
      o.price,
      o.slots - (select count(*)::integer from public.offer_requests r
                 where r.offer_id = o.id and r.status = 'accepted'),
      o.ends_at
    from public.offers o
    join public.zones z on z.id = o.zone_id, origin
    where o.status = 'available' and o.ends_at > now()
  ),
  places as (
    select 'place'::text, p.id, p.name, p.kind, p.zone_id, p.lat, p.lng,
      public.distance_km(origin.lat, origin.lng, p.lat, p.lng),
      null::numeric, null::integer, null::timestamptz
    from public.energy_places p, origin
    where origin.cut
  )
  select * from (select * from offers union all select * from places) options
  where options.distance_km <= (select km from radius)
  order by options.distance_km, options.price nulls last
$$;

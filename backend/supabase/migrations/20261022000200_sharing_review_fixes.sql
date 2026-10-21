-- LightLink: PAN's review of the phase 3 pull request (#9).

-- Point 4: an offer and its private address are created together or not at all.
-- Runs with the caller's rights: the row level security of offers and details applies.
create function public.create_offer(
  p_zone_id text,
  p_host_name text,
  p_title text,
  p_source text,
  p_capacity text,
  p_price numeric,
  p_slots integer,
  p_description text,
  p_ends_at timestamptz,
  p_address text default null
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created uuid;
begin
  insert into public.offers (zone_id, host_name, title, source, capacity, price, slots, description, ends_at)
  values (p_zone_id, coalesce(nullif(trim(p_host_name), ''), 'Voisin'), p_title, p_source, p_capacity,
          p_price, p_slots, coalesce(p_description, ''), p_ends_at)
  returning id into created;
  if nullif(trim(coalesce(p_address, '')), '') is not null then
    insert into public.offer_private_details (offer_id, address) values (created, trim(p_address));
  end if;
  return created; -- any error above rolls back both inserts
end;
$$;
revoke all on function public.create_offer(text, text, text, text, text, numeric, integer, text, timestamptz, text) from public, anon;
grant execute on function public.create_offer(text, text, text, text, text, numeric, integer, text, timestamptz, text) to authenticated;

-- Point 6: a request cannot be accepted once its offer is closed or ended (the exact
-- address would otherwise be revealed for an offer that no longer exists).
create or replace function public.set_request_status(request_id uuid, new_status text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.offer_requests%rowtype;
  offer public.offers%rowtype;
  me uuid := auth.uid();
  allowed boolean;
begin
  select * into request from public.offer_requests where id = request_id for update;
  if not found then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;
  select * into offer from public.offers where id = request.offer_id;
  allowed := case
    when me = offer.host_id then
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
  if new_status = 'accepted' and (offer.status = 'closed' or offer.ends_at <= now()) then
    raise exception 'This offer is no longer available' using errcode = 'P0001';
  end if;
  if new_status = 'accepted' and (
    select count(*) from public.offer_requests
    where offer_id = request.offer_id and status = 'accepted'
  ) >= offer.slots then
    raise exception 'Every place is already taken' using errcode = 'P0001';
  end if;
  update public.offer_requests set status = new_status, updated_at = now() where id = request_id;
  return new_status;
end;
$$;

-- Point 9: an outage alert counts residents' reports only. Simulated reports (demo) are
-- left out of the threshold and of the number announced.
create or replace function public.notify_zone_outage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cut integer;
  fine integer;
  zone_name text;
  planned boolean;
  follower uuid;
begin
  if new.kind <> 'outage' or new.simulated then
    return new;
  end if;
  select
    count(*) filter (where kind = 'outage'),
    count(*) filter (where kind in ('restored', 'powered'))
  into cut, fine
  from public.outage_reports
  where zone_id = new.zone_id and not simulated and observed_at > now() - interval '2 hours';
  if cut < 3 or cut <= fine then
    return new;
  end if;
  select name into zone_name from public.zones where id = new.zone_id;
  planned := exists (
    select 1 from public.ecg_schedules
    where zone_id = new.zone_id and now() >= starts_at and now() < ends_at
  );
  for follower in select public.zone_followers(new.zone_id) loop
    perform public.notify(
      follower, 'outage_in_zone', new.zone_id,
      'Coupure à ' || zone_name,
      case when planned
        then 'Coupure annoncée par l’ECG, confirmée par les habitants.'
        else 'Coupure non annoncée, confirmée par ' || cut || ' habitants.' end,
      jsonb_build_object('screen', 'carte'),
      -- one alert per zone and per 2-hour slot
      'outage:' || new.zone_id || ':' || floor(extract(epoch from now()) / 7200)::bigint
    );
  end loop;
  return new;
end;
$$;

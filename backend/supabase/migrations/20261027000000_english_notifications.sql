-- LightLink: notifications in English. The apps are in English for residents of Accra; the
-- alerts written by the database follow. Same rules as before (migrations of 22 October),
-- only the texts change. Alerts already sent keep their French text.
-- The "screen" values ('carte', 'partage', 'previsions') are mobile route names, unchanged.

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
      'Outage in ' || zone_name,
      case when planned
        then 'Outage announced by the ECG, confirmed by residents.'
        else 'Unannounced outage, confirmed by ' || cut || ' residents.' end,
      jsonb_build_object('screen', 'carte'),
      -- one alert per zone and per 2-hour slot
      'outage:' || new.zone_id || ':' || floor(extract(epoch from now()) / 7200)::bigint
    );
  end loop;
  return new;
end;
$$;

create or replace function public.notify_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  offer public.offers%rowtype;
begin
  select * into offer from public.offers where id = new.offer_id;
  if tg_op = 'INSERT' then
    perform public.notify(
      offer.host_id, 'request_received', offer.zone_id,
      'New energy request', 'Someone is asking for a place at “' || offer.title || '”.',
      jsonb_build_object('screen', 'partage', 'offer', offer.id, 'request', new.id),
      'request:' || new.id || ':received'
    );
  elsif new.status in ('accepted', 'refused') and new.status <> old.status then
    perform public.notify(
      new.requester_id, 'request_answered', offer.zone_id,
      case when new.status = 'accepted' then 'Request accepted' else 'Request declined' end,
      case when new.status = 'accepted'
        then 'Your place at “' || offer.title || '” is confirmed. The address is shown in the offer.'
        else 'The host of “' || offer.title || '” could not accept your request.' end,
      jsonb_build_object('screen', 'partage', 'offer', offer.id, 'request', new.id),
      'request:' || new.id || ':' || new.status
    );
  end if;
  return new;
end;
$$;

create or replace function public.queue_daily_notifications()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  item record;
  follower uuid;
  queued integer := 0;
begin
  for item in
    select s.id, s.zone_id, s.starts_at, s.ends_at, s.partial, z.name
    from public.ecg_schedules s join public.zones z on z.id = s.zone_id
    where s.starts_at > now() and s.starts_at <= now() + interval '24 hours'
  loop
    for follower in select public.zone_followers(item.zone_id) loop
      perform public.notify(
        follower, 'ecg_reminder', item.zone_id,
        'ECG outage announced in ' || item.name,
        case when item.partial then 'Part of the neighbourhood' else 'The neighbourhood' end
          || ' will be cut from ' || to_char(item.starts_at, 'HH24:MI') || ' to ' || to_char(item.ends_at, 'HH24:MI')
          || ' (Ghana time). Charge your devices before.',
        jsonb_build_object('screen', 'previsions'),
        'ecg:' || item.id
      );
      queued := queued + 1;
    end loop;
  end loop;
  for item in
    select distinct on (p.zone_id) p.zone_id, p.probability, p.window_start, p.window_end, z.name
    from public.predictions p join public.zones z on z.id = p.zone_id
    where p.window_start >= date_trunc('day', now()) + interval '1 day'
      and p.window_start < date_trunc('day', now()) + interval '2 days'
      and p.probability >= 50
    order by p.zone_id, p.generated_at desc
  loop
    for follower in select public.zone_followers(item.zone_id) loop
      perform public.notify(
        follower, 'prediction', item.zone_id,
        'Likely outage tomorrow in ' || item.name,
        item.probability || '% risk between ' || to_char(item.window_start, 'HH24:MI')
          || ' and ' || to_char(item.window_end, 'HH24:MI') || '. This is an estimate, not a certainty.',
        jsonb_build_object('screen', 'previsions'),
        'prediction:' || item.zone_id || ':' || to_char(item.window_start, 'YYYY-MM-DD')
      );
      queued := queued + 1;
    end loop;
  end loop;
  return queued;
end;
$$;
revoke all on function public.queue_daily_notifications() from public, anon, authenticated;

-- LightLink phase 3: notifications (tasks 93 to 97, 118).
-- The database writes each notification in public.notifications (the in-app inbox, also
-- used when a resident refuses push notifications: task 98) and, on the hosted project,
-- sends it right away to the Expo push service (which uses Firebase Cloud Messaging for
-- Android) through the pg_net extension.

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
  end if;
end;
$$;

-- Task 94: the phones of each resident, and the neighbourhoods they follow.
create table public.push_tokens (
  token text primary key check (token like 'ExponentPushToken[%]' or token like 'ExpoPushToken[%]'),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  platform text not null check (platform in ('android', 'ios', 'web')),
  created_at timestamptz not null default now()
);
create table public.zone_follows (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  zone_id text not null references public.zones (id),
  primary key (user_id, zone_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('outage_in_zone', 'ecg_reminder', 'prediction', 'request_received', 'request_answered')),
  zone_id text references public.zones (id),
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  -- Avoids sending the same alert twice (e.g. one ECG schedule, one reminder).
  dedupe_key text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (user_id, dedupe_key)
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.push_tokens enable row level security;
alter table public.zone_follows enable row level security;
alter table public.notifications enable row level security;
create policy "residents manage their phones" on public.push_tokens
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "residents manage their followed zones" on public.zone_follows
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "residents read their notifications" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "residents mark their notifications read" on public.notifications
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Who follows a zone: explicit follows plus the neighbourhood chosen in the profile.
create function public.zone_followers(zone text)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select user_id from public.zone_follows where zone_id = zone
  union
  select id from public.profiles where zone_id = zone
$$;
revoke all on function public.zone_followers(text) from public, anon, authenticated;

create function public.notify(
  target uuid, kind text, zone text, title text, body text, data jsonb default '{}'::jsonb, dedupe text default null
) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, kind, zone_id, title, body, data, dedupe_key)
  values (target, kind, zone, title, body, data, dedupe)
  on conflict (user_id, dedupe_key) do nothing
$$;
revoke all on function public.notify(uuid, text, text, text, text, jsonb, text) from public, anon, authenticated;

-- Sending: one HTTP call to the Expo push service per phone, when pg_net is available.
create function public.send_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  phone record;
begin
  if to_regnamespace('net') is null then
    return new; -- local tests and projects without pg_net: the inbox still works
  end if;
  for phone in select token from public.push_tokens where user_id = new.user_id loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
      body := jsonb_build_object(
        'to', phone.token, 'title', new.title, 'body', new.body, 'sound', 'default',
        'data', new.data || jsonb_build_object('kind', new.kind, 'zone', new.zone_id)
      )
    );
  end loop;
  return new;
end;
$$;
create trigger notifications_send
  after insert on public.notifications
  for each row execute function public.send_push();

-- Task 95: the neighbourhood just became a confirmed outage (once per 2 hours).
create function public.notify_zone_outage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  zone record;
  follower uuid;
begin
  if new.kind <> 'outage' or new.simulated then
    return new;
  end if;
  select * into zone from public.zone_status where zone_id = new.zone_id;
  if zone.status <> 'confirmed_outage' then
    return new;
  end if;
  for follower in select public.zone_followers(new.zone_id) loop
    perform public.notify(
      follower, 'outage_in_zone', new.zone_id,
      'Coupure à ' || zone.name,
      case when zone.outage_origin = 'planned'
        then 'Coupure annoncée par l’ECG, confirmée par les habitants.'
        else 'Coupure non annoncée, confirmée par ' || zone.outage_reports || ' habitants.' end,
      jsonb_build_object('screen', 'carte'),
      -- one alert per zone and per 2-hour slot
      'outage:' || new.zone_id || ':' || floor(extract(epoch from now()) / 7200)::bigint
    );
  end loop;
  return new;
end;
$$;
create trigger outage_reports_notify
  after insert on public.outage_reports
  for each row execute function public.notify_zone_outage();

-- Task 97: a request was received, accepted or refused.
create function public.notify_request()
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
      'Nouvelle demande d’énergie', 'Quelqu’un demande une place pour « ' || offer.title || ' ».',
      jsonb_build_object('screen', 'partage', 'offer', offer.id, 'request', new.id),
      'request:' || new.id || ':received'
    );
  elsif new.status in ('accepted', 'refused') and new.status <> old.status then
    perform public.notify(
      new.requester_id, 'request_answered', offer.zone_id,
      case when new.status = 'accepted' then 'Demande acceptée' else 'Demande refusée' end,
      case when new.status = 'accepted'
        then 'Votre place pour « ' || offer.title || ' » est confirmée. L’adresse est visible dans l’offre.'
        else 'L’hôte de « ' || offer.title || ' » n’a pas pu accepter votre demande.' end,
      jsonb_build_object('screen', 'partage', 'offer', offer.id, 'request', new.id),
      'request:' || new.id || ':' || new.status
    );
  end if;
  return new;
end;
$$;
create trigger offer_requests_notify
  after insert or update of status on public.offer_requests
  for each row execute function public.notify_request();

-- Tasks 96 and 118: reminders run by the daily import (.github/workflows/daily-data.yml).
-- ECG outages starting in the next 24 hours, and tomorrow's forecasts of 50 % or more.
create function public.queue_daily_notifications()
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
        'Coupure ECG annoncée à ' || item.name,
        case when item.partial then 'Une partie du quartier' else 'Le quartier' end
          || ' sera coupé de ' || to_char(item.starts_at, 'HH24:MI') || ' à ' || to_char(item.ends_at, 'HH24:MI')
          || ' (heure du Ghana). Rechargez vos appareils avant.',
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
        'Coupure probable demain à ' || item.name,
        'Risque de ' || item.probability || ' % entre ' || to_char(item.window_start, 'HH24:MI')
          || ' et ' || to_char(item.window_end, 'HH24:MI') || '. C’est une estimation, pas une certitude.',
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

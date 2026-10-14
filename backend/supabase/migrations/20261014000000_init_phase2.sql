-- LightLink phase 2: zones, profiles, outage reports and official ECG schedules.
-- Every table has row level security: users can only write their own rows.

create table public.zones (
  id text primary key,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  zone_id text references public.zones (id),
  created_at timestamptz not null default now()
);

create table public.outage_reports (
  id uuid primary key default gen_random_uuid(),
  zone_id text not null references public.zones (id),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  kind text not null check (kind in ('outage', 'restored')),
  description text not null default '' check (char_length(description) <= 280),
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);
create index outage_reports_zone_created_idx on public.outage_reports (zone_id, created_at desc);
create index outage_reports_user_created_idx on public.outage_reports (user_id, created_at desc);

create table public.ecg_schedules (
  id uuid primary key default gen_random_uuid(),
  zone_id text not null references public.zones (id),
  group_name text,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  kind text not null default 'planned' check (kind in ('planned', 'emergency')),
  source_url text,
  created_at timestamptz not null default now()
);
create index ecg_schedules_zone_start_idx on public.ecg_schedules (zone_id, starts_at);

-- Create a profile automatically at sign-up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Anti-abuse (task 53): at most 5 reports per user per 10 minutes.
create function public.limit_report_rate()
returns trigger
language plpgsql
as $$
begin
  if (
    select count(*) from public.outage_reports
    where user_id = new.user_id and created_at > now() - interval '10 minutes'
  ) >= 5 then
    raise exception 'Too many reports, try again later' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger outage_reports_rate_limit
  before insert on public.outage_reports
  for each row execute function public.limit_report_rate();

-- Zone state from the last 2 hours of reports (task 59).
-- 'confirmed_outage' needs 3 or more outage reports and more outage than restored.
create view public.zone_status with (security_invoker = true) as
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
      and count(r.id) filter (where r.kind = 'outage') > count(r.id) filter (where r.kind = 'restored')
      then 'confirmed_outage'
    when count(r.id) filter (where r.kind = 'outage') > count(r.id) filter (where r.kind = 'restored')
      then 'probable_outage'
    else 'powered'
  end as status
from public.zones z
left join public.outage_reports r
  on r.zone_id = z.id and r.created_at > now() - interval '2 hours'
group by z.id;

alter table public.zones enable row level security;
alter table public.profiles enable row level security;
alter table public.outage_reports enable row level security;
alter table public.ecg_schedules enable row level security;

create policy "zones are public" on public.zones for select using (true);
create policy "schedules are public" on public.ecg_schedules for select using (true);
create policy "reports are public" on public.outage_reports for select using (true);
create policy "users create their own reports" on public.outage_reports
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users read their own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "users update their own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Live map updates (task 60).
alter publication supabase_realtime add table public.outage_reports;

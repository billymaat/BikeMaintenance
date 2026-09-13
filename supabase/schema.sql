-- Bike Maintenance Tracker — schema, RLS policies, and new-user seeding.
-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query).

-- ─────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  unit_preference text not null default 'mi' check (unit_preference in ('mi', 'km')),
  created_at timestamptz not null default now()
);

-- Global template of preset task types, copied into each user's own
-- task_types row when they sign up. Not queried directly by the app.
create table if not exists public.task_type_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_interval_type text not null check (default_interval_type in ('mileage', 'time', 'both')),
  default_interval_miles numeric,
  default_interval_days integer
);

create table if not exists public.task_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  default_interval_type text not null check (default_interval_type in ('mileage', 'time', 'both')),
  default_interval_miles numeric,
  default_interval_days integer,
  is_preset boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.bikes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  bike_type text not null,
  photo_url text,
  current_mileage numeric not null default 0,
  unit_override text check (unit_override in ('mi', 'km')),
  notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  bike_id uuid not null references public.bikes (id) on delete cascade,
  task_type_id uuid not null references public.task_types (id) on delete cascade,
  date_performed date not null,
  mileage_at_service numeric,
  performed_by text not null check (performed_by in ('diy', 'shop')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.reminder_rules (
  id uuid primary key default gen_random_uuid(),
  bike_id uuid not null references public.bikes (id) on delete cascade,
  task_type_id uuid not null references public.task_types (id) on delete cascade,
  interval_miles numeric,
  interval_days integer,
  -- last status the send-reminders Edge Function notified the user about,
  -- so a push only fires again when the status actually changes.
  last_notified_status text,
  created_at timestamptz not null default now(),
  unique (bike_id, task_type_id)
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists maintenance_logs_bike_id_idx on public.maintenance_logs (bike_id);
create index if not exists maintenance_logs_task_type_id_idx on public.maintenance_logs (task_type_id);
create index if not exists reminder_rules_bike_id_idx on public.reminder_rules (bike_id);
create index if not exists bikes_user_id_idx on public.bikes (user_id);
create index if not exists task_types_user_id_idx on public.task_types (user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.task_type_presets enable row level security;
alter table public.task_types enable row level security;
alter table public.bikes enable row level security;
alter table public.maintenance_logs enable row level security;
alter table public.reminder_rules enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "profiles: read own" on public.profiles for select using (id = auth.uid());
create policy "profiles: update own" on public.profiles for update using (id = auth.uid());

create policy "task_type_presets: read all" on public.task_type_presets for select to authenticated using (true);

create policy "task_types: read own" on public.task_types for select using (user_id = auth.uid());
create policy "task_types: insert own" on public.task_types for insert with check (user_id = auth.uid());
create policy "task_types: update own" on public.task_types for update using (user_id = auth.uid());
create policy "task_types: delete own" on public.task_types for delete using (user_id = auth.uid());

create policy "bikes: read own" on public.bikes for select using (user_id = auth.uid());
create policy "bikes: insert own" on public.bikes for insert with check (user_id = auth.uid());
create policy "bikes: update own" on public.bikes for update using (user_id = auth.uid());
create policy "bikes: delete own" on public.bikes for delete using (user_id = auth.uid());

create policy "maintenance_logs: read own" on public.maintenance_logs for select using (
  exists (select 1 from public.bikes where bikes.id = maintenance_logs.bike_id and bikes.user_id = auth.uid())
);
create policy "maintenance_logs: insert own" on public.maintenance_logs for insert with check (
  exists (select 1 from public.bikes where bikes.id = maintenance_logs.bike_id and bikes.user_id = auth.uid())
);
create policy "maintenance_logs: update own" on public.maintenance_logs for update using (
  exists (select 1 from public.bikes where bikes.id = maintenance_logs.bike_id and bikes.user_id = auth.uid())
);
create policy "maintenance_logs: delete own" on public.maintenance_logs for delete using (
  exists (select 1 from public.bikes where bikes.id = maintenance_logs.bike_id and bikes.user_id = auth.uid())
);

create policy "reminder_rules: read own" on public.reminder_rules for select using (
  exists (select 1 from public.bikes where bikes.id = reminder_rules.bike_id and bikes.user_id = auth.uid())
);
create policy "reminder_rules: insert own" on public.reminder_rules for insert with check (
  exists (select 1 from public.bikes where bikes.id = reminder_rules.bike_id and bikes.user_id = auth.uid())
);
create policy "reminder_rules: update own" on public.reminder_rules for update using (
  exists (select 1 from public.bikes where bikes.id = reminder_rules.bike_id and bikes.user_id = auth.uid())
);
create policy "reminder_rules: delete own" on public.reminder_rules for delete using (
  exists (select 1 from public.bikes where bikes.id = reminder_rules.bike_id and bikes.user_id = auth.uid())
);

create policy "push_subscriptions: read own" on public.push_subscriptions for select using (user_id = auth.uid());
create policy "push_subscriptions: insert own" on public.push_subscriptions for insert with check (user_id = auth.uid());
create policy "push_subscriptions: update own" on public.push_subscriptions for update using (user_id = auth.uid());
create policy "push_subscriptions: delete own" on public.push_subscriptions for delete using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- New user seeding: create a profile row and copy preset task types
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);

  insert into public.task_types (user_id, name, default_interval_type, default_interval_miles, default_interval_days, is_preset)
  select new.id, name, default_interval_type, default_interval_miles, default_interval_days, true
  from public.task_type_presets;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- Seed preset task types (edit freely before running, or afterwards in the
-- table editor — this only affects future signups, not existing users)
-- ─────────────────────────────────────────────────────────────────────────

insert into public.task_type_presets (name, default_interval_type, default_interval_miles, default_interval_days) values
  ('Chain lube', 'mileage', 150, null),
  ('Chain replacement', 'mileage', 2000, null),
  ('Brake pads', 'mileage', 1500, null),
  ('Tire replacement', 'mileage', 3000, null),
  ('Cable replacement', 'both', 2000, 365),
  ('Bearing service', 'time', null, 365),
  ('Full tune-up', 'both', 1000, 180)
on conflict do nothing;

-- Migration: per-position tracking (front/rear tyres, brake pads, cables, …).
-- Run once in the Supabase SQL Editor on a database created from an earlier
-- schema.sql. Fresh installs get all of this from schema.sql directly.

-- ─────────────────────────────────────────────────────────────────────────
-- Columns
-- ─────────────────────────────────────────────────────────────────────────

alter table public.task_type_presets add column if not exists positions text[];
alter table public.task_types add column if not exists positions text[];

alter table public.maintenance_logs add column if not exists position text;
alter table public.maintenance_logs add column if not exists part_details text;

alter table public.reminder_rules add column if not exists position text not null default '';
alter table public.reminder_rules drop constraint if exists reminder_rules_bike_id_task_type_id_key;
alter table public.reminder_rules
  add constraint reminder_rules_bike_id_task_type_id_position_key unique (bike_id, task_type_id, position);

-- ─────────────────────────────────────────────────────────────────────────
-- New-user seeding now copies positions too
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);

  insert into public.task_types (user_id, name, default_interval_type, default_interval_miles, default_interval_days, positions, is_preset)
  select new.id, name, default_interval_type, default_interval_miles, default_interval_days, positions, true
  from public.task_type_presets;

  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Presets: add positions to existing ones and add new ones
-- ─────────────────────────────────────────────────────────────────────────

update public.task_type_presets set positions = '{Front,Rear}'
  where name in ('Brake pads', 'Tire replacement') and positions is null;
update public.task_type_presets set positions = '{Front brake,Rear brake,Front shift,Rear shift}'
  where name = 'Cable replacement' and positions is null;

insert into public.task_type_presets (name, default_interval_type, default_interval_miles, default_interval_days, positions)
select v.* from (values
  ('Cassette replacement', 'mileage', 6000::numeric, null::integer, null::text[]),
  ('Brake rotors', 'mileage', 6000, null, '{Front,Rear}'),
  ('Brake bleed', 'time', null, 365, '{Front,Rear}'),
  ('Tubeless sealant', 'time', null, 120, '{Front,Rear}'),
  ('Hub bearing service', 'time', null, 365, '{Front,Rear}'),
  ('Suspension service', 'time', null, 365, '{Fork,Shock}')
) as v(name, default_interval_type, default_interval_miles, default_interval_days, positions)
where not exists (select 1 from public.task_type_presets p where p.name = v.name);

-- ─────────────────────────────────────────────────────────────────────────
-- Existing users: split their preset tyre / brake pad / cable task types
-- and give them the new presets. Skip this section if you'd rather set
-- positions yourself on the Task Types page.
-- ─────────────────────────────────────────────────────────────────────────

update public.task_types t set positions = p.positions
  from public.task_type_presets p
  where t.is_preset and t.name = p.name and t.positions is null and p.positions is not null;

insert into public.task_types (user_id, name, default_interval_type, default_interval_miles, default_interval_days, positions, is_preset)
select u.user_id, p.name, p.default_interval_type, p.default_interval_miles, p.default_interval_days, p.positions, true
from (select distinct user_id from public.task_types) u
cross join public.task_type_presets p
where not exists (select 1 from public.task_types t where t.user_id = u.user_id and t.name = p.name);

-- Expand each whole-task rule into one rule per position, keeping the
-- bike's interval override. Existing logs have a null position, so they
-- count towards every position and no history is lost.
insert into public.reminder_rules (bike_id, task_type_id, position, interval_miles, interval_days)
select r.bike_id, r.task_type_id, pos, r.interval_miles, r.interval_days
from public.reminder_rules r
join public.task_types t on t.id = r.task_type_id
cross join unnest(t.positions) as pos
where r.position = '' and cardinality(t.positions) > 0
on conflict do nothing;

delete from public.reminder_rules r
using public.task_types t
where t.id = r.task_type_id and r.position = '' and cardinality(t.positions) > 0;

-- Migration: make preset (default) task types read-only.
-- Run once in the Supabase SQL Editor on a database created from an earlier
-- schema.sql. Fresh installs get this from schema.sql directly.

drop policy if exists "task_types: update own" on public.task_types;
drop policy if exists "task_types: delete own" on public.task_types;

create policy "task_types: update own" on public.task_types for update
  using (user_id = auth.uid() and not is_preset) with check (user_id = auth.uid() and not is_preset);
create policy "task_types: delete own" on public.task_types for delete using (user_id = auth.uid() and not is_preset);

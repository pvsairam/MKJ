-- My Krishna Journey — Safe Additive Migration for Monthly Remembrance ("Looking Back with Gratitude")
-- Preserves all existing tables and data.

create table if not exists public.monthly_remembrances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_key text not null check(month_key ~ '^\d{4}-\d{2}$'),
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, month_key)
);

alter table public.monthly_remembrances enable row level security;

create policy monthly_remembrances_select on public.monthly_remembrances
  for select to authenticated
  using ((select auth.uid()) = user_id and (select public.is_app_member()));

create policy monthly_remembrances_insert on public.monthly_remembrances
  for insert to authenticated
  with check ((select auth.uid()) = user_id and (select public.is_app_member()));

create policy monthly_remembrances_update on public.monthly_remembrances
  for update to authenticated
  using ((select auth.uid()) = user_id and (select public.is_app_member()))
  with check ((select auth.uid()) = user_id and (select public.is_app_member()));

create policy monthly_remembrances_delete on public.monthly_remembrances
  for delete to authenticated
  using ((select auth.uid()) = user_id and (select public.is_app_member()));

create or replace trigger monthly_remembrances_touch
  before update on public.monthly_remembrances
  for each row execute function public.touch_updated_at();

create index if not exists monthly_remembrances_user_month_idx
  on public.monthly_remembrances(user_id, month_key);

grant select, insert, update, delete on public.monthly_remembrances to authenticated;


-- My Krishna Journey — Complete Production Schema & RLS Migration
-- Apply using the Supabase SQL editor.

create extension if not exists pgcrypto;

-- 1. App Members (Approved Devotee Account Gate)
create table if not exists public.app_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_members enable row level security;

create policy app_members_self_read on public.app_members
  for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.app_members from anon, authenticated;
grant select on public.app_members to authenticated;

create or replace function public.is_app_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.app_members m where m.user_id = (select auth.uid()));
$$;
revoke all on function public.is_app_member() from public, anon;
grant execute on function public.is_app_member() to authenticated;

-- Automatically approve the very first devotee account created in this private project.
create or replace function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.app_members) then
    insert into public.app_members (user_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Safe RPC for the initial owner to claim membership if their Auth account was created prior to migration.
create or replace function public.ensure_app_member() returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  current_uid uuid := (select auth.uid());
begin
  if current_uid is null then
    return false;
  end if;
  if exists (select 1 from public.app_members where user_id = current_uid) then
    return true;
  end if;
  if not exists (select 1 from public.app_members) then
    insert into public.app_members (user_id) values (current_uid) on conflict do nothing;
    return true;
  end if;
  return false;
end;
$$;
revoke all on function public.ensure_app_member() from public, anon;
grant execute on function public.ensure_app_member() to authenticated;

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2. Daily Records
create table if not exists public.daily_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  japa_rounds int check(japa_rounds between 0 and 1000),
  book_minutes int check(book_minutes >= 0),
  book_pages int check(book_pages >= 0),
  lecture_minutes int check(lecture_minutes >= 0),
  other_service text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, entry_date)
);

alter table public.daily_records enable row level security;

create policy daily_records_select on public.daily_records
  for select to authenticated
  using ((select auth.uid()) = user_id and (select public.is_app_member()));

create policy daily_records_insert on public.daily_records
  for insert to authenticated
  with check ((select auth.uid()) = user_id and (select public.is_app_member()));

create policy daily_records_update on public.daily_records
  for update to authenticated
  using ((select auth.uid()) = user_id and (select public.is_app_member()))
  with check ((select auth.uid()) = user_id and (select public.is_app_member()));

create policy daily_records_delete on public.daily_records
  for delete to authenticated
  using ((select auth.uid()) = user_id and (select public.is_app_member()));

create or replace trigger daily_records_touch
  before update on public.daily_records
  for each row execute function public.touch_updated_at();

create index if not exists daily_records_date_idx on public.daily_records(user_id, entry_date);

-- 3. Activity Entries
create table if not exists public.activity_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  activity_key text not null,
  status text check(status in ('yes','no','partial')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, entry_date, activity_key)
);

alter table public.activity_entries enable row level security;

create policy activity_entries_select on public.activity_entries
  for select to authenticated
  using ((select auth.uid()) = user_id and (select public.is_app_member()));

create policy activity_entries_insert on public.activity_entries
  for insert to authenticated
  with check ((select auth.uid()) = user_id and (select public.is_app_member()));

create policy activity_entries_update on public.activity_entries
  for update to authenticated
  using ((select auth.uid()) = user_id and (select public.is_app_member()))
  with check ((select auth.uid()) = user_id and (select public.is_app_member()));

create policy activity_entries_delete on public.activity_entries
  for delete to authenticated
  using ((select auth.uid()) = user_id and (select public.is_app_member()));

create or replace trigger activity_entries_touch
  before update on public.activity_entries
  for each row execute function public.touch_updated_at();

create index if not exists activity_entries_date_idx on public.activity_entries(user_id, entry_date);

-- 4. Journal Entries (Spiritual Realizations)
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, entry_date)
);

alter table public.journal_entries enable row level security;

create policy journal_entries_select on public.journal_entries
  for select to authenticated
  using ((select auth.uid()) = user_id and (select public.is_app_member()));

create policy journal_entries_insert on public.journal_entries
  for insert to authenticated
  with check ((select auth.uid()) = user_id and (select public.is_app_member()));

create policy journal_entries_update on public.journal_entries
  for update to authenticated
  using ((select auth.uid()) = user_id and (select public.is_app_member()))
  with check ((select auth.uid()) = user_id and (select public.is_app_member()));

create policy journal_entries_delete on public.journal_entries
  for delete to authenticated
  using ((select auth.uid()) = user_id and (select public.is_app_member()));

create or replace trigger journal_entries_touch
  before update on public.journal_entries
  for each row execute function public.touch_updated_at();

create index if not exists journal_entries_date_idx on public.journal_entries(user_id, entry_date);

-- 5. Evening Reflections
create table if not exists public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  answers jsonb not null default '{}'::jsonb,
  pleasure text,
  sense_gratification text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, entry_date)
);

alter table public.reflections enable row level security;

create policy reflections_select on public.reflections
  for select to authenticated
  using ((select auth.uid()) = user_id and (select public.is_app_member()));

create policy reflections_insert on public.reflections
  for insert to authenticated
  with check ((select auth.uid()) = user_id and (select public.is_app_member()));

create policy reflections_update on public.reflections
  for update to authenticated
  using ((select auth.uid()) = user_id and (select public.is_app_member()))
  with check ((select auth.uid()) = user_id and (select public.is_app_member()));

create policy reflections_delete on public.reflections
  for delete to authenticated
  using ((select auth.uid()) = user_id and (select public.is_app_member()));

create or replace trigger reflections_touch
  before update on public.reflections
  for each row execute function public.touch_updated_at();

create index if not exists reflections_date_idx on public.reflections(user_id, entry_date);

-- 6. Temple & Seva Events
create table if not exists public.temple_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_date date not null,
  event_type text not null check(event_type in ('visit','service','contribution','bhagavatam_sets','gita_books','other_books')),
  quantity numeric(12,2) not null check(quantity > 0 and (event_type in ('service','contribution') or quantity = trunc(quantity))),
  currency text not null default 'INR',
  temple_name text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.temple_events enable row level security;

create policy temple_events_select on public.temple_events
  for select to authenticated
  using ((select auth.uid()) = user_id and (select public.is_app_member()));

create policy temple_events_insert on public.temple_events
  for insert to authenticated
  with check ((select auth.uid()) = user_id and (select public.is_app_member()));

create policy temple_events_update on public.temple_events
  for update to authenticated
  using ((select auth.uid()) = user_id and (select public.is_app_member()))
  with check ((select auth.uid()) = user_id and (select public.is_app_member()));

create policy temple_events_delete on public.temple_events
  for delete to authenticated
  using ((select auth.uid()) = user_id and (select public.is_app_member()));

create or replace trigger temple_events_touch
  before update on public.temple_events
  for each row execute function public.touch_updated_at();

create index if not exists temple_events_date_idx on public.temple_events(user_id, event_date);

-- 7. Personal Intentions (Goals)
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_key text not null,
  target numeric(12,2) not null check(target >= 0),
  updated_at timestamptz not null default now(),
  unique(user_id, goal_key)
);

alter table public.goals enable row level security;

create policy goals_select on public.goals
  for select to authenticated
  using ((select auth.uid()) = user_id and (select public.is_app_member()));

create policy goals_insert on public.goals
  for insert to authenticated
  with check ((select auth.uid()) = user_id and (select public.is_app_member()));

create policy goals_update on public.goals
  for update to authenticated
  using ((select auth.uid()) = user_id and (select public.is_app_member()))
  with check ((select auth.uid()) = user_id and (select public.is_app_member()));

create policy goals_delete on public.goals
  for delete to authenticated
  using ((select auth.uid()) = user_id and (select public.is_app_member()));

create or replace trigger goals_touch
  before update on public.goals
  for each row execute function public.touch_updated_at();

create index if not exists goals_user_idx on public.goals(user_id);

-- 8. Monthly Remembrances ("Looking Back with Gratitude")
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

-- Table privileges for authenticated users (governed by RLS policies above)
grant select, insert, update, delete on
  public.daily_records,
  public.activity_entries,
  public.journal_entries,
  public.reflections,
  public.temple_events,
  public.goals,
  public.monthly_remembrances
to authenticated;

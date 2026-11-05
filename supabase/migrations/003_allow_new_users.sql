-- Allow any newly registered devotee to access their own private sanctuary
-- (Each user's data remains strictly isolated by RLS: (select auth.uid()) = user_id)

create or replace function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.app_members (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create or replace function public.ensure_app_member() returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  current_uid uuid := (select auth.uid());
begin
  if current_uid is null then
    return false;
  end if;
  insert into public.app_members (user_id) values (current_uid) on conflict do nothing;
  return true;
end;
$$;

-- Also approve any existing users in auth.users who signed up already
insert into public.app_members (user_id)
select id from auth.users
on conflict do nothing;

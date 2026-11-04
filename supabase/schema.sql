-- 10,000 Hours: run once in Supabase → SQL Editor → New query → Run.
-- Safe to run again: everything uses "if not exists" / "or replace".

-- Profiles: one row per signed-in person.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  daily_goal_min integer not null default 120,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Skills. Ids come from the app so offline-created skills keep their id.
create table if not exists public.skills (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  icon text,
  prior_ms bigint not null default 0,
  created_at_ms bigint not null,
  updated_at_ms bigint not null,
  deleted boolean not null default false,
  primary key (user_id, id)
);

-- Sessions (timed or logged by hand).
create table if not exists public.sessions (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  skill_id text not null,
  start_ms bigint not null,
  end_ms bigint not null,
  ms bigint not null check (ms >= 0),
  deleted boolean not null default false,
  primary key (user_id, id)
);
create index if not exists sessions_user_skill on public.sessions (user_id, skill_id);

-- Row Level Security: everyone sees and changes only their own rows.
alter table public.profiles enable row level security;
alter table public.skills enable row level security;
alter table public.sessions enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "own skills" on public.skills;
create policy "own skills" on public.skills
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "own sessions" on public.sessions;
create policy "own sessions" on public.sessions
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Account deletion from inside the app (required by App Store guideline 5.1.1(v)).
-- Deleting the auth user cascades to profiles, skills and sessions.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

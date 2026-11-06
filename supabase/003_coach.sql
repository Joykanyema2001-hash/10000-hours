-- 10,000 Hours: AI coach (plans and lessons).
-- Run once in Supabase → SQL Editor → New query → Run (after 002). Safe to run again.
-- Nothing here is readable from the app directly: only the `coach` Edge Function
-- (which runs with the service role) touches these tables.

-- How much of the monthly AI allowance each person has used.
create table if not exists public.coach_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null,
  asks int not null default 0,
  plans int not null default 0,
  lessons int not null default 0,
  primary key (user_id, month)
);
alter table public.coach_usage enable row level security;

-- Lessons are shared by topic: "swimming / breathing" is generated once and reused.
create table if not exists public.lessons (
  key text primary key,
  skill text not null,
  step text not null,
  lesson jsonb not null,
  reports int not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.lessons enable row level security;

create table if not exists public.lesson_reports (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_key text not null,
  reason text,
  created_at timestamptz not null default now()
);
alter table public.lesson_reports enable row level security;

-- Take one unit of allowance atomically. Returns false when the month's limit is used up.
create or replace function public.coach_take(p_user uuid, p_kind text, p_limit int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  m text := to_char(now() at time zone 'utc', 'YYYY-MM');
  n int;
begin
  insert into coach_usage (user_id, month) values (p_user, m) on conflict do nothing;
  if p_kind = 'ask' then
    update coach_usage set asks = asks + 1 where user_id = p_user and month = m and asks < p_limit returning asks into n;
  elsif p_kind = 'plan' then
    update coach_usage set plans = plans + 1 where user_id = p_user and month = m and plans < p_limit returning plans into n;
  elsif p_kind = 'lesson' then
    update coach_usage set lessons = lessons + 1 where user_id = p_user and month = m and lessons < p_limit returning lessons into n;
  end if;
  return n is not null;
end;
$$;

-- Give the unit back when generation failed, so errors don't eat the allowance.
create or replace function public.coach_refund(p_user uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m text := to_char(now() at time zone 'utc', 'YYYY-MM');
begin
  if p_kind = 'ask' then
    update coach_usage set asks = greatest(asks - 1, 0) where user_id = p_user and month = m;
  elsif p_kind = 'plan' then
    update coach_usage set plans = greatest(plans - 1, 0) where user_id = p_user and month = m;
  elsif p_kind = 'lesson' then
    update coach_usage set lessons = greatest(lessons - 1, 0) where user_id = p_user and month = m;
  end if;
end;
$$;

-- Only the server (service role) may call these.
revoke execute on function public.coach_take(uuid, text, int) from public, anon, authenticated;
revoke execute on function public.coach_refund(uuid, text) from public, anon, authenticated;
grant execute on function public.coach_take(uuid, text, int) to service_role;
grant execute on function public.coach_refund(uuid, text) to service_role;

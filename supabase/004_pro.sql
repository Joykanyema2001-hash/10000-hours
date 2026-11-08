-- 10,000 Hours: Pro subscriptions.
-- Run once in Supabase → SQL Editor → New query → Run (after 003). Safe to run again.
-- Written only by the `revenuecat` Edge Function (service role); each person can read their own row.

create table if not exists public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  expires_at timestamptz,
  product_id text,
  last_event text,
  updated_at timestamptz not null default now()
);
alter table public.entitlements enable row level security;
drop policy if exists "read own entitlement" on public.entitlements;
create policy "read own entitlement" on public.entitlements
  for select to authenticated using (user_id = (select auth.uid()));

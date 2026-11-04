-- 10,000 Hours: skill trees and session notes.
-- Run once in Supabase → SQL Editor → New query → Run (after schema.sql). Safe to run again.

create table if not exists public.nodes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  skill_id text not null,
  parent_id text,
  title text not null,
  notes text,
  status text not null default 'todo' check (status in ('todo', 'learning', 'mastered')),
  created_at_ms bigint not null,
  updated_at_ms bigint not null,
  mastered_at_ms bigint,
  deleted boolean not null default false,
  primary key (user_id, id)
);
create index if not exists nodes_user_skill on public.nodes (user_id, skill_id);

alter table public.nodes enable row level security;
drop policy if exists "own nodes" on public.nodes;
create policy "own nodes" on public.nodes
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Sessions can now say which step they were spent on, carry a note, and be edited.
alter table public.sessions add column if not exists node_id text;
alter table public.sessions add column if not exists note text;
alter table public.sessions add column if not exists updated_at_ms bigint not null default 0;

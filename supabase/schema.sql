-- Tally.ly — database schema
-- Run this in Supabase → SQL Editor → New query → Run.

create extension if not exists "pgcrypto";

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('inventory', 'expense')),
  product text,
  category text not null default 'other',
  quantity numeric,
  unit text,
  unit_price numeric,
  total numeric,
  currency text not null default 'USD',
  note text,
  source text not null default 'text' check (source in ('voice', 'photo', 'text')),
  low_stock_threshold numeric,
  created_at timestamptz not null default now()
);

-- Row Level Security: each user only ever sees and edits their own rows.
alter table public.entries enable row level security;

drop policy if exists "entries_select_own" on public.entries;
drop policy if exists "entries_insert_own" on public.entries;
drop policy if exists "entries_update_own" on public.entries;
drop policy if exists "entries_delete_own" on public.entries;

create policy "entries_select_own" on public.entries
  for select using (auth.uid() = user_id);
create policy "entries_insert_own" on public.entries
  for insert with check (auth.uid() = user_id);
create policy "entries_update_own" on public.entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "entries_delete_own" on public.entries
  for delete using (auth.uid() = user_id);

create index if not exists idx_entries_user_created
  on public.entries (user_id, created_at desc);

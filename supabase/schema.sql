-- Penny — Supabase schema
-- Run this in your Supabase project's SQL Editor to enable cloud sync.
-- Each user only ever sees their own rows (enforced by Row Level Security).

create extension if not exists "pgcrypto";

-- Transactions ------------------------------------------------------------
create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  type        text not null check (type in ('income', 'expense')),
  amount      numeric(12, 2) not null check (amount >= 0),
  category    text not null,
  note        text not null default '',
  date        date not null,
  created_at  timestamptz not null default now()
);

-- Budgets -----------------------------------------------------------------
create table if not exists public.budgets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  category      text not null,
  limit_amount  numeric(12, 2) not null check (limit_amount >= 0),
  created_at    timestamptz not null default now(),
  unique (user_id, category)
);

-- Goals -------------------------------------------------------------------
create table if not exists public.goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  name           text not null,
  target_amount  numeric(12, 2) not null check (target_amount >= 0),
  saved_amount   numeric(12, 2) not null default 0,
  emoji          text not null default '🎯',
  created_at     timestamptz not null default now()
);

-- Indexes for faster per-user queries
create index if not exists transactions_user_date_idx on public.transactions (user_id, date desc);
create index if not exists budgets_user_idx on public.budgets (user_id);
create index if not exists goals_user_idx on public.goals (user_id);

-- Row Level Security ------------------------------------------------------
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;

-- Helper to keep policies DRY-ish: one policy per table for all actions.
create policy "own transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own budgets" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own goals" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

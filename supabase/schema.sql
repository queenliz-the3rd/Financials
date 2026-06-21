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
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  name                  text not null,
  target_amount         numeric(12, 2) not null check (target_amount >= 0),
  saved_amount          numeric(12, 2) not null default 0,
  emoji                 text not null default '🎯',
  deadline              date,                       -- null = no deadline
  monthly_target        numeric(12, 2),             -- desired contribution per month
  contributed_this_month numeric(12, 2) not null default 0,
  contrib_month         text not null default '',   -- yyyy-mm
  created_at            timestamptz not null default now()
);

-- If the goals table already exists from an earlier version, add the new columns:
alter table public.goals add column if not exists deadline date;
alter table public.goals add column if not exists monthly_target numeric(12, 2);
alter table public.goals add column if not exists contributed_this_month numeric(12, 2) not null default 0;
alter table public.goals add column if not exists contrib_month text not null default '';

-- Profiles + PIN (one row per user) ------------------------------------------
-- The 4-digit PIN is stored only as a bcrypt hash and verified server-side by
-- rate-limited functions. The pin_hash column is NOT readable by clients.
create table if not exists public.profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  username     text,
  pin_hash     text,
  pin_attempts int not null default 0,
  created_at   timestamptz not null default now()
);

-- Settings (one row per user) — controls the weekly insight email -----------
create table if not exists public.settings (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  email_enabled  boolean not null default false,
  email_to       text not null default '',
  timezone       text not null default 'America/Denver',
  send_dow       int not null default 0 check (send_dow between 0 and 6), -- 0 = Sunday
  send_hour      int not null default 18 check (send_hour between 0 and 23),
  last_sent_at   timestamptz,
  updated_at     timestamptz not null default now()
);

-- Indexes for faster per-user queries
create index if not exists transactions_user_date_idx on public.transactions (user_id, date desc);
create index if not exists budgets_user_idx on public.budgets (user_id);
create index if not exists goals_user_idx on public.goals (user_id);

-- Row Level Security ------------------------------------------------------
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;
alter table public.settings enable row level security;
alter table public.profiles enable row level security;

-- Helper to keep policies DRY-ish: one policy per table for all actions.
create policy "own transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own budgets" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own goals" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own settings" on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own profile" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Hide the PIN hash from clients entirely; only the SECURITY DEFINER functions
-- below (which run as the table owner) can read or write it.
revoke select (pin_hash) on public.profiles from authenticated, anon;
revoke update (pin_hash, pin_attempts) on public.profiles from authenticated, anon;

-- PIN functions ----------------------------------------------------------------
create extension if not exists pgcrypto;

create or replace function public.has_pin()
returns boolean language sql security definer set search_path = public as $$
  select coalesce((select pin_hash is not null from profiles where user_id = auth.uid()), false);
$$;

create or replace function public.set_pin(new_pin text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if new_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN must be exactly 4 digits';
  end if;
  insert into profiles (user_id, pin_hash, pin_attempts)
    values (auth.uid(), crypt(new_pin, gen_salt('bf')), 0)
  on conflict (user_id)
    do update set pin_hash = crypt(new_pin, gen_salt('bf')), pin_attempts = 0;
end;
$$;

-- Returns 'ok' | 'wrong' | 'locked' | 'no_pin'. Locks after 5 failed attempts.
create or replace function public.verify_pin(attempt text)
returns text language plpgsql security definer set search_path = public as $$
declare rec record;
begin
  select pin_hash, pin_attempts into rec from profiles where user_id = auth.uid();
  if rec.pin_hash is null then return 'no_pin'; end if;
  if rec.pin_attempts >= 5 then return 'locked'; end if;

  if rec.pin_hash = crypt(attempt, rec.pin_hash) then
    update profiles set pin_attempts = 0 where user_id = auth.uid();
    return 'ok';
  end if;

  update profiles set pin_attempts = pin_attempts + 1 where user_id = auth.uid();
  if rec.pin_attempts + 1 >= 5 then return 'locked'; end if;
  return 'wrong';
end;
$$;

create or replace function public.reset_pin_attempts()
returns void language sql security definer set search_path = public as $$
  update profiles set pin_attempts = 0 where user_id = auth.uid();
$$;

grant execute on function public.has_pin(), public.set_pin(text),
  public.verify_pin(text), public.reset_pin_attempts() to authenticated;

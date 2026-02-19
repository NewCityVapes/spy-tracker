-- ============================================
-- SPY TRACKER — SUPABASE SCHEMA
-- Run this entire file in the Supabase SQL editor
-- ============================================

-- TRADES TABLE
create table if not exists trades (
  id text primary key,
  user_id text not null default 'default',
  date text,
  time text,
  dir text,
  setup text,
  day_type text,
  outcome text,
  entry numeric,
  stop_price numeric,
  exit_price numeric,
  shares integer,
  pnl numeric,
  rr text,
  rules text,
  emotion text,
  good text,
  improve text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- GAME PLANS TABLE
create table if not exists game_plans (
  id serial primary key,
  user_id text not null default 'default',
  date text not null,
  bias text,
  account numeric,
  maxloss numeric,
  level text,
  setups text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

-- PRE-MARKET CHECKLIST TABLE
create table if not exists checklists (
  id serial primary key,
  user_id text not null default 'default',
  date text not null,
  data jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

-- DAY TYPE TABLE
create table if not exists day_types (
  id serial primary key,
  user_id text not null default 'default',
  date text not null,
  type text,
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- Indexes for performance
create index if not exists trades_user_id_idx on trades(user_id);
create index if not exists trades_date_idx on trades(date);
create index if not exists game_plans_user_date_idx on game_plans(user_id, date);
create index if not exists checklists_user_date_idx on checklists(user_id, date);

-- ============================================
-- NOTE: Row Level Security is intentionally
-- disabled for simplicity (single-user app).
-- If you want to add auth later, enable RLS
-- and add policies per user.
-- ============================================

create extension if not exists "pgcrypto";

-- Players
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  created_at timestamptz not null default now()
);

-- Realtime presence ("not alone" effect)
create table if not exists public.presence (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players (id) on delete cascade,
  display_name text not null,
  x real not null default 0,
  y real not null default 0,
  state text not null default 'idle',
  updated_at timestamptz not null default now()
);

-- Tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  task_type text not null,
  goal integer not null,
  reward integer not null,
  created_at timestamptz not null default now()
);

-- Player task progress
create table if not exists public.task_progress (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete cascade,
  progress integer not null default 0,
  is_complete boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Enable realtime for presence
alter table public.presence replica identity full;

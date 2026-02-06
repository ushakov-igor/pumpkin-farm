create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players (id) on delete cascade,
  display_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

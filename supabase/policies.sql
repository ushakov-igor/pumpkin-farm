-- RLS policies (MVP, permissive for prototype)
alter table public.players enable row level security;
alter table public.presence enable row level security;
alter table public.tasks enable row level security;
alter table public.task_progress enable row level security;

-- Players: read all, insert self
create policy if not exists "players_read" on public.players
  for select using (true);

create policy if not exists "players_insert" on public.players
  for insert with check (true);

-- Presence: read/write all (for MVP). Tighten later.
create policy if not exists "presence_read" on public.presence
  for select using (true);

create policy if not exists "presence_upsert" on public.presence
  for all using (true) with check (true);

-- Tasks: read all
create policy if not exists "tasks_read" on public.tasks
  for select using (true);

-- Task progress: read/write all (for MVP)
create policy if not exists "task_progress_rw" on public.task_progress
  for all using (true) with check (true);

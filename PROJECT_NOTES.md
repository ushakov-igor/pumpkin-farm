# Project Notes

## 2026-02-06
- Switched backend to Postgres + PostgREST for one-command Docker setup.
- Added presence polling via PostgREST and removed offline NPC simulation.
- Added global chat UI and API polling.
- Added DB init scripts under `db/init/` and a `janitor` service to purge stale presence.
- Added Nginx proxy `/api` -> PostgREST and config bootstrap via `config.js`.
- Added runtime config injection via `API_BASE` and DB migrations via `DATABASE_URL` on app container start.
- Added idempotent DB seeds and unique constraint for tasks.
- Added Dockerfile for PostgREST service and migration script.
- Render: created Postgres `pumpkin-farm-db` (id dpg-d62rt08gjchc73bvmcl0-a) in region oregon.
- Render API service creation failed due to GitHub repo access; requires Render GitHub App access to private repo.
- Added API container entrypoint to run migrations using DATABASE_URL before starting PostgREST.

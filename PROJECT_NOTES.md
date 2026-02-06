# Project Notes

## 2026-02-06
- Switched backend to Postgres + PostgREST for one-command Docker setup.
- Added presence polling via PostgREST and removed offline NPC simulation.
- Added global chat UI and API polling.
- Added DB init scripts under `db/init/` and a `janitor` service to purge stale presence.
- Added Nginx proxy `/api` -> PostgREST and config bootstrap via `config.js`.

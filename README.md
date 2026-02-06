# Pumpkin Farm

Browser-based pixel-art farm simulator prototype with pumpkins, tasks, and a "living world" feel via real player presence.

## Stack (Docker, one command)
- Frontend: Phaser 3 (ESM via CDN), vanilla JS
- Backend: Postgres + PostgREST
- Hosting: Docker Compose (single command)

## Run (one command)
```bash
docker compose up --build
```

Open:
- App: `http://localhost:8080`
- API (PostgREST): `http://localhost:3000`

## Backend Notes
- DB schema + seed live in `db/init/`
- Registration is always on: a player is created on first load
- Presence is real: only live players that update their presence show up
- Presence cleanup runs in `janitor` service every 60 seconds
- Global chat uses `messages` table and polls every ~2.5 seconds

## Config
- App uses `/api` which is proxied to PostgREST by Nginx (`nginx/default.conf`).
- For deployment, set `window.__PUMPKIN_API_BASE__` in `config.js` if you want a different API URL.

## Render (Blueprint)
`render.yaml` is included for a Render Blueprint deployment (free tier).\n\nManual steps after import:\n- Set `PGRST_DB_URI` to the Render Postgres connection string (format: `postgres://authenticator:postgres@HOST:5432/pumpkin`).\n- Ensure Postgres has init scripts applied (use `db/init/*.sql` on first run in your DB).\n\nNote: free services sleep when idle.

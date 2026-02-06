# Pumpkin Farm

Browser-based pixel-art farm simulator prototype with pumpkins, tasks, and local persistence.

## Stack
- Frontend: Phaser 3 (ESM via CDN), vanilla JS
- Storage: IndexedDB (local)

## Run (one command)
```bash
python3 -m http.server 5173
```

Open `http://localhost:5173`.

## Notes
- All progress is stored locally in the browser (IndexedDB).
- Use the Save panel to manually save/load/reset.
- Aut-save runs every 10 seconds.

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

## Features
- Plant, grow, harvest, and sell pumpkins
- Tasks and leveling
- Autosave + JSON export/import
- Offline growth continues while the tab is closed
- 12-slot draggable inventory (Stardew-inspired)
- Single-screen HUD with menu-driven secondary actions

## Notes
All progress is stored locally in the browser (IndexedDB).

## Alpha docs
- Release/process notes: `docs/ALPHA_RELEASE.md`

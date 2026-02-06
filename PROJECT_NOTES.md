# Project Notes

## 2026-02-06
- Frontend-only architecture with IndexedDB local persistence.
- Added JSON export/import, manual save/load/reset, autosave.
- Added selling, pumpkins inventory, and leveling (XP).
- Ensured offline growth continues via planted timestamps and rescheduled timers.
- Tuned pixel UI and kept layout within one screen.
- Fixed Phaser import (`import * as Phaser`) to resolve module runtime crash.
- Added visible farm cell grid and adjusted UI to light retro Diablo-like inventory slots.
- Kept menu as overlay and removed persistent offline status text from layout.
- Implemented Stardew-like draggable inventory grid (12 slots, drag-and-drop reorder, persisted in save).
- Replaced abstract moving names with role-based NPC names (e.g., "Сосед Иван", "Торговец Павел").

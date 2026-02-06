# Pumpkin Farm Alpha (2026-02-06)

## Scope of this alpha
- Single-screen browser farm prototype
- Core loop: plant -> grow -> harvest -> sell
- Local-only progress (IndexedDB)
- Stardew-inspired draggable inventory panel

## Design research summary
- Stardew Valley inventory has 12-slot rows and strong slot readability for fast item recognition.
- For this project, a 12-slot grid was used on the right panel to keep the game field dominant on one screen.
- UI direction: light retro farm palette, framed panels, high-contrast item slots.

## Implemented gameplay
- Planting on empty cells consumes seeds
- Growth has multi-stage visual states and continues while page is closed
- Harvest grants pumpkins and XP
- Sell actions in menu convert pumpkins to coins
- Buy seeds from menu
- Task assignment/progress and leveling

## Inventory system (alpha)
- 12 draggable slots with drag-and-drop reorder
- Slot order is persisted in saves
- Core items (`seed`, `pumpkin`) are normalized for legacy saves
- Quantity overlays reflect live resource values

## NPC presence naming
- Replaced abstract labels with role-based names:
  - Сосед Иван
  - Соседка Ольга
  - Торговец Павел
  - Пастух Егор
  - Плотник Мартин
  - Почтальон Лев
  - Фермер Роман
  - Садовница Нина

## Technical notes
- Phaser import uses ESM namespace import:
  - `import * as Phaser from "https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.esm.js";`
- This fixes runtime crash caused by default import mismatch.

## Manual QA checklist used
- Page loads without syntax/runtime crash
- Menu opens/closes by button, overlay click, and Escape
- Planting works on empty cells
- Growth stage transitions to ready state
- Harvest increases pumpkins
- Inventory displays items and allows drag/drop reorder
- Save/load/export/import workflows still function

## Known limitations (alpha)
- Drag-and-drop behavior is desktop-first; touch drag on some mobile browsers is limited.
- Inventory supports two active resource types for now (`seed`, `pumpkin`).
- NPC movement is simulated offline presence, not networked players.

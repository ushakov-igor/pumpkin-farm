import * as Phaser from "https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.esm.js";
import { TASK_DEFINITIONS } from "./data/tasks.js";
import { saveState, loadState } from "./services/storage.js";
import { PresenceService } from "./services/presence.js";

const GRID_COLS = 8;
const GRID_ROWS = 5;
const TILE_SIZE = 96;
const GROW_TIME = 10000;
const SELL_PRICE = 2;
const SEED_PRICE = 1;
const SEED_BUNDLE = 5;
const INVENTORY_SLOTS = 12;
const ITEM_META = {
  pumpkin: { icon: "🎃", label: "Тыква" },
  seed: { icon: "🌱", label: "Семена" },
};

class FarmScene extends Phaser.Scene {
  constructor() {
    super("FarmScene");
    this.tiles = [];
    this.coins = 0;
    this.pumpkins = 0;
    this.level = 1;
    this.xp = 0;
    this.seeds = 5;
    this.inventoryOrder = Array(INVENTORY_SLOTS).fill(null);
    this.inventoryOrder[0] = "seed";
    this.inventoryOrder[1] = "pumpkin";
    this.activeTask = null;
    this.taskProgress = 0;
    this.otherPlayers = new Map();
    this.autoSaveTimer = null;
  }

  async create() {
    this.createTextures();
    this.createField();
    this.createPresenceLayer();
    this.bindInput();
    await this.restoreState();
    this.ensureStarterSeeds();
    this.updateHud();
    this.bindInventoryDnD();
    this.startLocalPresence();
    this.startAutoSave();
  }

  createTextures() {
    const g = this.add.graphics();
    g.fillStyle(0x3b7a2a, 1);
    g.fillRect(0, 0, 64, 64);
    g.generateTexture("grass", 64, 64);

    g.clear();
    g.fillStyle(0x7c4a2a, 1);
    g.fillRect(0, 0, 64, 64);
    g.fillStyle(0x6a3f24, 1);
    g.fillRect(4, 4, 56, 56);
    g.generateTexture("soil", 64, 64);

    g.clear();
    g.fillStyle(0x6bbf59, 1);
    g.fillRect(24, 38, 16, 16);
    g.fillStyle(0x3f8f3f, 1);
    g.fillRect(28, 32, 8, 8);
    g.generateTexture("sprout", 64, 64);

    g.clear();
    g.fillStyle(0x5faa4b, 1);
    g.fillRect(18, 30, 28, 22);
    g.fillStyle(0x3f8f3f, 1);
    g.fillRect(26, 22, 12, 12);
    g.generateTexture("plant", 64, 64);

    g.clear();
    g.fillStyle(0xe38921, 1);
    g.fillRect(18, 26, 28, 28);
    g.fillStyle(0x7a3a14, 1);
    g.fillRect(30, 18, 4, 8);
    g.generateTexture("pumpkin", 64, 64);

    g.clear();
    g.fillStyle(0xf2d3a0, 1);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x9c6b3b, 1);
    g.fillRect(10, 8, 12, 16);
    g.generateTexture("npc", 32, 32);

    g.destroy();
  }

  createField() {
    const startX = (this.scale.width - GRID_COLS * TILE_SIZE) / 2 + TILE_SIZE / 2;
    const startY = (this.scale.height - GRID_ROWS * TILE_SIZE) / 2 + TILE_SIZE / 2;

    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let col = 0; col < GRID_COLS; col += 1) {
        const x = startX + col * TILE_SIZE;
        const y = startY + row * TILE_SIZE;

        this.add.image(x, y, "grass").setScale(1.5);
        const soil = this.add.image(x, y, "soil").setScale(1.4);
        this.add.rectangle(x, y, TILE_SIZE - 4, TILE_SIZE - 4).setStrokeStyle(2, 0x4a2c1a, 0.5);

        const plant = this.add.image(x, y, "sprout").setAlpha(0);

        this.tiles.push({
          soil,
          plant,
          state: "empty",
          timer: null,
        });
      }
    }
  }

  createPresenceLayer() {
    this.presenceLayer = this.add.container(0, 0);
  }

  bindInput() {
    this.input.on("pointerdown", (pointer) => {
      const localX = pointer.worldX;
      const localY = pointer.worldY;
      const tile = this.findTileAt(localX, localY);
      if (!tile) return;

      if (tile.state === "empty") {
        this.plantSeed(tile);
        this.onTaskProgress("plant");
      } else if (tile.state === "ready") {
        this.harvest(tile);
        this.onTaskProgress("harvest");
      }
    });

    const bind = (id, handler) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", handler);
    };

    bind("task-btn", () => this.assignTask());
    bind("save-btn", () => this.persistState());
    bind("load-btn", () => this.restoreState(true));
    bind("reset-btn", () => this.resetState());
    bind("sell-one-btn", () => this.sellPumpkins(1));
    bind("sell-all-btn", () => this.sellPumpkins(this.pumpkins));
    bind("export-btn", () => this.exportSave());
    bind("import-btn", () => this.importSave());
    bind("buy-seed-btn", () => this.buySeeds());

    const menuBtn = document.getElementById("menu-btn");
    const menuClose = document.getElementById("menu-close");
    const overlay = document.getElementById("menu-overlay");
    if (menuBtn) menuBtn.addEventListener("click", () => this.toggleMenu(true));
    if (menuClose) menuClose.addEventListener("click", () => this.toggleMenu(false));
    if (overlay) {
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) this.toggleMenu(false);
      });
    }
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") this.toggleMenu(false);
      if (event.key.toLowerCase() === "m") this.toggleMenu(true);
    });
  }

  findTileAt(x, y) {
    const startX = (this.scale.width - GRID_COLS * TILE_SIZE) / 2;
    const startY = (this.scale.height - GRID_ROWS * TILE_SIZE) / 2;
    const col = Math.floor((x - startX) / TILE_SIZE);
    const row = Math.floor((y - startY) / TILE_SIZE);

    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;

    const index = row * GRID_COLS + col;
    return this.tiles[index];
  }

  plantSeed(tile) {
    if (this.seeds <= 0) {
      this.setStatus("Нет семян");
      return;
    }
    this.seeds -= 1;
    tile.state = "growing";
    tile.plant.setTexture("sprout").setAlpha(1);
    tile.plantedAt = Date.now();

    tile.timer = this.time.addEvent({
      delay: GROW_TIME,
      callback: () => {
        tile.state = "ready";
        tile.plant.setTexture("pumpkin");
        tile.plantedAt = tile.plantedAt || Date.now();
      },
    });

    this.time.delayedCall(GROW_TIME * 0.5, () => {
      if (tile.state === "growing") {
        tile.plant.setTexture("plant");
      }
    });

    this.persistState();
    this.updateHud();
  }

  harvest(tile) {
    tile.state = "empty";
    tile.plant.setAlpha(0);
    if (tile.timer) {
      tile.timer.remove(false);
      tile.timer = null;
    }
    this.pumpkins += 1;
    this.addXp(2);
    this.updateHud();
    this.persistState();
  }

  assignTask() {
    const task = TASK_DEFINITIONS[Math.floor(Math.random() * TASK_DEFINITIONS.length)];
    this.activeTask = task;
    this.taskProgress = 0;
    this.updateHud();
    this.persistState();
  }

  onTaskProgress(type) {
    if (!this.activeTask) return;
    if (this.activeTask.type !== type) return;

    this.taskProgress += 1;
    if (this.taskProgress >= this.activeTask.goal) {
      this.coins += this.activeTask.reward;
      this.addXp(this.activeTask.reward);
      this.setStatus(`Задание выполнено: +${this.activeTask.reward}`);
      this.activeTask = null;
      this.taskProgress = 0;
    }
    this.updateHud();
    this.persistState();
  }

  updateHud() {
    const coinEl = document.getElementById("coins");
    const levelEl = document.getElementById("level");
    const taskEl = document.getElementById("tasks");

    if (coinEl) coinEl.textContent = `Монеты: ${this.coins}`;
    if (levelEl) levelEl.textContent = `Уровень: ${this.level} (${this.xp}/${this.nextLevelXp()})`;
    if (!this.activeTask) {
      if (taskEl) taskEl.textContent = "Заданий: 0";
    } else if (taskEl) {
      taskEl.textContent = `${this.activeTask.label} (${this.taskProgress}/${this.activeTask.goal})`;
    }

    this.renderInventory();
  }

  updatePresence(players) {
    const existing = new Set(this.otherPlayers.keys());

    players.forEach((player) => {
      let entry = this.otherPlayers.get(player.player_id || player.id);
      if (!entry) {
        const sprite = this.add.image(0, 0, "npc").setScale(1.2);
        const label = this.add
          .text(0, 0, player.display_name || player.name || "Фермер", {
            fontFamily: "\"Press Start 2P\", \"VT323\", \"Pixelify Sans\", \"Courier New\", monospace",
            fontSize: "12px",
            color: "#2b1f16",
            backgroundColor: "#f2d3a0",
            padding: { x: 4, y: 2 },
          })
          .setOrigin(0.5, 1.2);
        this.presenceLayer.add([sprite, label]);
        entry = { sprite, label };
        this.otherPlayers.set(player.player_id || player.id, entry);
      }

      const x = Phaser.Math.Linear(120, this.scale.width - 120, player.x);
      const y = Phaser.Math.Linear(120, this.scale.height - 120, player.y);
      entry.sprite.setPosition(x, y);
      entry.label.setPosition(x, y - 22);
      existing.delete(player.player_id || player.id);
    });

    existing.forEach((id) => {
      const entry = this.otherPlayers.get(id);
      if (!entry) return;
      entry.sprite.destroy();
      entry.label.destroy();
      this.otherPlayers.delete(id);
    });
  }

  setStatus(text) {
    const status = document.getElementById("status");
    if (status) status.textContent = text;
  }

  startLocalPresence() {
    this.setStatus("Оффлайн мир");
    this.presence = new PresenceService((players) => this.updatePresence(players));
    this.presence.start();
  }

  startAutoSave() {
    this.autoSaveTimer = setInterval(() => this.persistState(), 10000);
  }

  async persistState() {
    const state = {
      coins: this.coins,
      pumpkins: this.pumpkins,
      level: this.level,
      xp: this.xp,
      seeds: this.seeds,
      inventoryOrder: this.inventoryOrder,
      activeTask: this.activeTask,
      taskProgress: this.taskProgress,
      tiles: this.tiles.map((tile) => ({
        state: tile.state,
        plantedAt: tile.plantedAt || null,
      })),
      savedAt: Date.now(),
    };
    await saveState(state);
  }

  async restoreState(manual = false) {
    const state = await loadState();
    if (!state) {
      if (manual) this.setStatus("Нет сохранения");
      return;
    }

    this.coins = state.coins || 0;
    this.pumpkins = state.pumpkins || 0;
    this.level = state.level || 1;
    this.xp = state.xp || 0;
    this.seeds = state.seeds ?? 5;
    if (Array.isArray(state.inventoryOrder) && state.inventoryOrder.length === INVENTORY_SLOTS) {
      this.inventoryOrder = state.inventoryOrder;
    }
    this.activeTask = state.activeTask || null;
    this.taskProgress = state.taskProgress || 0;

    const now = Date.now();
    this.tiles.forEach((tile, index) => {
      const saved = state.tiles?.[index];
      if (!saved || saved.state === "empty") {
        tile.state = "empty";
        tile.plant.setAlpha(0);
        tile.plantedAt = null;
        return;
      }

      tile.plantedAt = saved.plantedAt || now;
      const elapsed = now - tile.plantedAt;

      if (elapsed >= GROW_TIME) {
        tile.state = "ready";
        tile.plant.setTexture("pumpkin").setAlpha(1);
      } else if (elapsed >= GROW_TIME * 0.5) {
        tile.state = "growing";
        tile.plant.setTexture("plant").setAlpha(1);
        this.scheduleGrowth(tile, elapsed);
      } else {
        tile.state = "growing";
        tile.plant.setTexture("sprout").setAlpha(1);
        this.scheduleGrowth(tile, elapsed);
      }
    });

    this.setStatus("Сохранение загружено");
  }

  async resetState() {
    this.coins = 0;
    this.pumpkins = 0;
    this.level = 1;
    this.xp = 0;
    this.seeds = 5;
    this.activeTask = null;
    this.taskProgress = 0;
    this.tiles.forEach((tile) => {
      tile.state = "empty";
      tile.plant.setAlpha(0);
      tile.plantedAt = null;
    });
    await this.persistState();
    this.updateHud();
    this.setStatus("Ферма сброшена");
  }

  ensureStarterSeeds() {
    const allEmpty = this.tiles.every((tile) => tile.state === "empty");
    if (this.seeds <= 0 && allEmpty) {
      this.seeds = 5;
      this.setStatus("Выданы стартовые семена");
      this.persistState();
    }
  }

  bindInventoryDnD() {
    const slots = document.querySelectorAll(".inv-slot[data-slot]");
    slots.forEach((slot) => {
      slot.addEventListener("dragstart", (event) => {
        const from = slot.dataset.slot;
        if (!from) return;
        const item = this.inventoryOrder[Number(from)];
        if (!item) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.setData("text/plain", from);
        event.dataTransfer.effectAllowed = "move";
        slot.classList.add("is-dragging");
      });

      slot.addEventListener("dragover", (event) => {
        event.preventDefault();
        slot.classList.add("is-over");
      });

      slot.addEventListener("dragleave", () => {
        slot.classList.remove("is-over");
      });

      slot.addEventListener("drop", (event) => {
        event.preventDefault();
        slot.classList.remove("is-over");
        const from = Number(event.dataTransfer.getData("text/plain"));
        const to = Number(slot.dataset.slot);
        if (Number.isNaN(from) || Number.isNaN(to) || from === to) return;
        const temp = this.inventoryOrder[to];
        this.inventoryOrder[to] = this.inventoryOrder[from];
        this.inventoryOrder[from] = temp;
        this.updateHud();
        this.persistState();
      });

      slot.addEventListener("dragend", () => {
        slot.classList.remove("is-over");
        slot.classList.remove("is-dragging");
      });
    });
  }

  renderInventory() {
    const slots = document.querySelectorAll(".inv-slot[data-slot]");
    slots.forEach((slot) => {
      const index = Number(slot.dataset.slot);
      const item = this.inventoryOrder[index];
      slot.classList.remove("is-empty");
      slot.innerHTML = "";

      if (!item) {
        slot.classList.add("is-empty");
        return;
      }

      const icon = document.createElement("div");
      icon.className = "slot-icon";
      icon.textContent = ITEM_META[item].icon;

      const label = document.createElement("div");
      label.className = "slot-label";
      label.textContent = ITEM_META[item].label;

      const qty = document.createElement("div");
      qty.className = "slot-qty";
      qty.textContent = item === "seed" ? String(this.seeds) : String(this.pumpkins);

      slot.appendChild(icon);
      slot.appendChild(label);
      slot.appendChild(qty);
    });
  }

  scheduleGrowth(tile, elapsed) {
    if (tile.timer) {
      tile.timer.remove(false);
      tile.timer = null;
    }

    const remaining = Math.max(0, GROW_TIME - elapsed);
    tile.timer = this.time.addEvent({
      delay: remaining,
      callback: () => {
        tile.state = "ready";
        tile.plant.setTexture("pumpkin");
      },
    });

    const half = GROW_TIME * 0.5;
    if (elapsed < half) {
      this.time.delayedCall(half - elapsed, () => {
        if (tile.state === "growing") {
          tile.plant.setTexture("plant");
        }
      });
    }
  }

  sellPumpkins(count) {
    if (count <= 0) return;
    const sellCount = Math.min(this.pumpkins, count);
    if (sellCount === 0) return;
    this.pumpkins -= sellCount;
    const earned = sellCount * SELL_PRICE;
    this.coins += earned;
    this.addXp(sellCount);
    this.updateHud();
    this.setStatus(`Продано: ${sellCount} (+${earned})`);
    this.persistState();
  }

  buySeeds() {
    if (this.coins < SEED_PRICE) {
      this.setStatus("Не хватает монет");
      return;
    }
    this.coins -= SEED_PRICE;
    this.seeds += SEED_BUNDLE;
    this.updateHud();
    this.setStatus(`Куплено семян: +${SEED_BUNDLE}`);
    this.persistState();
  }

  nextLevelXp() {
    return 20 + (this.level - 1) * 10;
  }

  addXp(amount) {
    this.xp += amount;
    while (this.xp >= this.nextLevelXp()) {
      this.xp -= this.nextLevelXp();
      this.level += 1;
      this.setStatus(`Новый уровень: ${this.level}`);
    }
  }

  async exportSave() {
    const state = await loadState();
    const output = document.getElementById("save-json");
    const data = state ? JSON.stringify(state) : "";
    output.value = data;
    output.focus();
    output.select();
    try {
      await navigator.clipboard.writeText(data);
      this.setStatus("Сохранение скопировано");
    } catch (err) {
      this.setStatus("Сохранение готово");
    }
  }

  async importSave() {
    const input = document.getElementById("save-json");
    if (!input.value) return;
    try {
      const data = JSON.parse(input.value);
      await saveState(data);
      await this.restoreState(true);
      this.updateHud();
      this.setStatus("Сохранение импортировано");
    } catch (err) {
      this.setStatus("Ошибка JSON");
    }
  }

  toggleMenu(open) {
    const overlay = document.getElementById("menu-overlay");
    if (!overlay) return;
    if (open) {
      document.body.classList.add("menu-open");
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
    } else {
      document.body.classList.remove("menu-open");
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
    }
  }
}

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: 960,
  height: 540,
  backgroundColor: "#5f9b4d",
  pixelArt: true,
  antialias: false,
  scene: [FarmScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);

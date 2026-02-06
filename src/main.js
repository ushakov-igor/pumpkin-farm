import Phaser from "https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.esm.js";
import { TASK_DEFINITIONS } from "./data/tasks.js";
import { saveState, loadState } from "./services/storage.js";

const GRID_COLS = 8;
const GRID_ROWS = 5;
const TILE_SIZE = 96;
const GROW_TIME = 10000;

class FarmScene extends Phaser.Scene {
  constructor() {
    super("FarmScene");
    this.tiles = [];
    this.coins = 0;
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
    this.updateHud();
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

    const taskBtn = document.getElementById("task-btn");
    taskBtn.addEventListener("click", () => this.assignTask());

    document.getElementById("save-btn").addEventListener("click", () => this.persistState());
    document.getElementById("load-btn").addEventListener("click", () => this.restoreState(true));
    document.getElementById("reset-btn").addEventListener("click", () => this.resetState());
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
  }

  harvest(tile) {
    tile.state = "empty";
    tile.plant.setAlpha(0);
    if (tile.timer) {
      tile.timer.remove(false);
      tile.timer = null;
    }
    this.coins += 1;
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
      this.setStatus(`Задание выполнено: +${this.activeTask.reward}`);
      this.activeTask = null;
      this.taskProgress = 0;
    }
    this.updateHud();
    this.persistState();
  }

  updateHud() {
    const coinEl = document.getElementById("coins");
    const taskEl = document.getElementById("tasks");

    coinEl.textContent = `Монеты: ${this.coins}`;
    if (!this.activeTask) {
      taskEl.textContent = "Заданий: 0";
      return;
    }

    taskEl.textContent = `${this.activeTask.label} (${this.taskProgress}/${this.activeTask.goal})`;
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
    status.textContent = text;
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
      } else {
        tile.state = "growing";
        tile.plant.setTexture("sprout").setAlpha(1);
      }
    });

    this.setStatus("Сохранение загружено");
  }

  async resetState() {
    this.coins = 0;
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

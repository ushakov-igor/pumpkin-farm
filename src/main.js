import Phaser from "https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.esm.js";
import { TASK_DEFINITIONS } from "./data/tasks.js";
import { PresenceApiService } from "./services/presenceApi.js";
import { ChatApiService } from "./services/chatApi.js";

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
  }

  create() {
    this.createTextures();
    this.createField();
    this.createPresenceLayer();
    this.bindInput();
    this.updateHud();

    this.startPresence();
    this.startChat();
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

    tile.timer = this.time.addEvent({
      delay: GROW_TIME,
      callback: () => {
        tile.state = "ready";
        tile.plant.setTexture("pumpkin");
      },
    });

    this.time.delayedCall(GROW_TIME * 0.5, () => {
      if (tile.state === "growing") {
        tile.plant.setTexture("plant");
      }
    });
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
  }

  assignTask() {
    const task = TASK_DEFINITIONS[Math.floor(Math.random() * TASK_DEFINITIONS.length)];
    this.activeTask = task;
    this.taskProgress = 0;
    this.updateHud();
  }

  onTaskProgress(type) {
    if (!this.activeTask) return;
    if (this.activeTask.type !== type) return;

    this.taskProgress += 1;
    if (this.taskProgress >= this.activeTask.goal) {
      this.coins += this.activeTask.reward;
      this.setStatus(`Задание выполнено: +${this.activeTask.reward}`);
      this.activeTask = null;
    }
    this.updateHud();
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

  async startPresence() {
    this.setStatus("Мир ищет соседей");
    this.presence = new PresenceApiService(
      (players) => this.updatePresence(players),
      (text) => this.setStatus(text)
    );

    try {
      await this.presence.start();
    } catch (err) {
      this.setStatus("Оффлайн мир");
    }

    window.addEventListener("beforeunload", () => {
      this.presence?.stop?.();
    });
  }

  startChat() {
    const messagesEl = document.getElementById("chat-messages");
    const formEl = document.getElementById("chat-form");
    const inputEl = document.getElementById("chat-text");

    this.chat = new ChatApiService((messages) => {
      messagesEl.innerHTML = "";
      messages.forEach((msg) => {
        const row = document.createElement("div");
        row.className = "chat-message";
        const name = document.createElement("span");
        name.className = "chat-name";
        name.textContent = msg.display_name + ":";
        const body = document.createElement("span");
        body.textContent = msg.body;
        row.appendChild(name);
        row.appendChild(body);
        messagesEl.appendChild(row);
      });
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });

    this.chat.start();

    formEl.addEventListener("submit", async (event) => {
      event.preventDefault();
      const player = window.__PUMPKIN_PLAYER__;
      if (!player) return;
      await this.chat.sendMessage({
        playerId: player.id,
        displayName: player.display_name,
        body: inputEl.value,
      });
      inputEl.value = "";
      await this.chat.fetchMessages();
    });
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

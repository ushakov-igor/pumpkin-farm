import { apiFetch } from "./api.js";

const NAMES = [
  "Лиса",
  "Ворон",
  "Лаванда",
  "Сова",
  "Лесник",
  "Жук",
  "Мед",
  "Семечко",
];

const randomFrom = (list) => list[Math.floor(Math.random() * list.length)];

const makeToken = () => {
  const data = new Uint8Array(16);
  crypto.getRandomValues(data);
  return Array.from(data)
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
};

export class PresenceApiService {
  constructor(onUpdate, onStatus) {
    this.onUpdate = onUpdate;
    this.onStatus = onStatus;
    this.player = null;
    this.ticker = null;
    this.poller = null;
  }

  async start() {
    this.onStatus?.("Мир ищет соседей");
    await this.ensurePlayer();
    await this.pushPresence();
    await this.fetchPresence();

    this.ticker = setInterval(() => this.pushPresence(), 2000);
    this.poller = setInterval(() => this.fetchPresence(), 2500);
    this.onStatus?.("Онлайн мир");
  }

  async ensurePlayer() {
    const stored = localStorage.getItem("pumpkin_player");
    if (stored) {
      this.player = JSON.parse(stored);
      window.__PUMPKIN_PLAYER__ = this.player;
      return;
    }

    const displayName = randomFrom(NAMES) + "-" + Math.floor(Math.random() * 90 + 10);
    const authToken = makeToken();

    const data = await apiFetch("/players", {
      method: "POST",
      body: JSON.stringify({ display_name: displayName, auth_token: authToken }),
    });

    this.player = data[0];
    localStorage.setItem("pumpkin_player", JSON.stringify(this.player));
    window.__PUMPKIN_PLAYER__ = this.player;
  }

  async pushPresence() {
    if (!this.player) return;
    const payload = {
      player_id: this.player.id,
      display_name: this.player.display_name,
      x: Math.random(),
      y: Math.random(),
      state: "idle",
      updated_at: new Date().toISOString(),
    };

    await apiFetch(`/presence?on_conflict=player_id`, {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(payload),
    });
  }

  async fetchPresence() {
    const cutoff = new Date(Date.now() - 30000).toISOString();
    const data = await apiFetch(
      `/presence?select=player_id,display_name,x,y,updated_at&updated_at=gte.${cutoff}`
    );

    const filtered = data.filter((row) => row.player_id !== this.player?.id);
    this.onUpdate?.(filtered);
  }

  async stop() {
    if (this.ticker) clearInterval(this.ticker);
    if (this.poller) clearInterval(this.poller);
    this.ticker = null;
    this.poller = null;

    this.onStatus?.("Оффлайн мир");
  }
}

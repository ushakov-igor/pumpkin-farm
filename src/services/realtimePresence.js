import { createRealtimeClient } from "./realtime.js";

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

export class RealtimePresenceService {
  constructor(onUpdate, onStatus) {
    this.onUpdate = onUpdate;
    this.onStatus = onStatus;
    this.client = null;
    this.player = null;
    this.channel = null;
    this.ticker = null;
  }

  async start() {
    this.client = await createRealtimeClient();
    if (!this.client) {
      this.onStatus?.("Оффлайн мир");
      return false;
    }

    await this.ensurePlayer();
    await this.subscribePresence();

    this.ticker = setInterval(() => this.pushPresence(), 2000);
    this.onStatus?.("Онлайн мир");
    return true;
  }

  async ensurePlayer() {
    const stored = localStorage.getItem("pumpkin_player_id");
    if (stored) {
      const { data } = await this.client
        .from("players")
        .select("id, display_name")
        .eq("id", stored)
        .maybeSingle();
      if (data) {
        this.player = data;
        return;
      }
    }

    const displayName = randomFrom(NAMES) + "-" + Math.floor(Math.random() * 90 + 10);
    const { data, error } = await this.client
      .from("players")
      .insert({ display_name: displayName })
      .select("id, display_name")
      .single();

    if (error) throw error;
    this.player = data;
    localStorage.setItem("pumpkin_player_id", data.id);
  }

  async subscribePresence() {
    this.channel = this.client.channel("presence-room");

    this.channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "presence" },
        async () => {
          const { data } = await this.client.from("presence").select("*");
          this.onUpdate?.(data || []);
        }
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const { data } = await this.client.from("presence").select("*");
          this.onUpdate?.(data || []);
        }
      });
  }

  async pushPresence() {
    if (!this.player) return;
    const x = Math.random();
    const y = Math.random();

    await this.client.from("presence").upsert(
      {
        player_id: this.player.id,
        display_name: this.player.display_name,
        x,
        y,
        state: "idle",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "player_id" }
    );
  }

  async stop() {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;

    if (this.client && this.player) {
      await this.client.from("presence").delete().eq("player_id", this.player.id);
    }

    if (this.channel) {
      await this.client.removeChannel(this.channel);
      this.channel = null;
    }

    this.onStatus?.("Оффлайн мир");
  }
}

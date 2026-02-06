import { apiFetch } from "./api.js";

export class ChatApiService {
  constructor(onMessages) {
    this.onMessages = onMessages;
    this.poller = null;
  }

  start() {
    this.fetchMessages();
    this.poller = setInterval(() => this.fetchMessages(), 2500);
  }

  stop() {
    if (this.poller) clearInterval(this.poller);
    this.poller = null;
  }

  async fetchMessages() {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const data = await apiFetch(
      `/messages?select=id,display_name,body,created_at&created_at=gte.${cutoff}&order=created_at.desc&limit=20`
    );
    this.onMessages?.(data.reverse());
  }

  async sendMessage({ playerId, displayName, body }) {
    if (!body || body.trim().length === 0) return;
    await apiFetch(`/messages`, {
      method: "POST",
      body: JSON.stringify({
        player_id: playerId,
        display_name: displayName,
        body: body.slice(0, 200),
      }),
    });
  }
}

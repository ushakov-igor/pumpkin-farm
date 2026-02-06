const NAMES = [
  "Сосед Иван",
  "Соседка Ольга",
  "Торговец Павел",
  "Пастух Егор",
  "Плотник Мартин",
  "Почтальон Лев",
  "Фермер Роман",
  "Садовница Нина",
];

const randomFrom = (list) => list[Math.floor(Math.random() * list.length)];

export class PresenceService {
  constructor(onUpdate) {
    this.onUpdate = onUpdate;
    this.players = new Map();
    this.intervalId = null;
  }

  start() {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      const shouldAdd = this.players.size < 4 && Math.random() > 0.4;
      const shouldRemove = this.players.size > 1 && Math.random() > 0.7;

      if (shouldAdd) {
        const id = `ghost_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        this.players.set(id, {
          id,
          name: randomFrom(NAMES),
          x: Math.random(),
          y: Math.random(),
        });
      }

      if (shouldRemove) {
        const ids = Array.from(this.players.keys());
        const id = ids[Math.floor(Math.random() * ids.length)];
        this.players.delete(id);
      }

      this.players.forEach((player) => {
        player.x = Math.min(1, Math.max(0, player.x + (Math.random() - 0.5) * 0.2));
        player.y = Math.min(1, Math.max(0, player.y + (Math.random() - 0.5) * 0.2));
      });

      this.onUpdate(Array.from(this.players.values()));
    }, 2000);
  }

  stop() {
    if (!this.intervalId) return;
    clearInterval(this.intervalId);
    this.intervalId = null;
  }
}

import fs from 'node:fs/promises';
import path from 'node:path';

type AiUsageDay = {
  total: number;
  actors: Record<string, number>;
};

type AiUsageData = {
  version: 1;
  days: Record<string, AiUsageDay>;
};

export interface AiUsageSnapshot {
  date: string;
  used: number;
  remaining: number;
  limit: number;
  globalUsed: number;
  globalRemaining: number;
  globalLimit: number;
  allowed: boolean;
  reason?: 'user' | 'global';
}

const EMPTY_DATA: AiUsageData = { version: 1, days: {} };

function currentViennaDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Vienna',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function clampLimit(value: number, fallback: number, max: number): number {
  return Number.isFinite(value) && value > 0 ? Math.min(Math.floor(value), max) : fallback;
}

export class AiUsageStore {
  private readonly filePath: string;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, 'ai-usage.json');
  }

  private async read(): Promise<AiUsageData> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<AiUsageData>;
      return parsed.version === 1 && parsed.days && typeof parsed.days === 'object'
        ? { version: 1, days: parsed.days as Record<string, AiUsageDay> }
        : { version: 1, days: {} };
    } catch (error: any) {
      if (error?.code === 'ENOENT') return { ...EMPTY_DATA, days: {} };
      throw error;
    }
  }

  private async write(data: AiUsageData): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true, mode: 0o700 });
    const temp = this.filePath + '.tmp-' + process.pid + '-' + Date.now();
    await fs.writeFile(temp, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
    await fs.rename(temp, this.filePath);
  }

  private normalize(data: AiUsageData, today: string): void {
    for (const key of Object.keys(data.days)) {
      if (key !== today) delete data.days[key];
    }
    const day = data.days[today];
    if (!day || typeof day.total !== 'number' || !day.actors || typeof day.actors !== 'object') {
      data.days[today] = { total: 0, actors: {} };
    }
  }

  private snapshot(
    data: AiUsageData,
    actorId: string,
    perUserLimit: number,
    globalLimit: number,
    today: string,
  ): AiUsageSnapshot {
    const day = data.days[today] || { total: 0, actors: {} };
    const used = Number(day.actors[actorId] || 0);
    const userLimit = clampLimit(perUserLimit, 20, 10_000);
    const serverLimit = clampLimit(globalLimit, 200, 1_000_000);
    const userBlocked = used >= userLimit;
    const globalBlocked = day.total >= serverLimit;

    return {
      date: today,
      used,
      remaining: Math.max(0, userLimit - used),
      limit: userLimit,
      globalUsed: day.total,
      globalRemaining: Math.max(0, serverLimit - day.total),
      globalLimit: serverLimit,
      allowed: !userBlocked && !globalBlocked,
      ...(userBlocked ? { reason: 'user' as const } : globalBlocked ? { reason: 'global' as const } : {}),
    };
  }

  async get(
    actorId: string,
    perUserLimit: number,
    globalLimit: number,
    now = new Date(),
  ): Promise<AiUsageSnapshot> {
    const today = currentViennaDate(now);
    const data = await this.read();
    this.normalize(data, today);
    return this.snapshot(data, actorId, perUserLimit, globalLimit, today);
  }

  async consume(
    actorId: string,
    perUserLimit: number,
    globalLimit: number,
    now = new Date(),
  ): Promise<AiUsageSnapshot> {
    const task = this.queue.then(async () => {
      const today = currentViennaDate(now);
      const data = await this.read();
      this.normalize(data, today);
      const before = this.snapshot(data, actorId, perUserLimit, globalLimit, today);
      if (!before.allowed) return before;

      const day = data.days[today];
      day.actors[actorId] = Number(day.actors[actorId] || 0) + 1;
      day.total += 1;
      await this.write(data);
      const after = this.snapshot(data, actorId, perUserLimit, globalLimit, today);
      // Die aktuelle Anfrage wurde bereits innerhalb des Limits reserviert.
      // remaining=0 bedeutet: Diese Anfrage darf noch laufen, die nächste wird blockiert.
      return { ...after, allowed: true, reason: undefined };
    });

    this.queue = task.then(() => undefined, () => undefined);
    return task;
  }
}

export function createAiUsageStore(dataDir: string): AiUsageStore {
  return new AiUsageStore(dataDir);
}

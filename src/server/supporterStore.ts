import fs from 'node:fs/promises';
import path from 'node:path';

export type SupportCadence = 'monthly' | 'yearly' | 'one-time';

export interface PublicSupporter {
  displayName: string;
  cadence?: SupportCadence;
  since?: string;
}

type SupporterData = {
  version: 1;
  supporters: PublicSupporter[];
};

const EMPTY_DATA: SupporterData = { version: 1, supporters: [] };

function cleanName(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').slice(0, 80)
    : '';
}

function cleanCadence(value: unknown): SupportCadence | undefined {
  return value === 'monthly' || value === 'yearly' || value === 'one-time' ? value : undefined;
}

function cleanSince(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  return value;
}

function sanitizeSupporter(value: unknown): PublicSupporter | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const displayName = cleanName(raw.displayName);
  if (!displayName) return null;
  return {
    displayName,
    cadence: cleanCadence(raw.cadence),
    since: cleanSince(raw.since),
  };
}

export class SupporterStore {
  private readonly filePath: string;
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, 'supporters.json');
  }

  private async read(): Promise<SupporterData> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<SupporterData>;
      const supporters = Array.isArray(parsed.supporters)
        ? parsed.supporters.map(sanitizeSupporter).filter(Boolean) as PublicSupporter[]
        : [];
      return { version: 1, supporters };
    } catch (error: any) {
      if (error?.code === 'ENOENT') return { ...EMPTY_DATA, supporters: [] };
      throw error;
    }
  }

  private async write(data: SupporterData): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true, mode: 0o700 });
    const tmp = this.filePath + '.tmp-' + process.pid;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
    await fs.rename(tmp, this.filePath);
  }

  async listPublic(): Promise<PublicSupporter[]> {
    const data = await this.read();
    return [...data.supporters].sort((a, b) => a.displayName.localeCompare(b.displayName, 'de'));
  }

  async replacePublic(input: unknown): Promise<PublicSupporter[]> {
    if (!Array.isArray(input)) throw new Error('INVALID_SUPPORTERS');
    const supporters = input
      .map(sanitizeSupporter)
      .filter(Boolean)
      .slice(0, 500) as PublicSupporter[];

    const task = this.writeQueue.then(async () => {
      await this.write({ version: 1, supporters });
      return this.listPublic();
    });
    this.writeQueue = task.then(() => undefined, () => undefined);
    return task;
  }
}

export function createSupporterStore(dataDir: string): SupporterStore {
  return new SupporterStore(dataDir);
}

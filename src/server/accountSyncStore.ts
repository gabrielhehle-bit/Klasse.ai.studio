import fs from 'node:fs/promises';
import path from 'node:path';

export type AccountSyncEncryptedPayload = {
  version: 1;
  algorithm: 'AES-GCM-256';
  iv: string;
  ciphertext: string;
};

export type AccountSyncVaultRecord = {
  version: 1;
  id: string;
  createdAt: string;
  updatedAt: string;
  passwordSalt: string;
  passwordKdfIterations: number;
  encryptedVaultKey: AccountSyncEncryptedPayload;
  recoverySalt: string;
  recoveryKdfIterations: number;
  recoveryWrappedVaultKey: AccountSyncEncryptedPayload;
};

export interface AccountSyncRecord {
  version: 1;
  userId: string;
  vaultRecord: AccountSyncVaultRecord;
  encryptedState: AccountSyncEncryptedPayload;
  revision: number;
  updatedAt: string;
}

const MAX_RECORD_BYTES = 20 * 1024 * 1024;
// Rolling encrypted recovery points: a bad but syntactically valid client upload
// must not erase the only copy of a teacher's original classroom.
const RECENT_HISTORY_LIMIT = 8;
const DAILY_HISTORY_LIMIT = 30;

function isBase64ish(value: unknown, minLength = 1): value is string {
  return typeof value === 'string'
    && value.length >= minLength
    && value.length <= MAX_RECORD_BYTES
    && /^[A-Za-z0-9+/=]+$/.test(value);
}

export function isAccountSyncEncryptedPayload(value: unknown): value is AccountSyncEncryptedPayload {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return item.version === 1
    && item.algorithm === 'AES-GCM-256'
    && isBase64ish(item.iv, 8)
    && isBase64ish(item.ciphertext, 16);
}

export function isAccountSyncVaultRecord(value: unknown): value is AccountSyncVaultRecord {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return item.version === 1
    && typeof item.id === 'string'
    && item.id.length >= 8
    && item.id.length <= 160
    && typeof item.createdAt === 'string'
    && typeof item.updatedAt === 'string'
    && isBase64ish(item.passwordSalt, 8)
    && Number.isInteger(item.passwordKdfIterations)
    && Number(item.passwordKdfIterations) >= 100_000
    && isAccountSyncEncryptedPayload(item.encryptedVaultKey)
    && isBase64ish(item.recoverySalt, 8)
    && Number.isInteger(item.recoveryKdfIterations)
    && Number(item.recoveryKdfIterations) >= 100_000
    && isAccountSyncEncryptedPayload(item.recoveryWrappedVaultKey);
}

function isSafeUserId(value: string): boolean {
  return /^[a-f0-9]{24}$/.test(value);
}

function cloneRecord(record: AccountSyncRecord): AccountSyncRecord {
  return JSON.parse(JSON.stringify(record));
}

export class AccountSyncStore {
  private readonly directory: string;
  private readonly queues = new Map<string, Promise<unknown>>();

  constructor(dataDir: string) {
    this.directory = path.join(dataDir, 'account-sync');
  }

  private filePath(userId: string): string {
    if (!isSafeUserId(userId)) throw new Error('INVALID_ACCOUNT');
    return path.join(this.directory, userId + '.json');
  }

  private historyDirectory(userId: string, kind: 'recent' | 'daily'): string {
    if (!isSafeUserId(userId)) throw new Error('INVALID_ACCOUNT');
    return path.join(this.directory, 'history', userId, kind);
  }

  /** Snapshot previous ciphertext *before* replacing the sole live account record.
   * If either recovery write fails, abort the upload and preserve the live record.
   * The server never decrypts student data; history is account-isolated.
   */
  private async archivePrevious(userId: string, previous: AccountSyncRecord): Promise<void> {
    const recent = this.historyDirectory(userId, 'recent');
    const daily = this.historyDirectory(userId, 'daily');
    await Promise.all([
      fs.mkdir(recent, { recursive: true, mode: 0o700 }),
      fs.mkdir(daily, { recursive: true, mode: 0o700 }),
    ]);
    const serialized = JSON.stringify(previous);
    const writeOnce = async (file: string) => {
      try {
        await fs.writeFile(file, serialized, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
      } catch (error: any) {
        if (error?.code !== 'EEXIST') throw error;
      }
    };
    await writeOnce(path.join(recent, previous.revision + '.json'));
    const day = new Date(previous.updatedAt).toISOString().slice(0, 10);
    await writeOnce(path.join(daily, day + '.json'));
  }

  private async trimHistory(userId: string): Promise<void> {
    const cleanup = async (kind: 'recent' | 'daily', max: number) => {
      const directory = this.historyDirectory(userId, kind);
      const files = (await fs.readdir(directory))
        .filter(name => kind === 'recent' ? /^[1-9][0-9]*\.json$/.test(name) : /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
        .sort(kind === 'recent'
          ? (a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10)
          : (a, b) => b.localeCompare(a));
      await Promise.all(files.slice(max).map(name => fs.unlink(path.join(directory, name))));
    };
    await cleanup('recent', RECENT_HISTORY_LIMIT);
    await cleanup('daily', DAILY_HISTORY_LIMIT);
  }

  /** Metadata only; no student names, class labels or plaintext on the server. */
  async listHistory(userId: string): Promise<Array<{ revision: number; updatedAt: string }>> {
    if (!isSafeUserId(userId)) throw new Error('INVALID_ACCOUNT');
    const entries = new Map<number, { revision: number; updatedAt: string }>();
    for (const kind of ['recent', 'daily'] as const) {
      const dir = this.historyDirectory(userId, kind);
      const names = await fs.readdir(dir).catch((error: any) => {
        if (error?.code === 'ENOENT') return [] as string[];
        throw error;
      });
      for (const name of names) {
        if (kind === 'recent' ? !/^[1-9][0-9]*\.json$/.test(name) : !/^\d{4}-\d{2}-\d{2}\.json$/.test(name)) continue;
        const record = await this.readHistoryFile(userId, path.join(dir, name));
        entries.set(record.revision, { revision: record.revision, updatedAt: record.updatedAt });
      }
    }
    return [...entries.values()].sort((a, b) => b.revision - a.revision);
  }

  private async readHistoryFile(userId: string, file: string): Promise<AccountSyncRecord> {
    const raw = await fs.readFile(file, 'utf8');
    if (Buffer.byteLength(raw, 'utf8') > MAX_RECORD_BYTES) throw new Error('PAYLOAD_TOO_LARGE');
    const record = JSON.parse(raw) as AccountSyncRecord;
    if (record.version !== 1 || record.userId !== userId
      || !isAccountSyncVaultRecord(record.vaultRecord)
      || !isAccountSyncEncryptedPayload(record.encryptedState)
      || !Number.isInteger(record.revision) || record.revision < 1
      || typeof record.updatedAt !== 'string') throw new Error('INVALID_STORED_RECORD');
    return record;
  }

  async getHistoryRevision(userId: string, revision: number): Promise<AccountSyncRecord | null> {
    if (!isSafeUserId(userId)) throw new Error('INVALID_ACCOUNT');
    if (!Number.isSafeInteger(revision) || revision < 1) return null;
    const recent = path.join(this.historyDirectory(userId, 'recent'), revision + '.json');
    try {
      return cloneRecord(await this.readHistoryFile(userId, recent));
    } catch (error: any) {
      if (error?.code !== 'ENOENT') throw error;
    }
    const daily = this.historyDirectory(userId, 'daily');
    const names = await fs.readdir(daily).catch((error: any) => {
      if (error?.code === 'ENOENT') return [] as string[];
      throw error;
    });
    for (const name of names) {
      if (!/^\d{4}-\d{2}-\d{2}\.json$/.test(name)) continue;
      const record = await this.readHistoryFile(userId, path.join(daily, name));
      if (record.revision === revision) return cloneRecord(record);
    }
    return null;
  }

  private async read(userId: string): Promise<AccountSyncRecord | null> {
    try {
      const raw = await fs.readFile(this.filePath(userId), 'utf8');
      if (Buffer.byteLength(raw, 'utf8') > MAX_RECORD_BYTES) throw new Error('PAYLOAD_TOO_LARGE');
      const parsed = JSON.parse(raw) as Partial<AccountSyncRecord>;
      if (
        parsed.version !== 1
        || parsed.userId !== userId
        || !isAccountSyncVaultRecord(parsed.vaultRecord)
        || !isAccountSyncEncryptedPayload(parsed.encryptedState)
        || !Number.isInteger(parsed.revision)
        || Number(parsed.revision) < 1
        || typeof parsed.updatedAt !== 'string'
      ) {
        throw new Error('INVALID_STORED_RECORD');
      }
      return parsed as AccountSyncRecord;
    } catch (error: any) {
      if (error?.code === 'ENOENT') return null;
      throw error;
    }
  }

  async get(userId: string): Promise<AccountSyncRecord | null> {
    const record = await this.read(userId);
    return record ? cloneRecord(record) : null;
  }

  async put(
    userId: string,
    input: {
      vaultRecord: unknown;
      encryptedState: unknown;
      expectedRevision: unknown;
    },
  ): Promise<AccountSyncRecord> {
    if (!isSafeUserId(userId)) throw new Error('INVALID_ACCOUNT');
    if (!isAccountSyncVaultRecord(input.vaultRecord) || !isAccountSyncEncryptedPayload(input.encryptedState)) {
      throw new Error('INVALID_PAYLOAD');
    }
    const vaultRecord = input.vaultRecord;
    const encryptedState = input.encryptedState;
    if (!Number.isInteger(input.expectedRevision) || Number(input.expectedRevision) < 0) {
      throw new Error('INVALID_REVISION');
    }

    const serializedCandidate = JSON.stringify({
      vaultRecord,
      encryptedState,
    });
    if (Buffer.byteLength(serializedCandidate, 'utf8') > MAX_RECORD_BYTES) {
      throw new Error('PAYLOAD_TOO_LARGE');
    }

    const previousQueue = this.queues.get(userId) || Promise.resolve();
    const task = previousQueue.then(async () => {
      const existing = await this.read(userId);
      const expectedRevision = Number(input.expectedRevision);

      if (!existing) {
        if (expectedRevision !== 0) throw new Error('REVISION_CONFLICT');
      } else {
        if (expectedRevision !== existing.revision) throw new Error('REVISION_CONFLICT');
        if (existing.vaultRecord.id !== vaultRecord.id) throw new Error('VAULT_MISMATCH');
      }

      const next: AccountSyncRecord = {
        version: 1,
        userId,
        vaultRecord: JSON.parse(JSON.stringify(vaultRecord)),
        encryptedState: JSON.parse(JSON.stringify(encryptedState)),
        revision: (existing?.revision || 0) + 1,
        updatedAt: new Date().toISOString(),
      };

      // Never acknowledge a new revision before the previous ciphertext is durable.
      if (existing) await this.archivePrevious(userId, existing);
      await fs.mkdir(this.directory, { recursive: true, mode: 0o700 });
      const target = this.filePath(userId);
      const temp = target + '.tmp-' + process.pid + '-' + Date.now();
      await fs.writeFile(temp, JSON.stringify(next), { encoding: 'utf8', mode: 0o600 });
      await fs.rename(temp, target);
      if (existing) {
        // Recovery retention is best effort, but creating each new recovery point
        // above is mandatory. A cleanup failure must not invalidate a committed PUT.
        try { await this.trimHistory(userId); }
        catch (error) { console.warn('[AccountSync] Encrypted history cleanup failed:', error); }
      }
      return cloneRecord(next);
    });

    this.queues.set(userId, task.then(() => undefined, () => undefined));
    return task;
  }
}

export function createAccountSyncStore(dataDir: string): AccountSyncStore {
  return new AccountSyncStore(dataDir);
}

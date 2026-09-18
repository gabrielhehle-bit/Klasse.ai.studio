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

      await fs.mkdir(this.directory, { recursive: true, mode: 0o700 });
      const target = this.filePath(userId);
      const temp = target + '.tmp-' + process.pid + '-' + Date.now();
      await fs.writeFile(temp, JSON.stringify(next), { encoding: 'utf8', mode: 0o600 });
      await fs.rename(temp, target);
      return cloneRecord(next);
    });

    this.queues.set(userId, task.then(() => undefined, () => undefined));
    return task;
  }
}

export function createAccountSyncStore(dataDir: string): AccountSyncStore {
  return new AccountSyncStore(dataDir);
}

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Server-side ciphertext blob store. No filenames, subject IDs, file keys or
 * MaterialItem metadata ever leave the vault. This API is feature-gated and
 * must NOT be enabled before file-inclusive backup/recovery is implemented.
 */
const USER_ID = /^[a-f0-9]{24}$/;
const ATTACHMENT_ID = /^[a-f0-9]{32}$/;
export const ATTACHMENT_FILE_MAX_BYTES = 25 * 1024 * 1024 + 16;
export const ATTACHMENT_FREE_QUOTA_BYTES = 100 * 1024 * 1024;

export class AttachmentStorageError extends Error {
  constructor(readonly code: 'INVALID_ID' | 'INVALID_BLOB' | 'QUOTA_EXCEEDED' | 'FILE_EXISTS' | 'NOT_FOUND', readonly status: number) {
    super(code);
    this.name = 'AttachmentStorageError';
  }
}

function validateId(userId: string, attachmentId: string): void {
  if (!USER_ID.test(userId) || !ATTACHMENT_ID.test(attachmentId)) {
    throw new AttachmentStorageError('INVALID_ID', 400);
  }
}

export class EncryptedAttachmentStore {
  private readonly root: string;
  private readonly queues = new Map<string, Promise<unknown>>();

  constructor(dataDir: string) {
    this.root = path.join(dataDir, 'material-attachments');
  }

  private directory(userId: string): string {
    if (!USER_ID.test(userId)) throw new AttachmentStorageError('INVALID_ID', 400);
    return path.join(this.root, userId);
  }

  private filePath(userId: string, attachmentId: string): string {
    validateId(userId, attachmentId);
    return path.join(this.directory(userId), attachmentId + '.blob');
  }

  private enqueue<T>(userId: string, work: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(userId) || Promise.resolve();
    const task = previous.catch(() => undefined).then(work);
    const complete = task.then(() => undefined, () => undefined);
    this.queues.set(userId, complete);
    void complete.then(() => { if (this.queues.get(userId) === complete) this.queues.delete(userId); });
    return task;
  }

  private async sizeUsed(userId: string): Promise<number> {
    const directory = this.directory(userId);
    let files: string[];
    try { files = await fs.readdir(directory); }
    catch (error: any) {
      if (error?.code === 'ENOENT') return 0;
      throw error;
    }
    let total = 0;
    for (const name of files) {
      if (!/^[a-f0-9]{32}\.blob$/.test(name)) continue;
      const stat = await fs.lstat(path.join(directory, name));
      if (!stat.isFile()) throw new Error('UNSAFE_ATTACHMENT_FILE');
      total += stat.size;
    }
    return total;
  }

  /** Stores already encrypted binary only; never accepts a browser-provided path. */
  async put(
    userId: string, attachmentId: string, ciphertext: Uint8Array,
    quotaBytes = ATTACHMENT_FREE_QUOTA_BYTES,
  ): Promise<{ usedBytes: number; size: number }> {
    validateId(userId, attachmentId);
    if (!(ciphertext instanceof Uint8Array) || ciphertext.byteLength < 16
      || ciphertext.byteLength > ATTACHMENT_FILE_MAX_BYTES) {
      throw new AttachmentStorageError('INVALID_BLOB', 413);
    }
    if (!Number.isSafeInteger(quotaBytes) || quotaBytes <= 0) {
      throw new AttachmentStorageError('QUOTA_EXCEEDED', 413);
    }
    return this.enqueue(userId, async () => {
      const target = this.filePath(userId, attachmentId);
      // An existing attachment must never be overwritten: the encrypted
      // AppState may still point to its original ciphertext hash.
      try {
        await fs.lstat(target);
        throw new AttachmentStorageError('FILE_EXISTS', 409);
      } catch (error: any) {
        if (error?.code !== 'ENOENT') throw error;
      }
      const usedBytes = await this.sizeUsed(userId);
      if (usedBytes + ciphertext.byteLength > quotaBytes) {
        throw new AttachmentStorageError('QUOTA_EXCEEDED', 413);
      }
      await fs.mkdir(this.directory(userId), { recursive: true, mode: 0o700 });
      const staging = target + '.' + crypto.randomBytes(12).toString('hex') + '.tmp';
      try {
        await fs.writeFile(staging, ciphertext, { mode: 0o600, flag: 'wx' });
        // Single-instance account queue and no-overwrite make the filename
        // immutable; stage under same directory so rename is atomic.
        await fs.rename(staging, target);
      } finally {
        await fs.rm(staging, { force: true }).catch(() => {});
      }
      return { usedBytes: usedBytes + ciphertext.byteLength, size: ciphertext.byteLength };
    });
  }

  async get(userId: string, attachmentId: string): Promise<Buffer> {
    const target = this.filePath(userId, attachmentId);
    let value: Buffer;
    try { value = await fs.readFile(target); }
    catch (error: any) {
      if (error?.code === 'ENOENT') throw new AttachmentStorageError('NOT_FOUND', 404);
      throw error;
    }
    if (value.byteLength < 16 || value.byteLength > ATTACHMENT_FILE_MAX_BYTES) {
      throw new AttachmentStorageError('INVALID_BLOB', 500);
    }
    return value;
  }

  async delete(userId: string, attachmentId: string): Promise<void> {
    const target = this.filePath(userId, attachmentId);
    await this.enqueue(userId, async () => {
      // Deletion will only be wired into the UI once restore/recovery verifies
      // that the remaining manifest and external ciphertext are consistent.
      try { await fs.unlink(target); }
      catch (error: any) {
        if (error?.code === 'ENOENT') throw new AttachmentStorageError('NOT_FOUND', 404);
        throw error;
      }
    });
  }

  async usage(userId: string): Promise<{ usedBytes: number; quotaBytes: number }> {
    return { usedBytes: await this.sizeUsed(userId), quotaBytes: ATTACHMENT_FREE_QUOTA_BYTES };
  }
}

export function createEncryptedAttachmentStore(dataDir: string): EncryptedAttachmentStore {
  return new EncryptedAttachmentStore(dataDir);
}

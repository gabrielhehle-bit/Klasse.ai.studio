import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface CanvaStoredTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  scope?: string;
  token_type?: string;
}

interface EncryptedCanvaSession {
  version: 1;
  ownerId: string;
  sessionHash: string;
  iv: string;
  tag: string;
  ciphertext: string;
  expiresAt: number;
}

const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_RECORD_BYTES = 16 * 1024;
const ID_PATTERN = /^[a-f0-9]{24}$/;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

export class CanvaTokenStore {
  private readonly dir: string;
  private readonly key: Buffer;

  constructor(dataDir: string, encryptionSecret: string) {
    if (!encryptionSecret || encryptionSecret.length < 32) throw new Error('INVALID_CANVA_TOKEN_KEY');
    this.dir = path.join(dataDir, 'canva-tokens');
    this.key = crypto.createHash('sha256').update('klassio-canva-v1:' + encryptionSecret).digest();
  }

  private filePath(userId: string): string {
    if (!ID_PATTERN.test(userId)) throw new Error('INVALID_ACCOUNT');
    return path.join(this.dir, userId + '.json');
  }

  private sessionHash(sessionId: string): string {
    if (!TOKEN_PATTERN.test(sessionId)) throw new Error('INVALID_CANVA_SESSION');
    return crypto.createHmac('sha256', this.key).update('klassio-canva-cookie-v1:' + sessionId).digest('hex');
  }

  private async read(userId: string): Promise<EncryptedCanvaSession | null> {
    let raw: string;
    try {
      raw = await fs.readFile(this.filePath(userId), 'utf8');
    } catch (error: any) {
      if (error?.code === 'ENOENT') return null;
      throw error;
    }
    if (Buffer.byteLength(raw, 'utf8') > MAX_RECORD_BYTES) throw new Error('CANVA_RECORD_TOO_LARGE');
    const data = JSON.parse(raw) as EncryptedCanvaSession;
    if (data.version !== 1 || data.ownerId !== userId || !/^[a-f0-9]{64}$/.test(data.sessionHash)
      || typeof data.iv !== 'string' || typeof data.tag !== 'string' || typeof data.ciphertext !== 'string'
      || !Number.isFinite(data.expiresAt)) throw new Error('INVALID_CANVA_RECORD');
    return data;
  }

  private async write(userId: string, data: EncryptedCanvaSession): Promise<void> {
    const filePath = this.filePath(userId);
    await fs.mkdir(this.dir, { recursive: true, mode: 0o700 });
    const temp = filePath + '.' + crypto.randomBytes(12).toString('hex') + '.tmp';
    try {
      await fs.writeFile(temp, JSON.stringify(data), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
      await fs.rename(temp, filePath);
    } finally {
      await fs.rm(temp, { force: true }).catch(() => {});
    }
  }

  async put(userId: string, sessionId: string, tokens: CanvaStoredTokens): Promise<void> {
    if (!tokens.access_token || !Number.isFinite(tokens.expires_at)) throw new Error('INVALID_CANVA_TOKENS');
    const hash = this.sessionHash(sessionId);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    cipher.setAAD(Buffer.from(userId + ':' + hash));
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(tokens), 'utf8'), cipher.final()]);
    const record: EncryptedCanvaSession = {
      version: 1, ownerId: userId, sessionHash: hash,
      iv: iv.toString('base64url'), tag: cipher.getAuthTag().toString('base64url'),
      ciphertext: ciphertext.toString('base64url'), expiresAt: Date.now() + SESSION_MS,
    };
    if (Buffer.byteLength(JSON.stringify(record), 'utf8') > MAX_RECORD_BYTES) throw new Error('CANVA_RECORD_TOO_LARGE');
    await this.write(userId, record);
  }

  async get(userId: string, sessionId: string | undefined): Promise<CanvaStoredTokens | null> {
    if (!sessionId || !TOKEN_PATTERN.test(sessionId)) return null;
    const record = await this.read(userId);
    if (!record || record.expiresAt <= Date.now()) return null;
    const supplied = this.sessionHash(sessionId);
    if (!crypto.timingSafeEqual(Buffer.from(record.sessionHash, 'hex'), Buffer.from(supplied, 'hex'))) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, Buffer.from(record.iv, 'base64url'));
    decipher.setAAD(Buffer.from(userId + ':' + supplied));
    decipher.setAuthTag(Buffer.from(record.tag, 'base64url'));
    const payload = Buffer.concat([
      decipher.update(Buffer.from(record.ciphertext, 'base64url')), decipher.final(),
    ]).toString('utf8');
    const tokens = JSON.parse(payload) as CanvaStoredTokens;
    if (typeof tokens.access_token !== 'string' || !Number.isFinite(tokens.expires_at)) throw new Error('INVALID_CANVA_TOKENS');
    return tokens;
  }

  async delete(userId: string, sessionId: string | undefined): Promise<void> {
    if (!sessionId || !TOKEN_PATTERN.test(sessionId)) return;
    const record = await this.read(userId);
    if (!record) return;
    const supplied = this.sessionHash(sessionId);
    if (!crypto.timingSafeEqual(Buffer.from(record.sessionHash, 'hex'), Buffer.from(supplied, 'hex'))) return;
    await fs.rm(this.filePath(userId), { force: true });
  }
}

export function createCanvaTokenStore(dataDir: string, secret: string): CanvaTokenStore {
  return new CanvaTokenStore(dataDir, secret);
}

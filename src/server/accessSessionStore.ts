import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// An allowlist, not only a signature: logout must invalidate a stolen session.
// This file contains SHA-256 token hashes only, never session tokens or student data.
// A single Node server owns the store; multi-instance deployments need a shared DB.
type SessionRecord = { expiresAt: number; userId?: string };
export class AccessSessionStore {
  private readonly filename: string | null;
  private sessions: Record<string, SessionRecord> = Object.create(null);

  constructor(dataDir: string | null) {
    this.filename = dataDir ? path.join(dataDir, 'access-sessions.json') : null;
    if (!this.filename || !fs.existsSync(this.filename)) return;
    // Fail closed if the registry cannot be read, rather than re-enabling revoked sessions.
    const parsed: unknown = JSON.parse(fs.readFileSync(this.filename, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('INVALID_SESSION_REGISTRY');
    for (const [key, value] of Object.entries(parsed)) {
      const record = value as Partial<SessionRecord>;
      if (!/^[a-f0-9]{64}$/.test(key) || !Number.isSafeInteger(record?.expiresAt)) throw new Error('INVALID_SESSION_REGISTRY');
      if (record.expiresAt! > Date.now()) {
        this.sessions[key] = {
          expiresAt: record.expiresAt!,
          ...(typeof record.userId === 'string' ? { userId: record.userId } : {}),
        };
      }
    }
  }

  private tokenHash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private save(): void {
    if (!this.filename) return;
    fs.mkdirSync(path.dirname(this.filename), { recursive: true, mode: 0o700 });
    const temporary = this.filename + '.tmp-' + process.pid;
    fs.writeFileSync(temporary, JSON.stringify(this.sessions), { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(temporary, this.filename);
  }

  issue(token: string, expiresAt: number, userId?: string): void {
    for (const [hash, entry] of Object.entries(this.sessions)) {
      if (entry.expiresAt <= Date.now()) delete this.sessions[hash];
    }
    this.sessions[this.tokenHash(token)] = { expiresAt, ...(userId ? { userId } : {}) };
    this.save();
  }

  isActive(token: string): boolean {
    return (this.sessions[this.tokenHash(token)]?.expiresAt || 0) > Date.now();
  }

  revoke(token: string | undefined): void {
    if (!token) return;
    delete this.sessions[this.tokenHash(token)];
    this.save();
  }

  revokeUser(userId: string): void {
    for (const [hash, record] of Object.entries(this.sessions)) {
      if (record.userId === userId) delete this.sessions[hash];
    }
    this.save();
  }
}

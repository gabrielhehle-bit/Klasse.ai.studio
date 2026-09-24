import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import type { TeacherIdentity } from './teacherIdentity';

export type TeamTeachingRole = 'owner' | 'editor' | 'viewer';

export interface TeamTeachingDeviceKey {
  deviceId: string;
  userId: string;
  schoolId: string;
  publicKeyJwk: Record<string, unknown>;
  fingerprint: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamTeachingMember {
  userId: string;
  displayName: string;
  role: TeamTeachingRole;
  wrappedKeys: Record<string, string>;
  addedAt: string;
}

export interface SharedClassRecord {
  id: string;
  schoolId: string;
  classLabel: string;
  ownerUserId: string;
  members: TeamTeachingMember[];
  encryptedSnapshot: unknown;
  revision: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  /** Content timestamps do not change when a colleague or device is added. */
  contentUpdatedAt?: string;
  contentUpdatedBy?: string;
}

export interface SharedClassHistoryEntry {
  revision: number;
  updatedAt: string;
  updatedBy: string;
  encryptedSnapshot: unknown;
}

type StoreData = {
  version: 1;
  devices: Record<string, Record<string, TeamTeachingDeviceKey[]>>;
  classes: Record<string, SharedClassRecord[]>;
};

const EMPTY_DATA: StoreData = {
  version: 1,
  devices: {},
  classes: {},
};

function emptyData(): StoreData {
  return { version: 1, devices: {}, classes: {} };
}

function cleanLabel(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 80) : '';
}

function isDeviceId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{12,80}$/.test(value);
}

function isPublicRsaJwk(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const jwk = value as Record<string, unknown>;
  return jwk.kty === 'RSA'
    && typeof jwk.n === 'string'
    && jwk.n.length >= 128
    && typeof jwk.e === 'string'
    && jwk.e.length >= 2
    && jwk.d === undefined;
}

function isEncryptedSnapshot(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Record<string, unknown>;
  return payload.version === 1
    && payload.algorithm === 'AES-GCM-256'
    && typeof payload.iv === 'string'
    && payload.iv.length > 8
    && typeof payload.ciphertext === 'string'
    && payload.ciphertext.length >= 16;
}

function isWrappedKey(value: unknown): value is string {
  return typeof value === 'string'
    && value.length >= 128
    && value.length <= 4096
    && /^[A-Za-z0-9+/=]+$/.test(value);
}

function isRole(value: unknown): value is Exclude<TeamTeachingRole, 'owner'> {
  return value === 'editor' || value === 'viewer';
}

function publicKeyFingerprint(jwk: Record<string, unknown>): string {
  const canonical = JSON.stringify({
    kty: jwk.kty,
    n: jwk.n,
    e: jwk.e,
    alg: jwk.alg || 'RSA-OAEP-256',
  });
  return crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 24);
}

function cloneRecord(record: SharedClassRecord): SharedClassRecord {
  return JSON.parse(JSON.stringify(record));
}

export class ClassCollaborationStore {
  private readonly filePath: string;
  private readonly historyRoot: string;
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, 'teamteaching.json');
    this.historyRoot = path.join(dataDir, 'teamteaching-history');
  }

  private async read(): Promise<StoreData> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<StoreData>;
      if (parsed.version !== 1 || typeof parsed.devices !== 'object' || typeof parsed.classes !== 'object') {
        return emptyData();
      }
      return {
        version: 1,
        devices: parsed.devices || {},
        classes: parsed.classes || {},
      };
    } catch (error: any) {
      if (error?.code === 'ENOENT') return emptyData();
      throw error;
    }
  }

  private async write(data: StoreData): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true, mode: 0o700 });
    const tempPath = this.filePath + '.tmp-' + process.pid;
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
    await fs.rename(tempPath, this.filePath);
  }

  /** Persist ciphertext before replacing the live snapshot. Fail closed if the recovery copy fails. */
  private async archiveSnapshot(record: SharedClassRecord): Promise<void> {
    const dir = path.join(this.historyRoot, record.id);
    await fs.mkdir(dir, { recursive: true, mode: 0o700 });
    const archived: SharedClassHistoryEntry = {
      revision: record.revision,
      updatedAt: record.contentUpdatedAt || (record.revision === 1 ? record.createdAt : record.updatedAt),
      updatedBy: record.contentUpdatedBy || (record.revision === 1 ? record.ownerUserId : record.updatedBy),
      encryptedSnapshot: record.encryptedSnapshot,
    };
    const filename = path.join(dir, String(record.revision) + '.json');
    try {
      await fs.writeFile(filename, JSON.stringify(archived), { flag: 'wx', mode: 0o600 });
    } catch (error: any) {
      if (error?.code !== 'EEXIST') throw error;
      const previous = JSON.parse(await fs.readFile(filename, 'utf8')) as SharedClassHistoryEntry;
      if (JSON.stringify(previous) !== JSON.stringify(archived)) throw new Error('HISTORY_INTEGRITY_ERROR');
    }
  }

  /** Authorization is checked against the CURRENT membership, not historical memberships. */
  async listClassHistory(identity: TeacherIdentity, classId: string): Promise<Array<Omit<SharedClassHistoryEntry, 'encryptedSnapshot'>>> {
    const current = await this.getClass(identity, classId);
    const directory = path.join(this.historyRoot, current.id);
    const result: Array<Omit<SharedClassHistoryEntry, 'encryptedSnapshot'>> = [{
      revision: current.revision,
      updatedAt: current.contentUpdatedAt || (current.revision === 1 ? current.createdAt : current.updatedAt),
      updatedBy: current.contentUpdatedBy || (current.revision === 1 ? current.ownerUserId : current.updatedBy),
    }];
    let filenames: string[];
    try { filenames = await fs.readdir(directory); }
    catch (error: any) { if (error?.code === 'ENOENT') return result; throw error; }
    for (const filename of filenames) {
      if (!/^[1-9][0-9]*\.json$/.test(filename)) continue;
      const revision = Number(filename.slice(0, -5));
      if (!Number.isSafeInteger(revision) || revision >= current.revision) continue;
      const entry = await this.readClassHistoryEntry(current.id, revision);
      if (entry) result.push({ revision: entry.revision, updatedAt: entry.updatedAt, updatedBy: entry.updatedBy });
    }
    return result.sort((a, b) => b.revision - a.revision);
  }

  private async readClassHistoryEntry(classId: string, revision: number): Promise<SharedClassHistoryEntry | null> {
    if (!Number.isSafeInteger(revision) || revision < 1) return null;
    try {
      const entry = JSON.parse(await fs.readFile(path.join(this.historyRoot, classId, String(revision) + '.json'), 'utf8')) as SharedClassHistoryEntry;
      if (entry.revision !== revision || !isEncryptedSnapshot(entry.encryptedSnapshot)
        || typeof entry.updatedAt !== 'string' || typeof entry.updatedBy !== 'string') throw new Error('HISTORY_INTEGRITY_ERROR');
      return entry;
    } catch (error: any) { if (error?.code === 'ENOENT') return null; throw error; }
  }

  async getClassHistoryRevision(identity: TeacherIdentity, classId: string, revision: number): Promise<SharedClassHistoryEntry | null> {
    const current = await this.getClass(identity, classId);
    if (revision === current.revision) return {
      revision: current.revision,
      updatedAt: current.contentUpdatedAt || (current.revision === 1 ? current.createdAt : current.updatedAt),
      updatedBy: current.contentUpdatedBy || (current.revision === 1 ? current.ownerUserId : current.updatedBy),
      encryptedSnapshot: current.encryptedSnapshot,
    };
    if (revision >= current.revision) return null;
    return this.readClassHistoryEntry(current.id, revision);
  }

  private mutate<T>(fn: (data: StoreData) => T | Promise<T>): Promise<T> {
    const task = this.writeQueue.then(async () => {
      const data = await this.read();
      const result = await fn(data);
      await this.write(data);
      return result;
    });
    this.writeQueue = task.then(() => undefined, () => undefined);
    return task;
  }

  async registerDevice(
    identity: TeacherIdentity,
    input: { deviceId: unknown; publicKeyJwk: unknown },
  ): Promise<TeamTeachingDeviceKey> {
    if (!isDeviceId(input.deviceId) || !isPublicRsaJwk(input.publicKeyJwk)) {
      throw new Error('INVALID_DEVICE_KEY');
    }

    const deviceId = input.deviceId;
    const publicKeyJwk = input.publicKeyJwk;
    return this.mutate(data => {
      const now = new Date().toISOString();
      const schoolDevices = data.devices[identity.schoolId] || (data.devices[identity.schoolId] = {});
      const devices = schoolDevices[identity.userId] || (schoolDevices[identity.userId] = []);
      const existing = devices.find(device => device.deviceId === deviceId);
      const fingerprint = publicKeyFingerprint(publicKeyJwk);

      if (existing) {
        existing.publicKeyJwk = publicKeyJwk;
        existing.fingerprint = fingerprint;
        existing.updatedAt = now;
        return { ...existing };
      }

      const created: TeamTeachingDeviceKey = {
        deviceId,
        userId: identity.userId,
        schoolId: identity.schoolId,
        publicKeyJwk,
        fingerprint,
        createdAt: now,
        updatedAt: now,
      };
      devices.push(created);
      return { ...created };
    });
  }

  async listUserDevices(identity: TeacherIdentity, userId: string): Promise<TeamTeachingDeviceKey[]> {
    const data = await this.read();
    return [...(data.devices[identity.schoolId]?.[userId] || [])].map(device => ({ ...device }));
  }

  async createSharedClass(
    identity: TeacherIdentity,
    input: {
      classLabel: unknown;
      encryptedSnapshot: unknown;
      wrappedKeys: unknown;
    },
  ): Promise<SharedClassRecord> {
    const classLabel = cleanLabel(input.classLabel);
    if (!classLabel || !isEncryptedSnapshot(input.encryptedSnapshot)) {
      throw new Error('INVALID_SHARED_CLASS');
    }
    if (!input.wrappedKeys || typeof input.wrappedKeys !== 'object' || Array.isArray(input.wrappedKeys)) {
      throw new Error('INVALID_WRAPPED_KEYS');
    }

    return this.mutate(data => {
      const registered = data.devices[identity.schoolId]?.[identity.userId] || [];
      const rawWrapped = input.wrappedKeys as Record<string, unknown>;
      const wrappedKeys: Record<string, string> = {};
      for (const device of registered) {
        const candidate = rawWrapped[device.deviceId];
        if (isWrappedKey(candidate)) wrappedKeys[device.deviceId] = candidate;
      }
      if (!Object.keys(wrappedKeys).length) throw new Error('NO_OWNER_DEVICE_KEY');

      const now = new Date().toISOString();
      const record: SharedClassRecord = {
        id: crypto.randomUUID(),
        schoolId: identity.schoolId,
        classLabel,
        ownerUserId: identity.userId,
        members: [{
          userId: identity.userId,
          displayName: identity.displayName,
          role: 'owner',
          wrappedKeys,
          addedAt: now,
        }],
        encryptedSnapshot: input.encryptedSnapshot,
        revision: 1,
        createdAt: now,
        updatedAt: now,
        updatedBy: identity.userId,
        contentUpdatedAt: now,
        contentUpdatedBy: identity.userId,
      };
      const classes = data.classes[identity.schoolId] || (data.classes[identity.schoolId] = []);
      classes.push(record);
      return cloneRecord(record);
    });
  }

  async listClasses(identity: TeacherIdentity): Promise<SharedClassRecord[]> {
    const data = await this.read();
    return (data.classes[identity.schoolId] || [])
      .filter(record => record.members.some(member => member.userId === identity.userId))
      .map(cloneRecord)
      .sort((a, b) => a.classLabel.localeCompare(b.classLabel, 'de'));
  }

  async getClass(identity: TeacherIdentity, classId: string): Promise<SharedClassRecord> {
    const data = await this.read();
    const record = (data.classes[identity.schoolId] || []).find(item => item.id === classId);
    if (!record) throw new Error('CLASS_NOT_FOUND');
    if (!record.members.some(member => member.userId === identity.userId)) throw new Error('FORBIDDEN');
    return cloneRecord(record);
  }

  async addMember(
    identity: TeacherIdentity,
    classId: string,
    input: {
      userId: string;
      displayName: string;
      role: unknown;
      wrappedKeys: unknown;
    },
  ): Promise<SharedClassRecord> {
    if (!isRole(input.role)) throw new Error('INVALID_ROLE');
    const memberRole: Exclude<TeamTeachingRole, 'owner'> = input.role;
    if (!input.userId || !input.displayName.trim()) throw new Error('INVALID_MEMBER');
    if (!input.wrappedKeys || typeof input.wrappedKeys !== 'object' || Array.isArray(input.wrappedKeys)) {
      throw new Error('INVALID_WRAPPED_KEYS');
    }

    return this.mutate(data => {
      const record = (data.classes[identity.schoolId] || []).find(item => item.id === classId);
      if (!record) throw new Error('CLASS_NOT_FOUND');
      if (record.ownerUserId !== identity.userId) throw new Error('OWNER_REQUIRED');
      if (input.userId === record.ownerUserId) throw new Error('INVALID_MEMBER');

      const registered = data.devices[identity.schoolId]?.[input.userId] || [];
      const rawWrapped = input.wrappedKeys as Record<string, unknown>;
      const wrappedKeys: Record<string, string> = {};
      for (const device of registered) {
        const candidate = rawWrapped[device.deviceId];
        if (isWrappedKey(candidate)) wrappedKeys[device.deviceId] = candidate;
      }
      if (!Object.keys(wrappedKeys).length) throw new Error('MEMBER_DEVICE_REQUIRED');

      const now = new Date().toISOString();
      const existing = record.members.find(member => member.userId === input.userId);
      if (existing) {
        existing.displayName = input.displayName.trim().slice(0, 100);
        existing.role = memberRole;
        existing.wrappedKeys = wrappedKeys;
      } else {
        record.members.push({
          userId: input.userId,
          displayName: input.displayName.trim().slice(0, 100),
          role: memberRole,
          wrappedKeys,
          addedAt: now,
        });
      }
      record.updatedAt = now;
      record.updatedBy = identity.userId;
      return cloneRecord(record);
    });
  }

  async updateMemberKeys(
    identity: TeacherIdentity,
    classId: string,
    userId: string,
    wrappedKeysInput: unknown,
  ): Promise<SharedClassRecord> {
    if (!wrappedKeysInput || typeof wrappedKeysInput !== 'object' || Array.isArray(wrappedKeysInput)) {
      throw new Error('INVALID_WRAPPED_KEYS');
    }

    return this.mutate(data => {
      const record = (data.classes[identity.schoolId] || []).find(item => item.id === classId);
      if (!record) throw new Error('CLASS_NOT_FOUND');
      const requester = record.members.find(member => member.userId === identity.userId);
      if (!requester) throw new Error('FORBIDDEN');
      if (record.ownerUserId !== identity.userId && identity.userId !== userId) {
        throw new Error('OWNER_REQUIRED');
      }

      const member = record.members.find(item => item.userId === userId);
      if (!member) throw new Error('MEMBER_NOT_FOUND');

      const registered = data.devices[identity.schoolId]?.[userId] || [];
      const rawWrapped = wrappedKeysInput as Record<string, unknown>;
      const wrappedKeys: Record<string, string> = {};
      for (const device of registered) {
        const candidate = rawWrapped[device.deviceId];
        if (isWrappedKey(candidate)) wrappedKeys[device.deviceId] = candidate;
      }
      if (!Object.keys(wrappedKeys).length) throw new Error('MEMBER_DEVICE_REQUIRED');

      member.wrappedKeys = wrappedKeys;
      record.updatedAt = new Date().toISOString();
      record.updatedBy = identity.userId;
      return cloneRecord(record);
    });
  }

  async updateMemberRole(
    identity: TeacherIdentity,
    classId: string,
    userId: string,
    role: unknown,
  ): Promise<SharedClassRecord> {
    if (!isRole(role)) throw new Error('INVALID_ROLE');
    const nextRole: Exclude<TeamTeachingRole, 'owner'> = role;
    return this.mutate(data => {
      const record = (data.classes[identity.schoolId] || []).find(item => item.id === classId);
      if (!record) throw new Error('CLASS_NOT_FOUND');
      if (record.ownerUserId !== identity.userId) throw new Error('OWNER_REQUIRED');
      const member = record.members.find(item => item.userId === userId);
      if (!member || member.role === 'owner') throw new Error('MEMBER_NOT_FOUND');
      member.role = nextRole;
      record.updatedAt = new Date().toISOString();
      record.updatedBy = identity.userId;
      return cloneRecord(record);
    });
  }

  async removeMember(identity: TeacherIdentity, classId: string, userId: string): Promise<SharedClassRecord> {
    return this.mutate(data => {
      const record = (data.classes[identity.schoolId] || []).find(item => item.id === classId);
      if (!record) throw new Error('CLASS_NOT_FOUND');
      if (record.ownerUserId !== identity.userId) throw new Error('OWNER_REQUIRED');
      if (userId === record.ownerUserId) throw new Error('INVALID_MEMBER');

      const index = record.members.findIndex(member => member.userId === userId);
      if (index < 0) throw new Error('MEMBER_NOT_FOUND');
      record.members.splice(index, 1);
      record.updatedAt = new Date().toISOString();
      record.updatedBy = identity.userId;
      return cloneRecord(record);
    });
  }

  async updateSnapshot(
    identity: TeacherIdentity,
    classId: string,
    input: { encryptedSnapshot: unknown; expectedRevision: unknown },
  ): Promise<SharedClassRecord> {
    if (!isEncryptedSnapshot(input.encryptedSnapshot) || !Number.isInteger(input.expectedRevision)) {
      throw new Error('INVALID_SHARED_CLASS');
    }

    return this.mutate(async data => {
      const record = (data.classes[identity.schoolId] || []).find(item => item.id === classId);
      if (!record) throw new Error('CLASS_NOT_FOUND');
      const member = record.members.find(item => item.userId === identity.userId);
      if (!member) throw new Error('FORBIDDEN');
      if (member.role === 'viewer') throw new Error('READ_ONLY');
      if (record.revision !== input.expectedRevision) throw new Error('REVISION_CONFLICT');

      await this.archiveSnapshot(record);
      record.encryptedSnapshot = input.encryptedSnapshot;
      record.revision += 1;
      record.updatedAt = new Date().toISOString();
      record.updatedBy = identity.userId;
      record.contentUpdatedAt = record.updatedAt;
      record.contentUpdatedBy = identity.userId;
      return cloneRecord(record);
    });
  }

  async deleteClass(identity: TeacherIdentity, classId: string): Promise<void> {
    return this.mutate(data => {
      const classes = data.classes[identity.schoolId] || [];
      const index = classes.findIndex(item => item.id === classId);
      if (index < 0) throw new Error('CLASS_NOT_FOUND');
      if (classes[index].ownerUserId !== identity.userId) throw new Error('OWNER_REQUIRED');
      classes.splice(index, 1);
    });
  }
}

export function createClassCollaborationStore(dataDir: string): ClassCollaborationStore {
  return new ClassCollaborationStore(dataDir);
}

import localforage from 'localforage';
import { generateTeamTeachingKeyPair, type TeamTeachingKeyPair } from './teamTeachingCrypto';

export interface TeamTeachingDeviceIdentity extends TeamTeachingKeyPair {
  version: 1;
  userId: string;
  deviceId: string;
  createdAt: string;
}

const memoryFallback = new Map<string, TeamTeachingDeviceIdentity>();
let storage: LocalForage | null = null;

function getStorage(): LocalForage | null {
  if (typeof window === 'undefined' || typeof window.indexedDB === 'undefined') return null;
  if (!storage) {
    storage = localforage.createInstance({
      name: 'Klassio_TeamTeaching',
      storeName: 'device_keys',
      description: 'Nicht exportierbare Geräte-Schlüssel für verschlüsselte Klassio-Teamklassen',
    });
  }
  return storage;
}

function recordKey(userId: string): string {
  return 'team-device-v1:' + userId;
}

function isDeviceIdentity(value: unknown, userId: string): value is TeamTeachingDeviceIdentity {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<TeamTeachingDeviceIdentity>;
  return record.version === 1
    && record.userId === userId
    && typeof record.deviceId === 'string'
    && record.deviceId.length >= 12
    && Boolean(record.privateKey)
    && Boolean(record.publicKeyJwk);
}

function randomDeviceId(): string {
  const bytes = new Uint8Array(18);
  globalThis.crypto.getRandomValues(bytes);
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function ensureTeamTeachingDevice(userId: string): Promise<TeamTeachingDeviceIdentity> {
  const key = recordKey(userId);
  const indexed = getStorage();

  if (indexed) {
    try {
      const existing = await indexed.getItem<TeamTeachingDeviceIdentity>(key);
      if (isDeviceIdentity(existing, userId)) return existing;
    } catch {
      // A corrupt/unreadable device record is replaced below.
    }
  } else {
    const existing = memoryFallback.get(key);
    if (existing) return existing;
  }

  const pair = await generateTeamTeachingKeyPair();
  const created: TeamTeachingDeviceIdentity = {
    version: 1,
    userId,
    deviceId: randomDeviceId(),
    publicKeyJwk: pair.publicKeyJwk,
    privateKey: pair.privateKey,
    createdAt: new Date().toISOString(),
  };

  if (indexed) {
    try {
      await indexed.setItem(key, created);
      return created;
    } catch {
      // Keep the current session usable even when IndexedDB is unavailable.
    }
  }
  memoryFallback.set(key, created);
  return created;
}

export async function deleteTeamTeachingDevice(userId: string): Promise<void> {
  const key = recordKey(userId);
  memoryFallback.delete(key);
  const indexed = getStorage();
  if (indexed) {
    await indexed.removeItem(key);
  }
}

export function __resetTeamTeachingDeviceForTesting(): void {
  memoryFallback.clear();
  storage = null;
}

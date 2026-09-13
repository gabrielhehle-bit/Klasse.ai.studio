/**
 * Optionales "diesem Gerät vertrauen" für den lokalen Klassio-Datentresor.
 *
 * Der eigentliche VaultKey wird niemals im Klartext persistent gespeichert.
 * Stattdessen:
 * 1. erzeugen wir einen nicht exportierbaren AES-256-GCM-Geräteschlüssel,
 * 2. speichern diesen als CryptoKey per IndexedDB Structured Clone,
 * 3. speichern daneben ausschließlich den damit verschlüsselten VaultKey.
 *
 * Sicherheitsgrenze: Wer Zugriff auf das entsperrte Browserprofil und denselben
 * Origin hat, kann die Web-App ausführen und damit auch den Geräteschlüssel benutzen.
 * Deshalb ist diese Option nur für persönliche, geschützte Dienstgeräte gedacht.
 */

import {
  decryptData,
  encryptData,
  exportAESKey,
  generateAESKey,
  importAESKey,
  uint8ArrayToBase64,
  base64ToUint8Array,
  type EncryptedPayloadV1,
} from './crypto';
import type { VaultRecordV1 } from './vaultService';

const DB_NAME = 'Klassio_Trusted_Device';
const DB_VERSION = 1;
const STORE_NAME = 'trusted_device';
const DEVICE_KEY_ID = 'device_key';
const WRAP_RECORD_ID = 'vault_wrap';
const TRUST_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

interface TrustedDeviceWrap {
  version: 1;
  vaultId: string;
  createdAt: string;
  expiresAt: number;
  wrappedVaultKey: EncryptedPayloadV1;
}

interface TrustedDevicePayload {
  purpose: 'klassio-trusted-device-vault-key';
  vaultId: string;
  rawKey: string;
}

function hasIndexedDb(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDb()) {
      reject(new Error('IndexedDB ist nicht verfügbar.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Trusted-Device-Datenbank konnte nicht geöffnet werden.'));
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  try {
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
      request.onerror = () => reject(request.error || new Error('Trusted-Device-Eintrag konnte nicht gelesen werden.'));
    });
  } finally {
    db.close();
  }
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Trusted-Device-Eintrag konnte nicht gespeichert werden.'));
      tx.onabort = () => reject(tx.error || new Error('Trusted-Device-Speicherung wurde abgebrochen.'));
    });
  } finally {
    db.close();
  }
}

export async function clearTrustedDeviceUnlock(): Promise<void> {
  if (!hasIndexedDb()) return;
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Gerätevertrauen konnte nicht gelöscht werden.'));
      tx.onabort = () => reject(tx.error || new Error('Gerätevertrauen konnte nicht gelöscht werden.'));
    });
  } finally {
    db.close();
  }
}

export async function rememberTrustedDevice(
  vaultRecord: VaultRecordV1,
  extractableVaultKey: CryptoKey,
): Promise<CryptoKey> {
  if (!extractableVaultKey.extractable) {
    throw new Error('Für das Gerätevertrauen wird einmalig ein exportierbarer Sitzungsschlüssel benötigt.');
  }

  const rawVaultKey = await exportAESKey(extractableVaultKey);
  try {
    const activeVaultKey = await importAESKey(rawVaultKey, false);
    const deviceKey = await generateAESKey(false);
    const payload: TrustedDevicePayload = {
      purpose: 'klassio-trusted-device-vault-key',
      vaultId: vaultRecord.id,
      rawKey: uint8ArrayToBase64(rawVaultKey),
    };
    const wrappedVaultKey = await encryptData(payload, deviceKey);
    const record: TrustedDeviceWrap = {
      version: 1,
      vaultId: vaultRecord.id,
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + TRUST_DURATION_MS,
      wrappedVaultKey,
    };

    // Zuerst den nicht exportierbaren Geräteschlüssel, dann nur den Ciphertext.
    await idbSet(DEVICE_KEY_ID, deviceKey);
    await idbSet(WRAP_RECORD_ID, record);
    return activeVaultKey;
  } catch (error) {
    try {
      await clearTrustedDeviceUnlock();
    } catch {
      // Best effort: ein fehlgeschlagener Komfortpfad darf das normale Entsperren nicht blockieren.
    }
    throw error;
  } finally {
    rawVaultKey.fill(0);
  }
}

export async function tryUnlockTrustedDevice(vaultRecord: VaultRecordV1): Promise<CryptoKey | null> {
  if (!hasIndexedDb()) return null;

  try {
    const [deviceKey, record] = await Promise.all([
      idbGet<CryptoKey>(DEVICE_KEY_ID),
      idbGet<TrustedDeviceWrap>(WRAP_RECORD_ID),
    ]);

    if (!deviceKey || !record || record.version !== 1 || record.vaultId !== vaultRecord.id) {
      return null;
    }
    if (record.expiresAt <= Date.now()) {
      await clearTrustedDeviceUnlock();
      return null;
    }

    const payload = await decryptData<TrustedDevicePayload>(record.wrappedVaultKey, deviceKey);
    if (
      payload?.purpose !== 'klassio-trusted-device-vault-key' ||
      payload.vaultId !== vaultRecord.id ||
      typeof payload.rawKey !== 'string'
    ) {
      await clearTrustedDeviceUnlock();
      return null;
    }

    const rawVaultKey = base64ToUint8Array(payload.rawKey);
    try {
      return await importAESKey(rawVaultKey, false);
    } finally {
      rawVaultKey.fill(0);
    }
  } catch (error) {
    console.warn('[Datenschutz] Automatisches Entsperren auf vertrauenswürdigem Gerät fehlgeschlagen.', error);
    try {
      await clearTrustedDeviceUnlock();
    } catch {
      // Best effort.
    }
    return null;
  }
}

export async function hasTrustedDeviceUnlock(vaultId?: string): Promise<boolean> {
  if (!hasIndexedDb()) return false;
  try {
    const record = await idbGet<TrustedDeviceWrap>(WRAP_RECORD_ID);
    return Boolean(
      record &&
      record.version === 1 &&
      record.expiresAt > Date.now() &&
      (!vaultId || record.vaultId === vaultId)
    );
  } catch {
    return false;
  }
}

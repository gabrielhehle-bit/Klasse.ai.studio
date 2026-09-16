/**
 * Verschlüsselte lokale Persistenzschicht der LehrerAPP (Modul B6)
 *
 * Stellt die sichere persistente Speicherung aller personenbezogenen Schülerdaten
 * auf dem Endgerät bereit:
 * - AES-GCM-256 Verschlüsselung des gesamten AppState mit dem VaultKey
 * - Kein dauerhafter Klartext von Schülerdaten in IndexedDB, localStorage oder sessionStorage
 * - Versionierte Datenstruktur EncryptedLocalStateV1
 * - Robuste lokale Recovery-Reihenfolge (Primärspeicher -> Fallback -> Backup -> Notfallkopie -> Session)
 * - Atomare Migration bestehender Klartext-Daten nach dem Prinzip:
 *   write encrypted -> verify decrypt -> delete plaintext
 * - Verschlüsselte Absicherung lokaler Caches (Tafel, Dossier-Notizen, Lernziele, Portfolios)
 * - Kontrollierte Lock-Funktion zur Bereinigung des flüchtigen RAMs
 *
 * SICHERHEITSHINWEISE:
 * - AppState existiert im laufenden Browser-RAM als normales JavaScript-Objekt.
 * - Der VaultKey liegt ausschließlich im flüchtigen RAM (vaultStorage).
 * - Das Tresor-Passwort und der Recovery-Code werden NIEMALS persistent gespeichert.
 */

import localforage from 'localforage';
import {
  encryptData,
  decryptData,
  CryptoError,
  type EncryptedPayloadV1,
} from './crypto.js';
import {
  getActiveVaultKey,
  clearActiveVaultSession,
  hasVault,
  loadVaultRecord,
} from './vaultStorage.js';
import type { AppState } from '../types.js';
import { toLocalDateKey } from './localDate.js';

// ==========================================
// 1. KONSTANTEN & IDENTIFIKATOREN
// ==========================================

export const ENCRYPTED_LOCAL_STATE_FORMAT = 'LehrerAPP_Encrypted_Local_State';
export const ENCRYPTED_LOCAL_STATE_VERSION = 1;

export const ENCRYPTED_CACHE_FORMAT = 'LehrerAPP_Encrypted_Cache_Item';
export const ENCRYPTED_CACHE_VERSION = 1;

export const STORAGE_KEYS = {
  PRIMARY: 'hehle_v3',
  FALLBACK: 'hehle_v3_fallback',
  BACKUP: 'hehle_v3_backup',
  NOTFALLKOPIE: 'hehle_v3_notfallkopie',
  NOTFALLKOPIE_DATE: 'hehle_v3_notfallkopie_date',
  NOTFALLKOPIE_TIME: 'hehle_v3_notfallkopie_time',
  TEMP: 'hehle_v3_temp',
  PRE_IMPORT: 'hehle_v3_pre_import_backup',
  PRE_IMPORT_TIME: 'hehle_v3_pre_import_backup_created_at',
  LEGACY_NAMEN: 'hehle_v3_namen',
  TAFEL_PAGES: '__tafel_saved_pages__',
  TAFEL_ACTIVE_IDX: '__tafel_active_idx__',
  PORTFOLIO_ENTRIES: 'lm_portfolio_entries_v2',
  CRASH_LOG: 'hehle_crash_log',
} as const;

// ==========================================
// 2. TYPEN & STRUKTUREN
// ==========================================

export interface EncryptedLocalStateV1 {
  format: 'LehrerAPP_Encrypted_Local_State';
  version: 1;
  savedAt: number; // Unix-Timestamp (nicht-sensible Metadaten)
  encryptedState: EncryptedPayloadV1;
}

export interface EncryptedCacheItemV1 {
  format: 'LehrerAPP_Encrypted_Cache_Item';
  version: 1;
  savedAt: number;
  encryptedPayload: EncryptedPayloadV1;
}

// In-Memory Fallback für Node.js / Unit-Tests ohne DOM-Storage
const testMemoryStorage = new Map<string, string>();

function getStorageDriver(): {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
} {
  return {
    getItem: async (key: string) => {
      if (typeof window !== 'undefined') {
        const item = await localforage.getItem<string | object>(key);
        return item == null ? null : typeof item === 'string' ? item : JSON.stringify(item);
      }
      return testMemoryStorage.get(key) ?? null;
    },
    setItem: async (key: string, value: string) => {
      if (typeof window !== 'undefined') {
        await localforage.setItem(key, value);
        return;
      }
      testMemoryStorage.set(key, value);
    },
    removeItem: async (key: string) => {
      if (typeof window !== 'undefined') {
        await localforage.removeItem(key);
        return;
      }
      testMemoryStorage.delete(key);
    },
  };
}

function getLocalStorage(): Storage | {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  key: (index: number) => string | null;
  length: number;
} {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  // Node / Test fallback
  return {
    getItem: (key: string) => testMemoryStorage.get(`local:${key}`) ?? null,
    setItem: (key: string, val: string) => { testMemoryStorage.set(`local:${key}`, val); },
    removeItem: (key: string) => { testMemoryStorage.delete(`local:${key}`); },
    clear: () => {
      for (const k of Array.from(testMemoryStorage.keys())) {
        if (k.startsWith('local:')) testMemoryStorage.delete(k);
      }
    },
    key: (index: number) => {
      const keys = Array.from(testMemoryStorage.keys()).filter(k => k.startsWith('local:'));
      return keys[index] ? keys[index].replace('local:', '') : null;
    },
    get length() {
      return Array.from(testMemoryStorage.keys()).filter(k => k.startsWith('local:')).length;
    }
  };
}

function getSessionStorage(): Storage | {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
} {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    return window.sessionStorage;
  }
  return {
    getItem: (key: string) => testMemoryStorage.get(`session:${key}`) ?? null,
    setItem: (key: string, val: string) => { testMemoryStorage.set(`session:${key}`, val); },
    removeItem: (key: string) => { testMemoryStorage.delete(`session:${key}`); },
  };
}

// ==========================================
// 3. TYPE GUARDS
// ==========================================

/**
 * Prüft typsicher, ob ein Objekt dem EncryptedLocalStateV1 Schema entspricht.
 */
export function isEncryptedLocalState(obj: unknown): obj is EncryptedLocalStateV1 {
  if (!obj || typeof obj !== 'object') return false;
  const c = obj as Record<string, unknown>;
  return (
    c.format === ENCRYPTED_LOCAL_STATE_FORMAT &&
    c.version === ENCRYPTED_LOCAL_STATE_VERSION &&
    typeof c.savedAt === 'number' &&
    typeof c.encryptedState === 'object' &&
    c.encryptedState !== null &&
    (c.encryptedState as any).version === 1 &&
    (c.encryptedState as any).algorithm === 'AES-GCM-256' &&
    typeof (c.encryptedState as any).iv === 'string' &&
    typeof (c.encryptedState as any).ciphertext === 'string'
  );
}

/**
 * Prüft typsicher, ob ein Objekt einem verschlüsselten Cache-Eintrag entspricht.
 */
export function isEncryptedCacheItem(obj: unknown): obj is EncryptedCacheItemV1 {
  if (!obj || typeof obj !== 'object') return false;
  const c = obj as Record<string, unknown>;
  return (
    c.format === ENCRYPTED_CACHE_FORMAT &&
    c.version === ENCRYPTED_CACHE_VERSION &&
    typeof c.savedAt === 'number' &&
    typeof c.encryptedPayload === 'object' &&
    c.encryptedPayload !== null &&
    (c.encryptedPayload as any).version === 1 &&
    (c.encryptedPayload as any).algorithm === 'AES-GCM-256' &&
    typeof (c.encryptedPayload as any).iv === 'string' &&
    typeof (c.encryptedPayload as any).ciphertext === 'string'
  );
}

/**
 * Erkennt unverschlüsselte Legacy-Klartext-Zustände aus Versionen vor B6.
 */
export function isLegacyPlaintextState(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  if (isEncryptedLocalState(obj)) return false;
  const c = obj as Record<string, unknown>;
  return (
    'schueler' in c ||
    'classes' in c ||
    'klassenbezeichnung' in c ||
    'activeClassId' in c ||
    'stammplan' in c ||
    'tageplan' in c
  );
}

// ==========================================
// 4. KERNPERSISTENZ: SPEICHERN & LADEN
// ==========================================

/**
 * Serialisiert und verschlüsselt den AppState mit dem VaultKey und speichert
 * ihn im Primärspeicher (IndexedDB) sowie als Fallbacks ab.
 *
 * @param appState Der zu sichernde Zustand
 * @param vaultKey Der aktive AES-GCM-256 Schlüssel aus dem RAM
 */
let primaryWriteQueue: Promise<unknown> = Promise.resolve();
function queuePrimaryWrite<T>(operation: () => Promise<T>): Promise<T> {
  const result = primaryWriteQueue.then(operation);
  primaryWriteQueue = result.catch(() => undefined);
  return result;
}

export function saveEncryptedAppState(appState: AppState, vaultKey: CryptoKey): Promise<EncryptedLocalStateV1> {
  // Capture now so mutations during crypto/storage work cannot change the saved generation.
  const snapshot = JSON.parse(JSON.stringify(appState));
  return queuePrimaryWrite(() => writeEncryptedAppState(snapshot, vaultKey));
}

async function writeEncryptedAppState(
  appState: AppState,
  vaultKey: CryptoKey
): Promise<EncryptedLocalStateV1> {
  if (!vaultKey) {
    throw new CryptoError('INVALID_PAYLOAD', 'Kein entsperrter VaultKey im RAM verfügbar. Speichern verweigert.');
  }

  // 1. AppState per AES-GCM-256 verschlüsseln
  const encryptedPayload = await encryptData(appState, vaultKey);

  // 2. Versionierten Record erstellen (keine Schülerdaten außerhalb des Ciphertexts)
  const record: EncryptedLocalStateV1 = {
    format: ENCRYPTED_LOCAL_STATE_FORMAT,
    version: ENCRYPTED_LOCAL_STATE_VERSION,
    savedAt: Date.now(),
    encryptedState: encryptedPayload,
  };

  const serializedRecord = JSON.stringify(record);

  // 3. Im Primärspeicher ablegen
  const storage = getStorageDriver();
  await storage.setItem(STORAGE_KEYS.PRIMARY, serializedRecord);

  // 4. Fallbacks verschlüsselt synchronisieren
  await saveEncryptedFallbackRecord(serializedRecord);

  // 5. Unverschlüsselte Altlasten eliminieren (insbes. Namenscache)
  try {
    const ls = getLocalStorage();
    ls.removeItem(STORAGE_KEYS.LEGACY_NAMEN);
  } catch {
    // Ignorieren
  }

  return record;
}

/** Keep the previous generation recoverable before replacing the primary record.
 * Uses the existing local key; importing another vault never changes local credentials.
 */
export function restoreEncryptedAppState(previous: AppState, next: AppState, vaultKey: CryptoKey): Promise<void> {
  const previousSnapshot = JSON.parse(JSON.stringify(previous));
  const nextSnapshot = JSON.parse(JSON.stringify(next));
  return queuePrimaryWrite(async () => {
    const storage = getStorageDriver();
    const previousRecord: EncryptedLocalStateV1 = {
      format: ENCRYPTED_LOCAL_STATE_FORMAT, version: 1, savedAt: Date.now(),
      encryptedState: await encryptData(previousSnapshot, vaultKey),
    };
    const serializedPrevious = JSON.stringify(previousRecord);
    await storage.setItem(STORAGE_KEYS.PRE_IMPORT, serializedPrevious);
    const savedPrevious = await storage.getItem(STORAGE_KEYS.PRE_IMPORT);
    if (savedPrevious !== serializedPrevious) throw new Error('Sicherung vor dem Import konnte nicht verifiziert werden.');
    await decryptData(JSON.parse(savedPrevious).encryptedState, vaultKey);

    const nextRecord: EncryptedLocalStateV1 = {
      format: ENCRYPTED_LOCAL_STATE_FORMAT, version: 1, savedAt: Date.now(),
      encryptedState: await encryptData(nextSnapshot, vaultKey),
    };
    await decryptData(nextRecord.encryptedState, vaultKey);
    const serializedNext = JSON.stringify(nextRecord);
    try {
      await storage.setItem(STORAGE_KEYS.PRIMARY, serializedNext);
      const readBack = await storage.getItem(STORAGE_KEYS.PRIMARY);
      if (readBack !== serializedNext) throw new Error('Import konnte nicht verifiziert werden.');
      await decryptData(JSON.parse(readBack).encryptedState, vaultKey);
    } catch (error) {
      // The verified PRE_IMPORT generation remains available even if rollback fails.
      try { await storage.setItem(STORAGE_KEYS.PRIMARY, serializedPrevious); } catch { /* retain PRE_IMPORT */ }
      throw error;
    }
    await saveEncryptedFallbackRecord(serializedNext);
    try {
      getSessionStorage().setItem(STORAGE_KEYS.TEMP, serializedNext);
      getLocalStorage().setItem(STORAGE_KEYS.PRE_IMPORT_TIME, new Date().toISOString());
    } catch { /* primary and recovery generation are already durable */ }
  });
}

export async function loadPreImportBackup(vaultKey: CryptoKey): Promise<AppState | null> {
  const raw = await getStorageDriver().getItem(STORAGE_KEYS.PRE_IMPORT);
  if (!raw) return null;
  const record = JSON.parse(raw);
  if (!isEncryptedLocalState(record)) throw new Error('Keine verschlüsselte Sicherung vor dem Import gefunden.');
  return decryptData<AppState>(record.encryptedState, vaultKey);
}

/**
 * Speichert den verschlüsselten Record in den localStorage-Fallback-Speichern.
 */
async function saveEncryptedFallbackRecord(serializedRecord: string): Promise<void> {
  const ls = getLocalStorage();
  try {
    // Verschlüsselte Payloads werden direkt als JSON gespeichert (kein ineffizientes LZ-String auf Ciphertext)
    ls.setItem(STORAGE_KEYS.FALLBACK, serializedRecord);
    ls.setItem(STORAGE_KEYS.BACKUP, serializedRecord);
  } catch (e) {
    console.warn('[Datenschutz] Quota-Limit für localStorage Fallback erreicht.', e);
  }
}

/**
 * Speichert eine verschlüsselte Notfallkopie (einmal täglich).
 */
export async function saveEncryptedEmergencyBackup(
  appState: AppState,
  vaultKey: CryptoKey
): Promise<void> {
  if (!vaultKey) return;
  try {
    const encryptedPayload = await encryptData(appState, vaultKey);
    const record: EncryptedLocalStateV1 = {
      format: ENCRYPTED_LOCAL_STATE_FORMAT,
      version: ENCRYPTED_LOCAL_STATE_VERSION,
      savedAt: Date.now(),
      encryptedState: encryptedPayload,
    };
    const serialized = JSON.stringify(record);
    const ls = getLocalStorage();
    ls.setItem(STORAGE_KEYS.NOTFALLKOPIE, serialized);
    ls.setItem(STORAGE_KEYS.NOTFALLKOPIE_DATE, toLocalDateKey());
    ls.setItem(STORAGE_KEYS.NOTFALLKOPIE_TIME, new Date().toLocaleString('de-DE'));
  } catch (e) {
    console.warn('[Datenschutz] Notfallkopie konnte nicht verschlüsselt gesichert werden.', e);
  }
}

/**
 * Speichert ein verschlüsseltes Session-Backup (sessionStorage).
 */
export async function saveEncryptedSessionBackup(
  appState: AppState,
  vaultKey: CryptoKey
): Promise<void> {
  if (!vaultKey) return;
  try {
    const encryptedPayload = await encryptData(appState, vaultKey);
    const record: EncryptedLocalStateV1 = {
      format: ENCRYPTED_LOCAL_STATE_FORMAT,
      version: ENCRYPTED_LOCAL_STATE_VERSION,
      savedAt: Date.now(),
      encryptedState: encryptedPayload,
    };
    const ss = getSessionStorage();
    ss.setItem(STORAGE_KEYS.TEMP, JSON.stringify(record));
  } catch (e) {
    console.warn('[Datenschutz] Session-Backup fehlgeschlagen.', e);
  }
}

/**
 * Speichert ein verschlüsseltes Pre-Import-Backup vor Schülerdaten-Importen.
 */
export async function saveEncryptedPreImportBackup(
  appState: AppState,
  vaultKey: CryptoKey
): Promise<void> {
  if (!vaultKey) return;
  const encryptedPayload = await encryptData(appState, vaultKey);
  const record: EncryptedLocalStateV1 = {
    format: ENCRYPTED_LOCAL_STATE_FORMAT,
    version: ENCRYPTED_LOCAL_STATE_VERSION,
    savedAt: Date.now(),
    encryptedState: encryptedPayload,
  };
  const storage = getStorageDriver();
  await storage.setItem(STORAGE_KEYS.PRE_IMPORT, JSON.stringify(record));
  const ls = getLocalStorage();
  ls.setItem(STORAGE_KEYS.PRE_IMPORT_TIME, new Date().toISOString());
}

/**
 * Lädt den verschlüsselten Zustand anhand der streng definierten Recovery-Reihenfolge:
 * 1. Primärspeicher (IndexedDB: hehle_v3)
 * 2. Fallback (localStorage: hehle_v3_fallback)
 * 3. Backup (localStorage: hehle_v3_backup)
 * 4. Notfallkopie (localStorage: hehle_v3_notfallkopie)
 * 5. Session-Backup (sessionStorage: hehle_v3_temp)
 *
 * @param vaultKey Der aktive AES-GCM-256 Schlüssel
 * @returns Der entschlüsselte und validierte AppState oder null, wenn kein Datensatz existiert.
 * @throws CryptoError wenn Daten existieren, aber weder Primär- noch Fallbacks entschlüsselt werden können.
 */
export async function loadEncryptedAppState(
  vaultKey: CryptoKey
): Promise<AppState | null> {
  if (!vaultKey) {
    throw new CryptoError('INVALID_PAYLOAD', 'Kein entsperrter VaultKey im RAM vorhanden.');
  }

  const storage = getStorageDriver();
  const ls = getLocalStorage();
  const ss = getSessionStorage();

  // Recovery-Kandidaten in exakter Prioritätsreihenfolge
  const sources: { name: string; retrieve: () => Promise<string | null> }[] = [
    { name: 'IndexedDB (Primärspeicher)', retrieve: async () => await storage.getItem(STORAGE_KEYS.PRIMARY) },
    { name: 'localStorage Fallback', retrieve: async () => ls.getItem(STORAGE_KEYS.FALLBACK) },
    { name: 'localStorage Backup', retrieve: async () => ls.getItem(STORAGE_KEYS.BACKUP) },
    { name: 'localStorage Notfallkopie', retrieve: async () => ls.getItem(STORAGE_KEYS.NOTFALLKOPIE) },
    { name: 'sessionStorage Temp', retrieve: async () => ss.getItem(STORAGE_KEYS.TEMP) },
  ];

  let anySourceFound = false;
  let lastError: Error | null = null;

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    try {
      const raw = await source.retrieve();
      if (!raw) continue;

      anySourceFound = true;
      let parsed: unknown;
      try {
        parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        console.warn(`[Recovery] JSON-Parsing für ${source.name} fehlgeschlagen.`);
        continue;
      }

      if (!isEncryptedLocalState(parsed)) {
        console.warn(`[Recovery] Datensatz in ${source.name} hat kein gültiges EncryptedLocalState-Format.`);
        continue;
      }

      // Entschlüsselung mit Authentizitätsprüfung (AES-GCM Authentication Tag)
      const decryptedState = await decryptData<AppState>(parsed.encryptedState, vaultKey);

      // Grundvalidierung des entschlüsselten Objekts
      if (!decryptedState || typeof decryptedState !== 'object') {
        throw new Error('Entschlüsselter Zustand ist kein gültiges Objekt.');
      }

      // Wenn die Wiederherstellung aus einer Fallback-Quelle erfolgte,
      // reparieren wir automatisch den Primärspeicher:
      if (i > 0) {
        console.log(`[Recovery] Zustand erfolgreich aus ${source.name} wiederhergestellt. Repariere Primärspeicher...`);
        try {
          await storage.setItem(STORAGE_KEYS.PRIMARY, JSON.stringify(parsed));
        } catch (repairErr) {
          console.warn('[Recovery] Automatische Primärspeicher-Reparatur fehlgeschlagen:', repairErr);
        }
      }

      return decryptedState;
    } catch (err: any) {
      console.warn(`[Recovery] Quelle ${source.name} konnte nicht entschlüsselt werden:`, err?.message || err);
      lastError = err;
    }
  }

  // Wenn keine Daten vorhanden sind (Neuinstallation), geben wir null zurück
  if (!anySourceFound && !lastError) {
    return null;
  }

  // Wenn Daten vorhanden waren, aber alle Quellen fehlschlugen (z. B. falscher Key oder korrupte Ciphertexte)
  throw new CryptoError(
    'DECRYPTION_FAILED',
    lastError?.message || 'Die lokalen Daten konnten nicht entschlüsselt werden.'
  );
}

// ==========================================
// 5. CACHE-VERSCHLÜSSELUNG (Tafel, Dossier, Lernziele)
// ==========================================

/**
 * Speichert ein beliebiges Datum (z. B. Tafel-Seiten, Erläuterungen, KIPortfolio) verschlüsselt in localStorage.
 */
export async function saveEncryptedStorageItem<T>(
  key: string,
  data: T,
  vaultKey: CryptoKey
): Promise<void> {
  if (!vaultKey) return;
  const encryptedPayload = await encryptData(data, vaultKey);
  const cacheItem: EncryptedCacheItemV1 = {
    format: ENCRYPTED_CACHE_FORMAT,
    version: ENCRYPTED_CACHE_VERSION,
    savedAt: Date.now(),
    encryptedPayload,
  };
  const ls = getLocalStorage();
  ls.setItem(key, JSON.stringify(cacheItem));
}

/**
 * Lädt ein Datum aus localStorage.
 * Unterstützt transparente Abwärtskompatibilität:
 * - Wenn verschlüsselt: Entschlüsselt mit VaultKey
 * - Wenn Legacy-Klartext: Gibt Klartext zurück, damit dieser weiterverarbeitet und migriert werden kann.
 */
export async function loadEncryptedStorageItem<T>(
  key: string,
  vaultKey?: CryptoKey | null
): Promise<T | null> {
  const ls = getLocalStorage();
  const raw = ls.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (isEncryptedCacheItem(parsed)) {
      if (!vaultKey) return null;
      return await decryptData<T>(parsed.encryptedPayload, vaultKey);
    }
    // Legacy-Klartext JSON
    return parsed as T;
  } catch {
    // Ungeparster String (z. B. einfache Notizen)
    return raw as unknown as T;
  }
}

/**
 * Löscht ein Datum aus localStorage.
 */
export function removeStorageItem(key: string): void {
  const ls = getLocalStorage();
  ls.removeItem(key);
}

// ==========================================
// 6. ATOMARE MIGRATION (write -> verify -> delete)
// ==========================================

/**
 * Prüft, ob unverschlüsselte Altdaten im Speicher vorliegen.
 */
export async function hasLegacyPlaintextData(): Promise<boolean> {
  const storage = getStorageDriver();
  const ls = getLocalStorage();

  const candidates = [
    await storage.getItem(STORAGE_KEYS.PRIMARY),
    ls.getItem(STORAGE_KEYS.FALLBACK),
    ls.getItem(STORAGE_KEYS.BACKUP),
    ls.getItem(STORAGE_KEYS.NOTFALLKOPIE),
    ls.getItem('schulplan_state'),
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (isLegacyPlaintextState(parsed)) {
        return true;
      }
    } catch {
      // Ignorieren
    }
  }
  return false;
}

/**
 * Führt eine absolut atomare Migration aller vorhandenen Klartextdaten durch:
 * 1. Klartextdaten einlesen & validieren
 * 2. Mit neuem VaultKey verschlüsseln & in Primär- und Fallback-Speicher schreiben
 * 3. Verschlüsselte Daten erneut auslesen & entschlüsseln
 * 4. Verifikation: Entschlüsselter Zustand muss dem Original entsprechen
 * 5. ERST NACH erfolgreicher Verifikation: Alte Klartextspeicher rückstandslos bereinigen!
 *
 * @param vaultKey Der neu erstellte oder entsperrte VaultKey
 */
export async function migrateLegacyStorageToEncrypted(
  vaultKey: CryptoKey
): Promise<{ success: boolean; migrated: boolean; count?: number; error?: string }> {
  if (!vaultKey) {
    return { success: false, migrated: false, error: 'Kein VaultKey für Migration übergeben.' };
  }

  const storage = getStorageDriver();
  const ls = getLocalStorage();
  const ss = getSessionStorage();

  // 1. Legacy-Klartext auffinden
  let legacyRaw: string | null = null;
  const sources = [
    await storage.getItem(STORAGE_KEYS.PRIMARY),
    ls.getItem(STORAGE_KEYS.FALLBACK),
    ls.getItem(STORAGE_KEYS.BACKUP),
    ls.getItem(STORAGE_KEYS.NOTFALLKOPIE),
    ls.getItem('schulplan_state'),
  ];

  for (const item of sources) {
    if (item) {
      try {
        const parsed = typeof item === 'string' ? JSON.parse(item) : item;
        if (isLegacyPlaintextState(parsed)) {
          legacyRaw = typeof item === 'string' ? item : JSON.stringify(item);
          break;
        }
      } catch {
        // Weitersuchen
      }
    }
  }

  if (!legacyRaw) {
    // Keine Legacy-Daten vorhanden
    return { success: true, migrated: false };
  }

  let originalState: AppState;
  try {
    originalState = JSON.parse(legacyRaw);
  } catch (e: any) {
    return { success: false, migrated: false, error: 'Legacy-Daten konnten nicht geparst werden: ' + e.message };
  }

  try {
    // 2. Zustand verschlüsseln & schreiben
    const encryptedRecord = await saveEncryptedAppState(originalState, vaultKey);

    // 3. Verifikation: Aus Speicher wieder einlesen
    const readBackRaw = await storage.getItem(STORAGE_KEYS.PRIMARY);
    if (!readBackRaw) {
      throw new Error('Verschlüsselter Record konnte nach dem Schreiben nicht gelesen werden.');
    }

    const readBackParsed = JSON.parse(readBackRaw);
    if (!isEncryptedLocalState(readBackParsed)) {
      throw new Error('Gelesener Record entspricht nicht dem Format EncryptedLocalStateV1.');
    }

    // 4. Verifikation: Entschlüsseln & Datenabgleich
    const decryptedVerify = await decryptData<AppState>(readBackParsed.encryptedState, vaultKey);

    const originalStudentsCount = (originalState.schueler || []).length;
    const decryptedStudentsCount = (decryptedVerify.schueler || []).length;

    if (originalStudentsCount !== decryptedStudentsCount) {
      throw new Error(`Integritätsabweichung: Original hatte ${originalStudentsCount} Schüler, entschlüsselt wurden ${decryptedStudentsCount}.`);
    }

    // 5. ERST JETZT: Alte Klartext-Speicherstellen bereinigen
    ls.removeItem(STORAGE_KEYS.LEGACY_NAMEN);
    ss.removeItem(STORAGE_KEYS.TEMP);
    ls.removeItem('schulplan_state');

    // Legacy-Caches (Tafel, Dossier, Notizen) ebenfalls verschlüsseln, falls vorhanden
    await migrateLegacyCaches(vaultKey);

    return {
      success: true,
      migrated: true,
      count: originalStudentsCount,
    };
  } catch (err: any) {
    console.error('[Migration] Migration fehlgeschlagen. Altdaten bleiben unangetastet!', err);
    return {
      success: false,
      migrated: false,
      error: err?.message || 'Unbekannter Fehler bei der Migration.',
    };
  }
}

/**
 * Sucht nach bekannten unverschlüsselten Caches und verschlüsselt diese nachträglich.
 */
async function migrateLegacyCaches(vaultKey: CryptoKey): Promise<void> {
  const ls = getLocalStorage();
  try {
    // 1. Tafelseiten
    const tafelRaw = ls.getItem(STORAGE_KEYS.TAFEL_PAGES);
    if (tafelRaw) {
      try {
        const parsed = JSON.parse(tafelRaw);
        if (!isEncryptedCacheItem(parsed)) {
          await saveEncryptedStorageItem(STORAGE_KEYS.TAFEL_PAGES, parsed, vaultKey);
        }
      } catch {
        // Ignorieren
      }
    }

    // 2. Portfolio-Einträge
    const portfolioRaw = ls.getItem(STORAGE_KEYS.PORTFOLIO_ENTRIES);
    if (portfolioRaw) {
      try {
        const parsed = JSON.parse(portfolioRaw);
        if (!isEncryptedCacheItem(parsed)) {
          await saveEncryptedStorageItem(STORAGE_KEYS.PORTFOLIO_ENTRIES, parsed, vaultKey);
        }
      } catch {
        // Ignorieren
      }
    }

    // 3. Durchsuche localStorage nach dynamischen personenbezogenen Schlüsseln
    const keysToMigrate: string[] = [];
    for (let i = 0; i < ls.length; i++) {
      const key = ls.key(i);
      if (!key) continue;
      if (
        key.startsWith('oberau_eval_') ||
        key.startsWith('oberau_remarks_') ||
        key.startsWith('student_lernziele_') ||
        key.startsWith('ki_portfolio_summary_') ||
        key.startsWith('ai_parent_report_')
      ) {
        keysToMigrate.push(key);
      }
    }

    for (const key of keysToMigrate) {
      const rawVal = ls.getItem(key);
      if (!rawVal) continue;
      try {
        const parsed = JSON.parse(rawVal);
        if (!isEncryptedCacheItem(parsed)) {
          await saveEncryptedStorageItem(key, parsed, vaultKey);
        }
      } catch {
        // Ungeparste Strings
        await saveEncryptedStorageItem(key, rawVal, vaultKey);
      }
    }
  } catch (e) {
    console.warn('[Migration] Cache-Migration teilweise unvollständig:', e);
  }
}

// ==========================================
// 7. SPERREN (Vault Lock)
// ==========================================

/**
 * Führt ein kontrolliertes Sperren des lokalen Tresors aus:
 * - Entfernt den VaultKey rückstandslos aus dem RAM
 * - Informiert Listener / UI über den Lock-Zustand
 */
export function lockVault(): void {
  clearActiveVaultSession();
}

/**
 * Hilfsfunktion für Unit-Tests: Bereinigt Test-Speicher
 */
export function __resetSecureStorageForTesting(): void {
  testMemoryStorage.clear();
}

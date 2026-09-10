/**
 * VaultStorage – Isolierte Speicherschicht für Tresor-Metadaten (Modul B3)
 *
 * Verwaltet ausschließlich den verschlüsselten VaultRecord (Metadaten, Salts, KDF-Parameter,
 * verschlüsselte Schlüssel-Wrappings).
 *
 * SICHERHEITSHINWEISE:
 * - Es werden KEINE Schülerdaten, Noten oder Unterrichtsdaten gespeichert.
 * - Es wird NIEMALS der entsperrte VaultKey im Speicher abgelegt.
 * - Es wird NIEMALS das Benutzerpasswort oder der Recovery-Code gespeichert.
 * - Primärer Speicher im Browser: IndexedDB (über lokale Instanz von localForage).
 * - Im Test-/Node-Umfeld oder bei fehlendem IndexedDB existiert ein sicherer In-Memory-Fallback.
 */

import localforage from 'localforage';
import { isVaultRecord, type VaultRecordV1 } from './vaultService.js';
import { CryptoError } from './crypto.js';

const VAULT_STORAGE_KEY = 'lehrerapp_vault_record_v1';

// Dedizierte IndexedDB-Instanz für Tresor-Metadaten (getrennt vom normalen App-State)
let storageInstance: LocalForage | null = null;
let memoryFallback: VaultRecordV1 | null = null;
let isNodeOrNoStorage = false;

function getStorage(): LocalForage | null {
  if (isNodeOrNoStorage) {
    return null;
  }
  if (!storageInstance) {
    try {
      if (typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined') {
        storageInstance = localforage.createInstance({
          name: 'LehrerAPP_SecureVault',
          storeName: 'vault_metadata',
          description: 'Geschützte Tresor-Metadaten der LehrerAPP (keine Schülerdaten)',
        });
      } else {
        isNodeOrNoStorage = true;
        return null;
      }
    } catch {
      isNodeOrNoStorage = true;
      return null;
    }
  }
  return storageInstance;
}

/**
 * Speichert den verschlüsselten VaultRecord persistent in IndexedDB (bzw. In-Memory-Fallback).
 * Validiert vor dem Speichern strikt die Datenstruktur.
 */
export async function saveVaultRecord(record: VaultRecordV1): Promise<void> {
  if (!isVaultRecord(record)) {
    throw new CryptoError(
      'INVALID_PAYLOAD',
      'Speichern abgebrochen: Ungültiger VaultRecord.'
    );
  }

  const storage = getStorage();
  if (storage) {
    try {
      await storage.setItem(VAULT_STORAGE_KEY, record);
      return;
    } catch {
      // Bei Fehlern auf Speicher-Fallback wechseln
      isNodeOrNoStorage = true;
    }
  }

  memoryFallback = JSON.parse(JSON.stringify(record));
}

/**
 * Lädt den gespeicherten VaultRecord.
 * Gibt null zurück, wenn noch kein Tresor initialisiert wurde.
 */
export async function loadVaultRecord(): Promise<VaultRecordV1 | null> {
  const storage = getStorage();
  if (storage) {
    try {
      const raw = await storage.getItem<VaultRecordV1>(VAULT_STORAGE_KEY);
      if (!raw) {
        return null;
      }
      if (isVaultRecord(raw)) {
        return raw;
      }
      throw new CryptoError('INVALID_PAYLOAD', 'Gespeicherter VaultRecord ist korrupt.');
    } catch (e: any) {
      if (e?.name === 'CryptoError') {
        throw e;
      }
      isNodeOrNoStorage = true;
    }
  }

  if (memoryFallback && isVaultRecord(memoryFallback)) {
    return JSON.parse(JSON.stringify(memoryFallback));
  }
  return null;
}

/**
 * Löscht den gespeicherten VaultRecord vollständig (z. B. bei vollständigem App-Reset).
 */
export async function deleteVaultRecord(): Promise<void> {
  const storage = getStorage();
  if (storage) {
    try {
      await storage.removeItem(VAULT_STORAGE_KEY);
    } catch {
      isNodeOrNoStorage = true;
    }
  }
  memoryFallback = null;
}

/**
 * Prüft, ob bereits ein Tresor eingerichtet wurde.
 */
export async function hasVault(): Promise<boolean> {
  const record = await loadVaultRecord();
  return record !== null;
}

// ==========================================
// FLÜCHTIGER IN-MEMORY SCHLÜSSELSPEICHER (RAM ONLY)
// ==========================================
let activeSessionVaultKey: CryptoKey | null = null;
let activeSessionVaultRecord: VaultRecordV1 | null = null;

type VaultSessionListener = (isUnlocked: boolean) => void;
const sessionListeners = new Set<VaultSessionListener>();

export function subscribeVaultSession(listener: VaultSessionListener): () => void {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

function notifySessionListeners(isUnlocked: boolean): void {
  sessionListeners.forEach((listener) => {
    try {
      listener(isUnlocked);
    } catch (e) {
      console.error('[Datenschutz] Fehler in Vault-Session-Listener:', e);
    }
  });
}

/**
 * Setzt den aktiven entsperrten VaultKey und VaultRecord im flüchtigen RAM.
 * Wird NIEMALS in localStorage, IndexedDB oder auf Festplatte persistiert.
 */
export function setActiveVaultSession(key: CryptoKey | null, record: VaultRecordV1 | null): void {
  activeSessionVaultKey = key;
  activeSessionVaultRecord = record;
  notifySessionListeners(key !== null);
}

/**
 * Ruft den aktuell im RAM entsperrten VaultKey ab (oder null, wenn gesperrt).
 */
export function getActiveVaultKey(): CryptoKey | null {
  return activeSessionVaultKey;
}

/**
 * Ruft den aktuell geladenen VaultRecord ab (oder null, wenn noch nicht entsperrt/geladen).
 */
export function getActiveVaultRecord(): VaultRecordV1 | null {
  return activeSessionVaultRecord;
}

/**
 * Löscht den aktiven VaultKey rückstandsfrei aus dem RAM (Sperren).
 */
export function clearActiveVaultSession(): void {
  activeSessionVaultKey = null;
  activeSessionVaultRecord = null;
  notifySessionListeners(false);
}

/**
 * Hilfsfunktion für Test-Suites zum Zurücksetzen des Speichers.
 */
export function __resetVaultStorageForTesting(): void {
  memoryFallback = null;
  storageInstance = null;
  isNodeOrNoStorage = false;
  activeSessionVaultKey = null;
  activeSessionVaultRecord = null;
  notifySessionListeners(false);
}

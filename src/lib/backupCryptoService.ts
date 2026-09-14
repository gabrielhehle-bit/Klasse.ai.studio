/**
 * Verschlüsselte Backups & Zero-Knowledge-Cloud-Sicherung der LehrerAPP (Modul B5)
 *
 * Verwaltet die clientseitige AES-GCM-256-Verschlüsselung vollständiger Backups
 * für manuelle Exporte (.lehrerapp) und Cloud-Backups (z. B. OneDrive).
 *
 * SICHERHEITSARCHITEKTUR:
 * 1. Der AppState wird ausschließlich lokal im Browser verschlüsselt.
 * 2. Weder die Backup-Datei noch der Server/OneDrive erhalten jemals den VaultKey,
 *    das Passwort oder den Recovery-Code im Klartext.
 * 3. Zur Notfallwiederherstellung bei Geräteverlust enthält das Backup eine Kopie des
 *    VaultRecords (Salts, KDF-Parameter, verschlüsselte Schlüssel-Wrappings).
 *    Ein neues Gerät kann mit der Backup-Datei und dem Recovery-Code (oder Passwort)
 *    die Daten ohne Serverkenntnis und ohne alten Browser vollständig entschlüsseln.
 * 4. Enthält keinerlei personenbezogene Metadaten (keine Schülernamen, Klassen, Schulen).
 */

import {
  encryptData,
  decryptData,
  isEncryptedPayload,
  CryptoError,
  type EncryptedPayloadV1,
} from './crypto.js';
import {
  isVaultRecord,
  recoverVault,
  unlockVault,
  type VaultRecordV1,
} from './vaultService.js';

// ==========================================
// 1. DATENSTRUKTUREN & FORMATE
// ==========================================

export const BACKUP_FORMAT_IDENTIFIER = 'LehrerAPP_Encrypted_Backup' as const;
export const CURRENT_BACKUP_VERSION = 1 as const;
export const BACKUP_FILE_EXTENSION = '.json';
export const DEFAULT_APP_VERSION = '3.0.0';

/**
 * Versioniertes, verschlüsseltes Backup-Dateiformat (Version 1).
 * Enthält keinerlei Klartextdaten über Schüler, Klassen oder Schulen.
 */
export interface LehrerAppEncryptedBackupV1 {
  format: typeof BACKUP_FORMAT_IDENTIFIER;
  version: typeof CURRENT_BACKUP_VERSION;
  createdAt: string; // ISO 8601
  appVersion: string;
  encryptedState: EncryptedPayloadV1; // AES-GCM-256 verschlüsselter AppState
  vaultRecord: VaultRecordV1; // Nicht-geheime Metadaten zur Schlüsselwiederherstellung
}

// ==========================================
// 2. TYPE GUARDS & FORMAT-ERKENNUNG
// ==========================================

/**
 * Typsicherer Type Guard für LehrerAppEncryptedBackupV1.
 */
export function isEncryptedBackupV1(value: unknown): value is LehrerAppEncryptedBackupV1 {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const c = value as Record<string, unknown>;
  return (
    c.format === BACKUP_FORMAT_IDENTIFIER &&
    c.version === CURRENT_BACKUP_VERSION &&
    typeof c.createdAt === 'string' &&
    typeof c.appVersion === 'string' &&
    isEncryptedPayload(c.encryptedState) &&
    isVaultRecord(c.vaultRecord)
  );
}

/**
 * Erkennt unverschlüsselte Alt-Backups (Legacy Plaintext .json).
 * Ein solches Backup wird als Legacy erkannt, wenn es die typischen Datenfelder
 * des AppStates auf oberster Ebene im Klartext enthält und KEIN verschlüsseltes Backup ist.
 */
export function isLegacyPlaintextBackup(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if (isEncryptedBackupV1(value)) {
    return false;
  }
  const c = value as Record<string, unknown>;
  return (
    'schueler' in c ||
    'classes' in c ||
    'klassenbezeichnung' in c ||
    'stammplan' in c ||
    'noten' in c ||
    ('version' in c && typeof c.version === 'number' && ('schueler' in c || 'classes' in c))
  );
}

// ==========================================
// 3. BACKUP ERSTELLEN (createEncryptedBackup)
// ==========================================

/**
 * Verschlüsselt den AppState im Browser und erzeugt ein versioniertes LehrerAppEncryptedBackupV1.
 *
 * @param appState Der vollständige AppState der LehrerAPP
 * @param vaultKey Der aktive 256-Bit AES-GCM VaultKey
 * @param vaultRecord Der zugehörige VaultRecord (für Wiederherstellung bei Geräteverlust)
 * @param appVersion Optionale Versionsnummer der LehrerAPP
 */
export async function createEncryptedBackup(
  appState: unknown,
  vaultKey: CryptoKey,
  vaultRecord: VaultRecordV1,
  appVersion: string = DEFAULT_APP_VERSION
): Promise<LehrerAppEncryptedBackupV1> {
  if (appState === undefined || appState === null) {
    throw new CryptoError('INVALID_PAYLOAD', 'Kein AppState zum Sichern übergeben.');
  }
  if (!vaultKey) {
    throw new CryptoError(
      'NO_CRYPTO_API',
      'Kein VaultKey verfügbar. Sicherer Tresor muss vor der vollständigen Datensicherung eingerichtet sein.'
    );
  }
  if (!isVaultRecord(vaultRecord)) {
    throw new CryptoError(
      'INVALID_PAYLOAD',
      'Ungültiger VaultRecord für Backup-Metadaten übergeben.'
    );
  }

  // 1. AppState clientseitig mit dem VaultKey verschlüsseln (AES-GCM-256 + frischer IV)
  const encryptedState = await encryptData(appState, vaultKey);

  // 2. Versioniertes Backup-Objekt ohne Klartextgeheimnisse zusammensetzen
  const backup: LehrerAppEncryptedBackupV1 = {
    format: BACKUP_FORMAT_IDENTIFIER,
    version: CURRENT_BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    appVersion,
    encryptedState,
    vaultRecord: JSON.parse(JSON.stringify(vaultRecord)), // Saubere Kopie
  };

  return backup;
}

// ==========================================
// 4. BACKUP WIEDERHERSTELLEN (decryptBackup & recoverBackup)
// ==========================================

/**
 * Entschlüsselt ein verschlüsseltes Backup mit dem vorhandenen VaultKey.
 *
 * @param backup Das empfangene oder geladene Backup-Objekt
 * @param vaultKey Der passende 256-Bit AES-GCM VaultKey
 */
export async function decryptBackup<T = any>(
  backup: unknown,
  vaultKey: CryptoKey
): Promise<T> {
  if (!vaultKey) {
    throw new CryptoError(
      'NO_CRYPTO_API',
      'Kein VaultKey zum Entschlüsseln des Backups vorhanden.'
    );
  }
  if (!isEncryptedBackupV1(backup)) {
    throw new CryptoError(
      'INVALID_PAYLOAD',
      'Ungültiges Backup-Format oder ununterstützte Backup-Version.'
    );
  }

  // Atomare Entschlüsselung des State
  return decryptData<T>(backup.encryptedState, vaultKey);
}

export interface RecoverBackupResult<T = any> {
  appState: T;
  vaultKey: CryptoKey;
  vaultRecord: VaultRecordV1;
}

/**
 * Stellt ein Backup auf einem NEUEN Gerät mithilfe des Recovery-Codes wieder her.
 * Ermöglicht vollständige Katastrophenhilfe bei Geräteverlust ohne alten Browser
 * und ohne Server-Kenntnis des Recovery-Codes.
 *
 * @param backup Das geladene Backup-Objekt
 * @param recoveryCode Der 128-Bit-Recovery-Code der Lehrkraft
 */
export async function recoverBackup<T = any>(
  backup: unknown,
  recoveryCode: string
): Promise<RecoverBackupResult<T>> {
  if (!isEncryptedBackupV1(backup)) {
    throw new CryptoError(
      'INVALID_PAYLOAD',
      'Ungültiges Backup-Format oder ununterstützte Backup-Version.'
    );
  }
  if (!recoveryCode || typeof recoveryCode !== 'string') {
    throw new CryptoError('INVALID_PAYLOAD', 'Recovery-Code darf nicht leer sein.');
  }

  // 1. VaultKey über Recovery-Code aus den eingebetteten Vault-Metadaten rekonstruieren
  const vaultKey = await recoverVault(backup.vaultRecord, recoveryCode, false);

  // 2. AppState mit dem rekonstruierten VaultKey entschlüsseln
  const appState = await decryptData<T>(backup.encryptedState, vaultKey);

  return {
    appState,
    vaultKey,
    vaultRecord: backup.vaultRecord,
  };
}

/**
 * Stellt ein Backup auf einem neuen Gerät alternativ mit dem Tresor-Passwort wieder her.
 *
 * @param backup Das geladene Backup-Objekt
 * @param password Das Tresor-Passwort der Lehrkraft
 */
export async function unlockAndDecryptBackup<T = any>(
  backup: unknown,
  password: string
): Promise<RecoverBackupResult<T>> {
  if (!isEncryptedBackupV1(backup)) {
    throw new CryptoError(
      'INVALID_PAYLOAD',
      'Ungültiges Backup-Format oder ununterstützte Backup-Version.'
    );
  }
  if (!password || typeof password !== 'string') {
    throw new CryptoError('INVALID_PAYLOAD', 'Passwort darf nicht leer sein.');
  }

  // 1. VaultKey über Passwort aus den eingebetteten Vault-Metadaten rekonstruieren
  const vaultKey = await unlockVault(backup.vaultRecord, password, false);

  // 2. AppState mit dem rekonstruierten VaultKey entschlüsseln
  const appState = await decryptData<T>(backup.encryptedState, vaultKey);

  return {
    appState,
    vaultKey,
    vaultRecord: backup.vaultRecord,
  };
}

// ==========================================
// 5. SERIALISIERUNG & DATEINAMEN
// ==========================================

/**
 * Erzeugt einen standardisierten, sicheren Dateinamen für den Backup-Export.
 * Enthält ein Datum, aber KEINERLEI personenbezogene Daten (keine Namen, Klassen, Schulen).
 * Format: Klassio_Sicherung_YYYY-MM-DD.lehrerapp
 */
export function generateBackupFilename(date: Date = new Date()): string {
  const dateStr = date.toISOString().split('T')[0];
  return `Klassio_Sicherung_${dateStr}${BACKUP_FILE_EXTENSION}`;
}

/**
 * Serialisiert ein verschlüsseltes Backup in einen JSON-String zur Dateispeicherung.
 */
export function serializeBackup(backup: LehrerAppEncryptedBackupV1): string {
  if (!isEncryptedBackupV1(backup)) {
    throw new CryptoError('INVALID_PAYLOAD', 'Kein gültiges Klassio-Backup (V1).');
  }
  return JSON.stringify(backup, null, 2);
}

/**
 * Deserialisiert einen Dateitext und validiert strikt das Format.
 */
export function deserializeBackup(rawContent: string): LehrerAppEncryptedBackupV1 {
  try {
    const parsed = JSON.parse(rawContent);
    if (!isEncryptedBackupV1(parsed)) {
      throw new CryptoError(
        'INVALID_PAYLOAD',
        'Die Datei ist kein gültiges, verschlüsseltes Klassio-Backup.'
      );
    }
    return parsed;
  } catch (err: any) {
    if (err?.name === 'CryptoError') {
      throw err;
    }
    throw new CryptoError('INVALID_PAYLOAD', 'Dateiinhalte sind kein gültiges JSON.');
  }
}

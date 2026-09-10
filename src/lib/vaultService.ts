/**
 * Vault & Schlüsselverwaltung der LehrerAPP (Modul B3)
 *
 * Verwaltet den Master-Schlüssel (VaultKey), der später alle schutzbedürftigen
 * lokalen Daten, Backups und Synchronisationsdaten verschlüsselt.
 *
 * SICHERHEITSARCHITEKTUR:
 * 1. VaultKey ist ein kryptographisch zufälliger 256-Bit-Schlüssel (AES-GCM).
 * 2. Das Benutzerpasswort schützt ausschließlich den VaultKey via PBKDF2-SHA-256.
 * 3. Bei einer Passwortänderung ändert sich der VaultKey NICHT (kein Re-Encrypt aller Nutzdaten nötig).
 * 4. Ein Recovery-Code (mindestens 128 Bit Entropie) schützt den VaultKey als redundanter Zweitweg.
 * 5. Weder Passwort noch Recovery-Code noch der unverschlüsselte VaultKey werden persistent gespeichert.
 * 6. Entsperrte Schlüssel werden so früh wie möglich als nicht-exportierbare CryptoKeys im RAM gehalten.
 */

import {
  importAESKey,
  exportAESKey,
  generateSalt,
  deriveKeyFromPassword,
  encryptData,
  decryptData,
  uint8ArrayToBase64,
  base64ToUint8Array,
  isEncryptedPayload,
  CryptoError,
  DEFAULT_PBKDF2_ITERATIONS,
  type EncryptedPayloadV1,
} from './crypto.js';

// ==========================================
// 1. TYPEN & STATUS
// ==========================================

export type VaultStatus = 'not_initialized' | 'locked' | 'unlocked';

/**
 * Persistente Vault-Metadaten (Version 1).
 * Enthält keinerlei Klartextpasswörter, Schülerdaten oder unverschlüsselte Schlüssel.
 */
export interface VaultRecordV1 {
  version: 1;
  id: string; // Eindeutige Tresor-Kennung
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  passwordSalt: string; // Base64
  passwordKdfIterations: number;
  encryptedVaultKey: EncryptedPayloadV1; // Geschützt mit Passwort-Schlüssel
  recoverySalt: string; // Base64
  recoveryKdfIterations: number;
  recoveryWrappedVaultKey: EncryptedPayloadV1; // Geschützt mit Recovery-Schlüssel
}

interface KeyWrappingPayload {
  purpose: 'vault-key-wrapping-password' | 'vault-key-wrapping-recovery';
  rawKey: string; // Base64 des 32-Byte VaultKeys
}

// Mindestlänge für Tresor-Passwörter (ohne künstliche Sonderzeichen-Zwänge)
export const MIN_PASSWORD_LENGTH = 10;

// ==========================================
// 2. VAULT-KEY-GENERIERUNG
// ==========================================

function getCryptoSubtle(): SubtleCrypto {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new CryptoError(
    'NO_CRYPTO_API',
    'Web Crypto API (crypto.subtle) ist in dieser Umgebung nicht verfügbar.'
  );
}

function getRandomValues<T extends ArrayBufferView | null>(array: T): T {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    return window.crypto.getRandomValues(array);
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    return globalThis.crypto.getRandomValues(array);
  }
  throw new CryptoError(
    'NO_CRYPTO_API',
    'Web Crypto API (crypto.getRandomValues) ist in dieser Umgebung nicht verfügbar.'
  );
}

/**
 * Erzeugt 32 kryptographisch zufällige Bytes (256 Bit) für den Master-VaultKey.
 */
export function generateVaultKeyBytes(): Uint8Array {
  const bytes = new Uint8Array(32);
  getRandomValues(bytes);
  return bytes;
}

// ==========================================
// 3. RECOVERY-CODE-VERWALTUNG (128 Bit Entropie)
// ==========================================

/**
 * Erzeugt ein kryptographisch zufälliges 16-Byte-Geheimnis (exakt 128 Bit Entropie)
 * und formatiert es menschenlesbar in 8 Viererblöcken hexadezimaler Zeichen:
 * Beispiel: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
 */
export function generateRecoveryCode(): string {
  const bytes = new Uint8Array(16);
  getRandomValues(bytes);
  const code = formatRecoveryCode(bytes);
  bytes.fill(0); // Speicherhygiene
  return code;
}

/**
 * Formatiert 16 Bytes in eine benutzerfreundliche Zeichenkette mit Bindestrichen.
 */
export function formatRecoveryCode(bytes: Uint8Array): string {
  if (bytes.byteLength !== 16) {
    throw new CryptoError(
      'INVALID_PAYLOAD',
      `Recovery-Code benötigt exakt 16 Bytes (erhalten: ${bytes.byteLength}).`
    );
  }
  const hexParts: string[] = [];
  for (let i = 0; i < 16; i++) {
    hexParts.push(bytes[i].toString(16).padStart(2, '0').toUpperCase());
  }
  const fullHex = hexParts.join('');
  // In 8 Gruppen à 4 Zeichen aufteilen
  const groups: string[] = [];
  for (let i = 0; i < 32; i += 4) {
    groups.push(fullHex.slice(i, i + 4));
  }
  return groups.join('-');
}

/**
 * Normalisiert und validiert einen vom Benutzer eingegebenen Recovery-Code.
 * Entfernt Bindestriche und Leerzeichen, prüft strikt auf 32 Hexadezimalzeichen (128 Bit).
 */
export function normalizeRecoveryCode(rawInput: string): string {
  if (!rawInput || typeof rawInput !== 'string') {
    throw new CryptoError('INVALID_PAYLOAD', 'Ungültiger Recovery-Code: Eingabe ist leer.');
  }
  const cleaned = rawInput.replace(/[-\s]/g, '').toUpperCase();
  if (!/^[0-9A-F]{32}$/.test(cleaned)) {
    throw new CryptoError(
      'INVALID_PAYLOAD',
      'Ungültiger Recovery-Code: Erwartet werden 32 hexadezimale Zeichen (Format: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX).'
    );
  }
  return cleaned;
}

// ==========================================
// 4. HILFSFUNKTIONEN ZUR DOMAIN SEPARATION
// ==========================================

async function wrapVaultKey(
  rawVaultKey: Uint8Array,
  wrappingKey: CryptoKey,
  purpose: 'vault-key-wrapping-password' | 'vault-key-wrapping-recovery'
): Promise<EncryptedPayloadV1> {
  const payloadData: KeyWrappingPayload = {
    purpose,
    rawKey: uint8ArrayToBase64(rawVaultKey),
  };
  return encryptData(payloadData, wrappingKey);
}

async function unwrapVaultKey(
  payload: EncryptedPayloadV1,
  wrappingKey: CryptoKey,
  expectedPurpose: 'vault-key-wrapping-password' | 'vault-key-wrapping-recovery'
): Promise<Uint8Array> {
  let data: KeyWrappingPayload;
  try {
    data = await decryptData<KeyWrappingPayload>(payload, wrappingKey);
  } catch {
    throw new CryptoError(
      'DECRYPTION_FAILED',
      'Tresor konnte nicht entsperrt werden. Authentifizierung fehlgeschlagen.'
    );
  }

  if (data.purpose !== expectedPurpose) {
    throw new CryptoError(
      'DECRYPTION_FAILED',
      'Kryptographische Domain-Verletzung: Unerwarteter Schlüssel-Verwendungszweck.'
    );
  }

  const rawBytes = base64ToUint8Array(data.rawKey);
  if (rawBytes.byteLength !== 32) {
    rawBytes.fill(0);
    throw new CryptoError(
      'INVALID_KEY_LENGTH',
      'Entschlüsselter VaultKey hat eine ungültige Länge.'
    );
  }
  return rawBytes;
}

// ==========================================
// 5. TRESOR ERSTELLEN (createVault)
// ==========================================

export interface CreateVaultResult {
  vaultRecord: VaultRecordV1;
  vaultKey: CryptoKey;
  recoveryCode: string;
}

/**
 * Erstellt einen neuen, sicheren Tresor (Vault).
 *
 * @param password Das gewählte Tresorpasswort (mindestens MIN_PASSWORD_LENGTH Zeichen).
 * @param extractableVaultKey Ob der zurückgegebene CryptoKey im RAM exportierbar sein soll (Standard: false).
 * @returns Der persistierbare VaultRecord, der entsperrte VaultKey (CryptoKey) und der einmalige Recovery-Code.
 */
export async function createVault(
  password: string,
  extractableVaultKey: boolean = false
): Promise<CreateVaultResult> {
  if (!password || password.trim().length < MIN_PASSWORD_LENGTH) {
    throw new CryptoError(
      'INVALID_PAYLOAD',
      `Das Tresorpasswort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`
    );
  }

  // 1. Zufälligen 256-Bit VaultKey generieren
  const vaultKeyBytes = generateVaultKeyBytes();

  // 2. Einmaligen Recovery-Code generieren (128 Bit Entropie)
  const recoveryCode = generateRecoveryCode();
  const normalizedRecovery = normalizeRecoveryCode(recoveryCode);

  // 3. Getrennte, frische Salts für Passwort und Recovery erzeugen (Domain Separation)
  const passwordSaltBytes = generateSalt(16);
  const recoverySaltBytes = generateSalt(16);

  // 4. Wrapping-Schlüssel via PBKDF2 ableiten
  const passwordKey = await deriveKeyFromPassword(
    password,
    passwordSaltBytes,
    DEFAULT_PBKDF2_ITERATIONS
  );
  const recoveryKey = await deriveKeyFromPassword(
    normalizedRecovery,
    recoverySaltBytes,
    DEFAULT_PBKDF2_ITERATIONS
  );

  // 5. VaultKey mit Passwort-Key und Recovery-Key wrappen
  const encryptedVaultKey = await wrapVaultKey(
    vaultKeyBytes,
    passwordKey,
    'vault-key-wrapping-password'
  );
  const recoveryWrappedVaultKey = await wrapVaultKey(
    vaultKeyBytes,
    recoveryKey,
    'vault-key-wrapping-recovery'
  );

  // 6. VaultKey als CryptoKey importieren
  const vaultKey = await importAESKey(vaultKeyBytes, extractableVaultKey);

  // 7. Temporäre Rohbytes im Speicher nullen (Speicherhygiene)
  vaultKeyBytes.fill(0);

  const now = new Date().toISOString();
  const vaultId = `vault_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  const vaultRecord: VaultRecordV1 = {
    version: 1,
    id: vaultId,
    createdAt: now,
    updatedAt: now,
    passwordSalt: uint8ArrayToBase64(passwordSaltBytes),
    passwordKdfIterations: DEFAULT_PBKDF2_ITERATIONS,
    encryptedVaultKey,
    recoverySalt: uint8ArrayToBase64(recoverySaltBytes),
    recoveryKdfIterations: DEFAULT_PBKDF2_ITERATIONS,
    recoveryWrappedVaultKey,
  };

  return {
    vaultRecord,
    vaultKey,
    recoveryCode,
  };
}

// ==========================================
// 6. TRESOR ENTSPERREN (unlockVault)
// ==========================================

/**
 * Entsperrt den Tresor mit dem Benutzerpasswort.
 *
 * @param vaultRecord Der gespeicherte VaultRecord
 * @param password Das Benutzerpasswort
 * @param extractable Ob der resultierende CryptoKey exportierbar sein soll (Standard: false)
 * @returns Der entschlüsselte VaultKey als nicht-exportierbarer CryptoKey
 */
export async function unlockVault(
  vaultRecord: VaultRecordV1,
  password: string,
  extractable: boolean = false
): Promise<CryptoKey> {
  if (!isVaultRecord(vaultRecord)) {
    throw new CryptoError('INVALID_PAYLOAD', 'Ungültiger VaultRecord.');
  }
  if (!password) {
    throw new CryptoError('DECRYPTION_FAILED', 'Tresor konnte nicht entsperrt werden. Falsches Passwort.');
  }

  const saltBytes = base64ToUint8Array(vaultRecord.passwordSalt);
  let passwordKey: CryptoKey;
  try {
    passwordKey = await deriveKeyFromPassword(
      password,
      saltBytes,
      vaultRecord.passwordKdfIterations
    );
  } catch {
    throw new CryptoError('DECRYPTION_FAILED', 'Tresor konnte nicht entsperrt werden.');
  }

  const rawKeyBytes = await unwrapVaultKey(
    vaultRecord.encryptedVaultKey,
    passwordKey,
    'vault-key-wrapping-password'
  );

  const vaultKey = await importAESKey(rawKeyBytes, extractable);
  rawKeyBytes.fill(0); // Speicherhygiene

  return vaultKey;
}

// ==========================================
// 7. RECOVERY (recoverVault)
// ==========================================

/**
 * Stellt den Tresor über den 128-Bit Recovery-Code wieder her.
 *
 * @param vaultRecord Der gespeicherte VaultRecord
 * @param recoveryCode Der formatiert oder unformatierte Recovery-Code
 * @param extractable Ob der resultierende CryptoKey exportierbar sein soll (Standard: false)
 */
export async function recoverVault(
  vaultRecord: VaultRecordV1,
  recoveryCode: string,
  extractable: boolean = false
): Promise<CryptoKey> {
  if (!isVaultRecord(vaultRecord)) {
    throw new CryptoError('INVALID_PAYLOAD', 'Ungültiger VaultRecord.');
  }

  const normalized = normalizeRecoveryCode(recoveryCode);
  const saltBytes = base64ToUint8Array(vaultRecord.recoverySalt);

  let recoveryKey: CryptoKey;
  try {
    recoveryKey = await deriveKeyFromPassword(
      normalized,
      saltBytes,
      vaultRecord.recoveryKdfIterations
    );
  } catch {
    throw new CryptoError('DECRYPTION_FAILED', 'Wiederherstellung fehlgeschlagen.');
  }

  const rawKeyBytes = await unwrapVaultKey(
    vaultRecord.recoveryWrappedVaultKey,
    recoveryKey,
    'vault-key-wrapping-recovery'
  );

  const vaultKey = await importAESKey(rawKeyBytes, extractable);
  rawKeyBytes.fill(0); // Speicherhygiene

  return vaultKey;
}

// Alias für Wiederherstellung
export const unlockVaultWithRecoveryCode = recoverVault;

// ==========================================
// 8. PASSWORT ÄNDERN (changeVaultPassword)
// ==========================================

/**
 * Ändert das Tresorpasswort.
 *
 * WICHTIG:
 * Der eigentliche VaultKey bleibt unverändert identisch!
 * Es wird lediglich ein neues Passwort-Wrapping mit frischem Salt erzeugt.
 * Bereits verschlüsselte Nutzdaten müssen bei einer Passwortänderung nicht re-verschlüsselt werden.
 */
export async function changeVaultPassword(
  vaultRecord: VaultRecordV1,
  oldPassword: string,
  newPassword: string
): Promise<VaultRecordV1> {
  if (!isVaultRecord(vaultRecord)) {
    throw new CryptoError('INVALID_PAYLOAD', 'Ungültiger VaultRecord.');
  }
  if (!newPassword || newPassword.trim().length < MIN_PASSWORD_LENGTH) {
    throw new CryptoError(
      'INVALID_PAYLOAD',
      `Das neue Tresorpasswort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`
    );
  }

  // 1. VaultKey mit altem Passwort entschlüsseln
  const oldSaltBytes = base64ToUint8Array(vaultRecord.passwordSalt);
  const oldPasswordKey = await deriveKeyFromPassword(
    oldPassword,
    oldSaltBytes,
    vaultRecord.passwordKdfIterations
  );
  const rawKeyBytes = await unwrapVaultKey(
    vaultRecord.encryptedVaultKey,
    oldPasswordKey,
    'vault-key-wrapping-password'
  );

  // 2. Neuen zufälligen Salt erzeugen
  const newSaltBytes = generateSalt(16);

  // 3. Neuen Passwort-Wrapping-Schlüssel ableiten
  const newPasswordKey = await deriveKeyFromPassword(
    newPassword,
    newSaltBytes,
    DEFAULT_PBKDF2_ITERATIONS
  );

  // 4. Denselben VaultKey mit neuem Passwort wrappen
  const newEncryptedVaultKey = await wrapVaultKey(
    rawKeyBytes,
    newPasswordKey,
    'vault-key-wrapping-password'
  );

  // 5. Speicherhygiene
  rawKeyBytes.fill(0);

  return {
    ...vaultRecord,
    updatedAt: new Date().toISOString(),
    passwordSalt: uint8ArrayToBase64(newSaltBytes),
    passwordKdfIterations: DEFAULT_PBKDF2_ITERATIONS,
    encryptedVaultKey: newEncryptedVaultKey,
    // Recovery-Wrapping bleibt vollständig unverändert!
  };
}

// ==========================================
// 9. PASSWORT ZURÜCKSETZEN ÜBER RECOVERY
// ==========================================

/**
 * Setzt das Tresorpasswort nach verlorenem Passwort über den Recovery-Code zurück.
 * Der VaultKey bleibt identisch; das Recovery-Wrapping bleibt weiterhin gültig.
 */
export async function resetVaultPasswordWithRecovery(
  vaultRecord: VaultRecordV1,
  recoveryCode: string,
  newPassword: string
): Promise<VaultRecordV1> {
  if (!isVaultRecord(vaultRecord)) {
    throw new CryptoError('INVALID_PAYLOAD', 'Ungültiger VaultRecord.');
  }
  if (!newPassword || newPassword.trim().length < MIN_PASSWORD_LENGTH) {
    throw new CryptoError(
      'INVALID_PAYLOAD',
      `Das neue Tresorpasswort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`
    );
  }

  // 1. VaultKey über Recovery-Code entschlüsseln
  const normalized = normalizeRecoveryCode(recoveryCode);
  const recoverySaltBytes = base64ToUint8Array(vaultRecord.recoverySalt);
  const recoveryKey = await deriveKeyFromPassword(
    normalized,
    recoverySaltBytes,
    vaultRecord.recoveryKdfIterations
  );
  const rawKeyBytes = await unwrapVaultKey(
    vaultRecord.recoveryWrappedVaultKey,
    recoveryKey,
    'vault-key-wrapping-recovery'
  );

  // 2. Frischen Passwort-Salt erzeugen
  const newSaltBytes = generateSalt(16);
  const newPasswordKey = await deriveKeyFromPassword(
    newPassword,
    newSaltBytes,
    DEFAULT_PBKDF2_ITERATIONS
  );

  // 3. VaultKey neu wrappen
  const newEncryptedVaultKey = await wrapVaultKey(
    rawKeyBytes,
    newPasswordKey,
    'vault-key-wrapping-password'
  );

  rawKeyBytes.fill(0); // Speicherhygiene

  return {
    ...vaultRecord,
    updatedAt: new Date().toISOString(),
    passwordSalt: uint8ArrayToBase64(newSaltBytes),
    passwordKdfIterations: DEFAULT_PBKDF2_ITERATIONS,
    encryptedVaultKey: newEncryptedVaultKey,
  };
}

// ==========================================
// 10. RECOVERY-CODE ROTIEREN (rotateRecoveryCode)
// ==========================================

export interface RotateRecoveryResult {
  updatedRecord: VaultRecordV1;
  newRecoveryCode: string;
}

/**
 * Erzeugt einen neuen Recovery-Code für den Tresor und invalidiert den alten Code.
 *
 * @param vaultRecord Der aktuelle VaultRecord
 * @param auth Entweder das aktuelle Passwort (als String), ein existierender Recovery-Code oder ein exportierbarer VaultKey
 */
export async function rotateRecoveryCode(
  vaultRecord: VaultRecordV1,
  auth: string | CryptoKey
): Promise<RotateRecoveryResult> {
  if (!isVaultRecord(vaultRecord)) {
    throw new CryptoError('INVALID_PAYLOAD', 'Ungültiger VaultRecord.');
  }

  let rawKeyBytes: Uint8Array;

  if (typeof auth === 'string') {
    // Versuchen, den Tresor mit dem übergebenen String (Passwort oder alter Recovery-Code) zu entschlüsseln
    try {
      const passwordSalt = base64ToUint8Array(vaultRecord.passwordSalt);
      const passwordKey = await deriveKeyFromPassword(
        auth,
        passwordSalt,
        vaultRecord.passwordKdfIterations
      );
      rawKeyBytes = await unwrapVaultKey(
        vaultRecord.encryptedVaultKey,
        passwordKey,
        'vault-key-wrapping-password'
      );
    } catch {
      // Wenn Passwort fehlschlägt, als Recovery-Code versuchen
      const normalized = normalizeRecoveryCode(auth);
      const recoverySalt = base64ToUint8Array(vaultRecord.recoverySalt);
      const recoveryKey = await deriveKeyFromPassword(
        normalized,
        recoverySalt,
        vaultRecord.recoveryKdfIterations
      );
      rawKeyBytes = await unwrapVaultKey(
        vaultRecord.recoveryWrappedVaultKey,
        recoveryKey,
        'vault-key-wrapping-recovery'
      );
    }
  } else if (auth instanceof CryptoKey || (typeof auth === 'object' && auth !== null && 'type' in auth)) {
    rawKeyBytes = await exportAESKey(auth);
  } else {
    throw new CryptoError(
      'INVALID_PAYLOAD',
      'Ungültige Authentifizierung zur Recovery-Rotation übergeben.'
    );
  }

  // Neuen Recovery-Code erzeugen
  const newRecoveryCode = generateRecoveryCode();
  const normalizedNew = normalizeRecoveryCode(newRecoveryCode);
  const newRecoverySaltBytes = generateSalt(16);

  const newRecoveryKey = await deriveKeyFromPassword(
    normalizedNew,
    newRecoverySaltBytes,
    DEFAULT_PBKDF2_ITERATIONS
  );

  const newRecoveryWrappedKey = await wrapVaultKey(
    rawKeyBytes,
    newRecoveryKey,
    'vault-key-wrapping-recovery'
  );

  rawKeyBytes.fill(0); // Speicherhygiene

  const updatedRecord: VaultRecordV1 = {
    ...vaultRecord,
    updatedAt: new Date().toISOString(),
    recoverySalt: uint8ArrayToBase64(newRecoverySaltBytes),
    recoveryKdfIterations: DEFAULT_PBKDF2_ITERATIONS,
    recoveryWrappedVaultKey: newRecoveryWrappedKey,
  };

  return {
    updatedRecord,
    newRecoveryCode,
  };
}

// ==========================================
// 11. VALIDIERUNGSFUNKTION (isVaultRecord)
// ==========================================

/**
 * Prüft typsicher, ob ein Wert einem gültigen VaultRecordV1 entspricht.
 */
export function isVaultRecord(value: unknown): value is VaultRecordV1 {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    candidate.version === 1 &&
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.updatedAt === 'string' &&
    typeof candidate.passwordSalt === 'string' &&
    candidate.passwordSalt.length > 0 &&
    typeof candidate.passwordKdfIterations === 'number' &&
    candidate.passwordKdfIterations >= 100_000 &&
    isEncryptedPayload(candidate.encryptedVaultKey) &&
    typeof candidate.recoverySalt === 'string' &&
    candidate.recoverySalt.length > 0 &&
    typeof candidate.recoveryKdfIterations === 'number' &&
    candidate.recoveryKdfIterations >= 100_000 &&
    isEncryptedPayload(candidate.recoveryWrappedVaultKey)
  );
}

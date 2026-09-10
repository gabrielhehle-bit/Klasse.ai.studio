/**
 * Web-Crypto-Basisschicht der LehrerAPP (Modul B2)
 *
 * Stellt kryptographische Grundfunktionen auf Basis der nativen W3C Web Cryptography API bereit:
 * - AES-GCM-256 (Verschlüsselung, Entschlüsselung, Authenticated Additional Data)
 * - PBKDF2 mit SHA-256 (Schlüsselableitung aus Passwörtern)
 * - Kryptographisch sichere IV- und Salt-Generierung
 * - Browser-kompatible Base64-Hilfsfunktionen
 *
 * SICHERHEITSHINWEISE:
 * - Es werden keine externen Krypto-Bibliotheken verwendet.
 * - Ausschließlich standardisierte Web Crypto APIs (window.crypto.subtle, crypto.getRandomValues).
 * - Keine Logs von Klartexten, Schlüsseln, Passwörtern oder Ciphertexten.
 * - Jeder Verschlüsselungsvorgang erzeugt zwingend einen frischen, kryptographisch zufälligen 12-Byte-IV.
 */

// ==========================================
// 1. TYPEN & FEHLERKLASSEN
// ==========================================

export interface EncryptedPayloadV1 {
  version: 1;
  algorithm: 'AES-GCM-256';
  iv: string; // Base64 (nach Dekodierung exakt 12 Bytes / 96 Bits)
  ciphertext: string; // Base64 (Chiffretext inkl. 128-Bit GCM Authentication Tag)
  salt?: string; // Optional: Base64-kodierter Salt bei passwortbasierten Payloads
  kdf?: 'PBKDF2-SHA-256'; // Optional: KDF-Verfahren
  kdfIterations?: number; // Optional: Iterationszahl
}

export type CryptoErrorCode =
  | 'INVALID_PAYLOAD'
  | 'UNSUPPORTED_VERSION'
  | 'UNSUPPORTED_ALGORITHM'
  | 'DECRYPTION_FAILED'
  | 'INVALID_KEY_LENGTH'
  | 'INVALID_SALT_LENGTH'
  | 'INVALID_IV_LENGTH'
  | 'KEY_NOT_EXTRACTABLE'
  | 'NO_CRYPTO_API';

export class CryptoError extends Error {
  readonly code: CryptoErrorCode;

  constructor(code: CryptoErrorCode, message: string) {
    super(message);
    this.name = 'CryptoError';
    this.code = code;
    Object.setPrototypeOf(this, CryptoError.prototype);
  }
}

// ==========================================
// 2. KONSTANTEN & STANDARDS
// ==========================================

/**
 * Kanonische Authenticated Additional Data (AAD) für AES-GCM Payload Version 1.
 * Verhindert Manipulation der Payload-Metadaten (Version, Algorithmus) durch
 * kryptographische Bindung in den 128-Bit GCM Authentication Tag.
 */
export const CANONICAL_AAD_V1 = 'LehrerAPP|EncryptedPayload|v1';
const AAD_BYTES_V1 = new TextEncoder().encode(CANONICAL_AAD_V1);

/**
 * Standard-Iterationszahl für PBKDF2-HMAC-SHA256 nach OWASP-Empfehlung.
 * Auf modernen Windows-ThinkPads und Chromium-Browsern bietet dieser Wert einen sehr hohen
 * Schutz gegen Brute-Force- und Wörterbuchangriffe bei einer angenehmen Ableitungsdauer (~150-300 ms).
 */
export const DEFAULT_PBKDF2_ITERATIONS = 600_000;

// ==========================================
// 3. WEB-CRYPTO HILFSFUNKTIONEN
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
    'Web Crypto API (crypto.subtle) ist in dieser Umgebung nicht verfügbar (z. B. fehlender Secure Context).'
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

// ==========================================
// 4. BASE64 HILFSFUNKTIONEN (Browser-safe)
// ==========================================

/**
 * Konvertiert ein Uint8Array sicher in einen Base64-String im Browser
 * (vermeidet Call-Stack-Limits durch Chunking).
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

/**
 * Konvertiert einen Base64-String in ein Uint8Array.
 * Wirft bei ungültigem Base64-Format einen CryptoError.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  try {
    const clean = base64.trim();
    if (!clean) {
      return new Uint8Array(0);
    }
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    throw new CryptoError('INVALID_PAYLOAD', 'Ungültiges Base64-Format.');
  }
}

// ==========================================
// 5. IV- & SALT-GENERIERUNG
// ==========================================

/**
 * Erzeugt einen kryptographisch sicheren, zufälligen 12-Byte (96-Bit) Initialisierungsvektor (IV).
 * 96 Bit ist die von NIST SP 800-38D empfohlene optimale Länge für AES-GCM.
 */
export function generateIV(): Uint8Array {
  const iv = new Uint8Array(12);
  getRandomValues(iv);
  return iv;
}

/**
 * Erzeugt ein kryptographisch sicheres, zufälliges Salt für Schlüsselableitungen.
 * @param byteLength Mindestens 16 Byte (128 Bit) nach kryptographischen Standards.
 */
export function generateSalt(byteLength: number = 16): Uint8Array {
  if (byteLength < 16) {
    throw new CryptoError(
      'INVALID_SALT_LENGTH',
      `Salt muss mindestens 16 Byte lang sein (angefordert: ${byteLength} Byte).`
    );
  }
  const salt = new Uint8Array(byteLength);
  getRandomValues(salt);
  return salt;
}

// ==========================================
// 6. SCHLÜSSELVERWALTUNG (AES-GCM-256)
// ==========================================

/**
 * Generiert einen neuen kryptographisch sicheren AES-GCM 256-Bit Schlüssel.
 * Standardmäßig NICHT exportierbar (extractable=false) für maximale Speichersicherheit.
 */
export async function generateAESKey(extractable: boolean = false): Promise<CryptoKey> {
  const subtle = getCryptoSubtle();
  return subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    extractable,
    ['encrypt', 'decrypt']
  );
}

/**
 * Importiert einen 32-Byte (256-Bit) Rohschlüssel als AES-GCM CryptoKey.
 * Validiert strikt die Schlüssellänge von exakt 32 Byte.
 */
export async function importAESKey(
  rawKey: Uint8Array,
  extractable: boolean = false
): Promise<CryptoKey> {
  if (rawKey.byteLength !== 32) {
    throw new CryptoError(
      'INVALID_KEY_LENGTH',
      `Ungültige Schlüssellänge: Der AES-Key muss exakt 32 Byte (256 Bit) lang sein (erhalten: ${rawKey.byteLength} Byte).`
    );
  }
  const subtle = getCryptoSubtle();
  return subtle.importKey(
    'raw',
    rawKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    extractable,
    ['encrypt', 'decrypt']
  );
}

/**
 * Exportiert einen AES-GCM CryptoKey als rohes 32-Byte Uint8Array.
 * Nur zulässig, wenn der Schlüssel explizit als exportierbar (extractable=true) erzeugt wurde.
 */
export async function exportAESKey(key: CryptoKey): Promise<Uint8Array> {
  if (!key.extractable) {
    throw new CryptoError(
      'KEY_NOT_EXTRACTABLE',
      'Dieser CryptoKey ist nicht exportierbar (extractable=false). Nur explizit exportierbare Schlüssel können exportiert werden.'
    );
  }
  const subtle = getCryptoSubtle();
  const raw = await subtle.exportKey('raw', key);
  return new Uint8Array(raw);
}

// ==========================================
// 7. PASSWORT-SCHLÜSSELABLEITUNG (PBKDF2)
// ==========================================

/**
 * Leitet einen AES-GCM 256-Bit Schlüssel deterministisch aus einem Passwort und Salt ab.
 * Verwendet PBKDF2 mit HMAC-SHA-256.
 *
 * @param password Das Quellpasswort
 * @param salt Kryptographisches Salt (mindestens 16 Byte)
 * @param iterations Iterationszahl (mindestens 100.000, Standard: DEFAULT_PBKDF2_ITERATIONS)
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array,
  iterations: number = DEFAULT_PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  if (!password || typeof password !== 'string') {
    throw new CryptoError('INVALID_PAYLOAD', 'Das Passwort darf nicht leer sein.');
  }
  if (salt.byteLength < 16) {
    throw new CryptoError(
      'INVALID_SALT_LENGTH',
      `Salt muss mindestens 16 Byte lang sein (erhalten: ${salt.byteLength} Byte).`
    );
  }
  if (iterations < 100_000) {
    throw new CryptoError(
      'INVALID_PAYLOAD',
      `Zu geringe Iterationszahl (${iterations}). Mindestens 100.000 Iterationen erforderlich.`
    );
  }

  const subtle = getCryptoSubtle();
  const pwBytes = new TextEncoder().encode(password);

  // 1. Basisschlüssel aus Passwort importieren
  const baseKey = await subtle.importKey(
    'raw',
    pwBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // 2. AES-GCM 256-Bit Schlüssel über PBKDF2 ableiten
  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false, // Nicht exportierbar nach Ableitung
    ['encrypt', 'decrypt']
  );
}

// ==========================================
// 8. VERSCHLÜSSELUNG (AES-GCM-256)
// ==========================================

/**
 * Verschlüsselt beliebige Daten mit AES-GCM-256.
 *
 * WICHTIG ZUR IV-SICHERHEIT:
 * Jeder Aufruf generiert automatisch einen frischen, kryptographisch zufälligen 12-Byte-IV.
 * Der Aufrufer kann und darf keinen festen IV übergeben, um IV-Wiederverwendung auszuschließen.
 *
 * @param data Beliebige zu verschlüsselnde Daten (werden über JSON serialisiert)
 * @param key AES-GCM-256 CryptoKey
 * @returns Versioniertes EncryptedPayloadV1 Objekt mit Base64-kodiertem IV und Ciphertext
 */
export async function encryptData<T>(
  data: T,
  key: CryptoKey
): Promise<EncryptedPayloadV1> {
  const subtle = getCryptoSubtle();

  // 1. Daten stabil in JSON serialisieren
  const jsonString = JSON.stringify(data);
  if (jsonString === undefined) {
    throw new CryptoError('INVALID_PAYLOAD', 'Daten konnten nicht in JSON serialisiert werden.');
  }
  const plaintextBytes = new TextEncoder().encode(jsonString);

  // 2. Garantiert frischen, kryptographisch zufälligen 12-Byte IV erzeugen
  const iv = generateIV();

  // 3. AES-GCM Verschlüsselung mit AAD
  const cipherBuffer = await subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: AAD_BYTES_V1,
      tagLength: 128,
    },
    key,
    plaintextBytes
  );

  // 4. Versioniertes Payload erzeugen (keine sensiblen Metadaten)
  return {
    version: 1,
    algorithm: 'AES-GCM-256',
    iv: uint8ArrayToBase64(iv),
    ciphertext: uint8ArrayToBase64(new Uint8Array(cipherBuffer)),
  };
}

// ==========================================
// 9. ENTSCHLÜSSELUNG (AES-GCM-256)
// ==========================================

/**
 * Entschlüsselt ein EncryptedPayloadV1 mit AES-GCM-256.
 *
 * Validiert:
 * - Version (nur 1 unterstützt)
 * - Algorithmus (nur AES-GCM-256 unterstützt)
 * - IV-Länge (exakt 12 Byte)
 * - Base64-Integrität
 * - AES-GCM Authentizität (inkl. AAD)
 * - Valides JSON
 *
 * @param payload Das zu entschlüsselnde EncryptedPayloadV1
 * @param key Der passende AES-GCM-256 CryptoKey
 * @returns Das rekonstruierte Originalobjekt vom Typ T
 */
export async function decryptData<T>(
  payload: EncryptedPayloadV1,
  key: CryptoKey
): Promise<T> {
  if (typeof payload !== 'object' || payload === null) {
    throw new CryptoError('INVALID_PAYLOAD', 'Ungültige Payload-Struktur: Objekt erwartet.');
  }

  const candidate = payload as unknown as Record<string, unknown>;

  if (typeof candidate.version !== 'number') {
    throw new CryptoError('INVALID_PAYLOAD', 'Ungültige Payload-Struktur: version fehlt oder ist keine Zahl.');
  }

  if (candidate.version !== 1) {
    throw new CryptoError(
      'UNSUPPORTED_VERSION',
      `Nicht unterstützte Payload-Version: ${candidate.version}.`
    );
  }

  if (candidate.algorithm !== 'AES-GCM-256') {
    throw new CryptoError(
      'UNSUPPORTED_ALGORITHM',
      `Nicht unterstützter Algorithmus: ${String(candidate.algorithm)}.`
    );
  }

  if (typeof candidate.iv !== 'string' || candidate.iv.length === 0) {
    throw new CryptoError('INVALID_PAYLOAD', 'Ungültige Payload-Struktur: iv fehlt oder ist leer.');
  }

  if (typeof candidate.ciphertext !== 'string' || candidate.ciphertext.length === 0) {
    throw new CryptoError('INVALID_PAYLOAD', 'Ungültige Payload-Struktur: ciphertext fehlt oder ist leer.');
  }

  // IV dekodieren und strikt auf 12 Byte (96 Bit) prüfen
  const iv = base64ToUint8Array(payload.iv);
  if (iv.byteLength !== 12) {
    throw new CryptoError(
      'INVALID_IV_LENGTH',
      `Ungültige IV-Länge: Erwartet 12 Byte, erhalten: ${iv.byteLength} Byte.`
    );
  }

  // Ciphertext dekodieren
  const cipherBytes = base64ToUint8Array(payload.ciphertext);
  if (cipherBytes.byteLength < 16) {
    // Mindestens 128 Bit (16 Byte) GCM-Auth-Tag erforderlich
    throw new CryptoError('DECRYPTION_FAILED', 'Entschlüsselung fehlgeschlagen. Ciphertext ist unvollständig.');
  }

  const subtle = getCryptoSubtle();

  let decryptedBuffer: ArrayBuffer;
  try {
    decryptedBuffer = await subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
        additionalData: AAD_BYTES_V1,
        tagLength: 128,
      },
      key,
      cipherBytes
    );
  } catch {
    // Bei falschem Schlüssel, manipuliertem Ciphertext, modifiziertem IV oder manipuliertem AAD
    throw new CryptoError(
      'DECRYPTION_FAILED',
      'Entschlüsselung fehlgeschlagen. Schlüssel ungültig oder Daten manipuliert.'
    );
  }

  // JSON parsen
  const jsonString = new TextDecoder('utf-8').decode(decryptedBuffer);
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    throw new CryptoError('INVALID_PAYLOAD', 'Entschlüsselte Daten konnten nicht als JSON geparst werden.');
  }
}

// ==========================================
// 10. TYP-PRÜFUNG / FORMAT-ERKENNUNG
// ==========================================

/**
 * Validiert typsicher, ob ein Wert der EncryptedPayloadV1-Spezifikation entspricht.
 */
export function isEncryptedPayload(value: unknown): value is EncryptedPayloadV1 {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    candidate.version === 1 &&
    candidate.algorithm === 'AES-GCM-256' &&
    typeof candidate.iv === 'string' &&
    candidate.iv.length > 0 &&
    typeof candidate.ciphertext === 'string' &&
    candidate.ciphertext.length > 0
  );
}

/**
 * Zero-Knowledge Smartboard- und Geräte-Sync der LehrerAPP (Modul B4)
 *
 * Verwaltet flüchtige, sitzungsgebundene SessionKeys (AES-GCM-256) für die Ende-zu-Ende-
 * Verschlüsselung des Smartboard- und Tablet-Syncs.
 *
 * SICHERHEITSARCHITEKTUR & REGELN:
 * 1. Der Master-VaultKey (B3) wird NIEMALS für den Sync verwendet oder übertragen.
 * 2. Jede Sync-Sitzung erhält einen eigenen, kryptographisch zufälligen 256-Bit SessionKey.
 * 3. Der SessionKey wird ausschließlich im RAM gehalten (niemals in localStorage, sessionStorage, IndexedDB).
 * 4. Der SessionKey wird an Gerät B ausschließlich über das URL-Fragment (#) übertragen,
 *    welches per HTTP-Standard NIEMALS an den Webserver gesendet wird.
 * 5. Nach dem Einlesen des Fragments wird die Browser-URL sofort per history.replaceState bereinigt.
 * 6. Der Server sieht und speichert ausschließlich opaken Ciphertext, Session-Code und Metadaten.
 */

import {
  generateAESKey,
  importAESKey,
  exportAESKey,
  encryptData,
  decryptData,
  isEncryptedPayload,
  CryptoError,
  type EncryptedPayloadV1,
} from './crypto.js';

// ==========================================
// 1. TYPEN & SCHNITTSTELLEN
// ==========================================

export interface EncryptedSyncPayloadV1 {
  protocolVersion: 1;
  encryptedState: EncryptedPayloadV1;
  updatedAt: number; // Zeitstempel in ms (Replay- & Monotonie-Schutz)
  sequence?: number; // Monoton steigender Zähler
}

export interface SyncSessionCredentials {
  sessionKey: CryptoKey;
  rawBytes: Uint8Array;
  encodedKey: string; // URL-safe Base64
}

export interface ParsedSyncFragment {
  code: string;
  encodedKey: string;
}

// ==========================================
// 2. URL-SAFE BASE64 HELPER FÜR SESSION-KEYS
// ==========================================

/**
 * Wandelt 32 Bytes (256 Bit) eines SessionKeys in eine URL-sichere Base64-Zeichenkette
 * (RFC 4648 Base64URL ohne Füllzeichen =) um.
 */
export function encodeSessionKey(rawBytes: Uint8Array): string {
  if (!(rawBytes instanceof Uint8Array) || rawBytes.byteLength !== 32) {
    throw new CryptoError(
      'INVALID_KEY_LENGTH',
      `SessionKey muss exakt 32 Bytes lang sein (erhalten: ${rawBytes?.byteLength ?? 0}).`
    );
  }

  // Standard-Base64 erzeugen
  let binary = '';
  const len = rawBytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(rawBytes[i]);
  }

  let base64: string;
  if (typeof btoa === 'function') {
    base64 = btoa(binary);
  } else if (typeof Buffer !== 'undefined') {
    base64 = Buffer.from(rawBytes).toString('base64');
  } else {
    throw new CryptoError('NO_CRYPTO_API', 'Keine Base64-Kodierungsfunktion verfügbar.');
  }

  // In Base64URL umwandeln: '+' -> '-', '/' -> '_', '=' entfernen
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Dekodiert eine URL-sichere Base64-Zeichenkette zurück in ein 32-Byte-Array.
 * Validiert strikt auf exakt 32 Bytes (256 Bit).
 */
export function decodeSessionKey(encoded: string): Uint8Array {
  if (!encoded || typeof encoded !== 'string') {
    throw new CryptoError('INVALID_KEY_LENGTH', 'SessionKey-String ist leer oder ungültig.');
  }

  const trimmed = encoded.trim();
  if (trimmed.length < 40 || trimmed.length > 50) {
    throw new CryptoError(
      'INVALID_KEY_LENGTH',
      `Ungültige SessionKey-Länge: ${trimmed.length} Zeichen.`
    );
  }

  // Base64URL in Standard-Base64 zurückwandeln
  let base64 = trimmed.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }

  try {
    let bytes: Uint8Array;
    if (typeof atob === 'function') {
      const binary = atob(base64);
      bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
    } else if (typeof Buffer !== 'undefined') {
      bytes = new Uint8Array(Buffer.from(base64, 'base64'));
    } else {
      throw new CryptoError('NO_CRYPTO_API', 'Keine Base64-Dekodierungsfunktion verfügbar.');
    }

    if (bytes.byteLength !== 32) {
      throw new CryptoError(
        'INVALID_KEY_LENGTH',
        `SessionKey muss exakt 32 Bytes dekodieren (erhalten: ${bytes.byteLength}).`
      );
    }
    return bytes;
  } catch (e: any) {
    if (e instanceof CryptoError) throw e;
    throw new CryptoError('INVALID_PAYLOAD', 'Fehler beim Dekodieren des SessionKeys aus Base64URL.');
  }
}

// ==========================================
// 3. SESSION-KEY MANAGEMENT
// ==========================================

/**
 * Erzeugt einen neuen flüchtigen 256-Bit SessionKey für eine neue Sync-Sitzung.
 */
export async function generateSyncSessionKey(): Promise<SyncSessionCredentials> {
  const sessionKey = await generateAESKey(true); // exportierbar, um ihn Gerät B via URL übergeben zu können
  const rawBytes = await exportAESKey(sessionKey);
  const encodedKey = encodeSessionKey(rawBytes);

  return {
    sessionKey,
    rawBytes,
    encodedKey,
  };
}

/**
 * Importiert einen über URL/QR empfangenen Base64URL-SessionKey als CryptoKey.
 */
export async function importSessionKey(
  encodedKeyOrBytes: string | Uint8Array,
  extractable: boolean = false
): Promise<CryptoKey> {
  const bytes = typeof encodedKeyOrBytes === 'string'
    ? decodeSessionKey(encodedKeyOrBytes)
    : encodedKeyOrBytes;

  if (bytes.byteLength !== 32) {
    throw new CryptoError('INVALID_KEY_LENGTH', 'Ungültige Schlüssellänge beim Import.');
  }

  return importAESKey(bytes, extractable);
}

/**
 * Exportiert einen CryptoKey als URL-sicheren Base64-String.
 */
export async function exportSessionKey(key: CryptoKey): Promise<string> {
  const bytes = await exportAESKey(key);
  return encodeSessionKey(bytes);
}

// ==========================================
// 4. VERSCHLÜSSELUNG & ENTSCHLÜSSELUNG
// ==========================================

/**
 * Verschlüsselt den AppState mit dem flüchtigen SessionKey.
 * Verwendet AES-GCM-256 mit kanonischem AAD und frischem 12-Byte-IV.
 */
export async function encryptSyncState(
  state: unknown,
  sessionKey: CryptoKey,
  sequence?: number
): Promise<EncryptedSyncPayloadV1> {
  if (!sessionKey) {
    throw new CryptoError('NO_CRYPTO_API', 'Kein SessionKey zum Verschlüsseln übergeben.');
  }

  const encryptedState = await encryptData(state, sessionKey);

  return {
    protocolVersion: 1,
    encryptedState,
    updatedAt: Date.now(),
    sequence,
  };
}

/**
 * Entschlüsselt einen vom Server empfangenen EncryptedSyncPayloadV1.
 * Wirft einen CryptoError, wenn Chiffretext manipuliert wurde oder der SessionKey falsch ist.
 */
export async function decryptSyncState<T = any>(
  payload: unknown,
  sessionKey: CryptoKey
): Promise<T> {
  if (!sessionKey) {
    throw new CryptoError('NO_CRYPTO_API', 'Kein SessionKey zum Entschlüsseln übergeben.');
  }

  if (!isEncryptedSyncPayload(payload)) {
    throw new CryptoError(
      'INVALID_PAYLOAD',
      'Ungültiges Sync-Payload-Format oder ununterstützte Protokollversion.'
    );
  }

  return decryptData<T>(payload.encryptedState, sessionKey);
}

/**
 * Typsichere Validierungsfunktion für EncryptedSyncPayloadV1.
 */
export function isEncryptedSyncPayload(value: unknown): value is EncryptedSyncPayloadV1 {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const c = value as Record<string, unknown>;
  return (
    c.protocolVersion === 1 &&
    typeof c.updatedAt === 'number' &&
    isEncryptedPayload(c.encryptedState)
  );
}

export const isEncryptedSyncPayloadV1 = isEncryptedSyncPayload;

// ==========================================
// 5. URL-FRAGMENT HANDLER & PRIVACY-CLEANUP
// ==========================================

/**
 * Erzeugt eine vollständige Sync-URL mit Hash-Fragment.
 * WICHTIG: Das Fragment (#) wird vom Browser niemals im HTTP-Request an den Server übertragen!
 * Struktur: https://app.domain/#sync=CODE&key=URL_SAFE_KEY
 */
export function createSyncUrl(code: string, encodedKey: string, baseUrl?: string): string {
  const cleanCode = code.trim().toUpperCase();
  const cleanKey = encodedKey.trim();

  let base = baseUrl;
  if (!base && typeof window !== 'undefined' && window.location) {
    base = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
  }
  if (!base) {
    base = '';
  }

  // Eventuelles Hash oder Query aus der Basis-URL entfernen
  const cleanBase = base.split('#')[0].split('?')[0];
  return `${cleanBase}#sync=${cleanCode}&key=${cleanKey}`;
}

/**
 * Liest Session-Code und SessionKey ausschließlich aus dem URL-Hash.
 * Query-Parameter werden absichtlich nie akzeptiert, weil sie an den Server übertragen
 * und dort in Logs/Proxies sichtbar werden könnten.
 * Gibt null zurück, wenn kein gültiger Sync-Fragmentparameter vorliegt.
 */
export function parseSyncHash(hashInput?: string): ParsedSyncFragment | null {
  let raw = hashInput;
  if (raw === undefined && typeof window !== 'undefined') {
    raw = window.location.hash || '';
  }

  if (!raw || typeof raw !== 'string') {
    return null;
  }

  let searchPart = '';
  const hashIdx = raw.indexOf('#');
  if (hashIdx !== -1) {
    searchPart = raw.slice(hashIdx + 1);
  } else if (raw.startsWith('#')) {
    searchPart = raw.slice(1);
  } else {
    // Never accept ?sync=...&key=... because query strings are transmitted to the server.
    return null;
  }

  searchPart = searchPart.replace(/^#/, '');
  if (!searchPart) {
    return null;
  }

  const params = new URLSearchParams(searchPart);
  const code = params.get('sync')?.trim().toUpperCase();
  const key = params.get('key')?.trim();

  if (code && code.length === 6 && key && key.length >= 40) {
    return {
      code,
      encodedKey: key,
    };
  }

  return null;
}

/**
 * Bereinigt das sensible URL-Fragment aus der Adressleiste und der Browser-History
 * via history.replaceState, damit der SessionKey nicht in Screenshots, Adressleisten
 * oder Verlaufseinträgen verbleibt.
 */
export function cleanSyncUrlFromHistory(): void {
  if (typeof window !== 'undefined' && window.history?.replaceState && window.location) {
    try {
      const cleanUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
      window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    } catch {
      // Ignorieren bei restriktiven Test-Umgebungen
    }
  }
}

// ==========================================
// 6. IN-MEMORY KEY STORE (STRENG RAM-ONLY!)
// ==========================================

let activeMemorySessionKey: CryptoKey | null = null;
let activeMemoryEncodedKey: string | null = null;

export function getActiveSessionKey(): CryptoKey | null {
  return activeMemorySessionKey;
}

export function getActiveEncodedSessionKey(): string | null {
  return activeMemoryEncodedKey;
}

export function setActiveSessionKey(key: CryptoKey | null, encoded: string | null): void {
  activeMemorySessionKey = key;
  activeMemoryEncodedKey = encoded;
}

export function clearActiveSessionKey(): void {
  activeMemorySessionKey = null;
  activeMemoryEncodedKey = null;
}

// ==========================================
// 7. HIGH-LEVEL SYNC API HELPER (CLIENT-SEITIG)
// ==========================================

/**
 * Startet eine neue Zero-Knowledge Sync-Sitzung:
 * 1. Generiert frischen 256-Bit SessionKey (flüchtig im RAM).
 * 2. Verschlüsselt den aktuellen AppState mit AES-GCM-256.
 * 3. Sendet ausschließlich den opaken Ciphertext an den Server (/api/sync/create).
 * 4. Gibt den 6-stelligen Code, den EncodedKey und die #sync=CODE&key=KEY URL zurück.
 */
export async function startSyncSession(
  appState: unknown
): Promise<{ code: string; encodedKey: string; syncUrl: string; sessionKey: CryptoKey }> {
  const creds = await generateSyncSessionKey();
  setActiveSessionKey(creds.sessionKey, creds.encodedKey);

  const encryptedPayload = await encryptSyncState(appState, creds.sessionKey);

  const res = await fetch('/api/sync/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ encryptedPayload }),
  });

  if (!res.ok) {
    clearActiveSessionKey();
    throw new Error(`Sync-Sitzung konnte nicht erstellt werden (HTTP ${res.status}).`);
  }

  const data = await res.json();
  if (!data?.code) {
    clearActiveSessionKey();
    throw new Error('Server hat keinen gültigen Session-Code zurückgegeben.');
  }

  const syncUrl = createSyncUrl(data.code, creds.encodedKey);
  return {
    code: data.code,
    encodedKey: creds.encodedKey,
    syncUrl,
    sessionKey: creds.sessionKey,
  };
}

/**
 * Beendet eine aktive Sync-Sitzung:
 * 1. Sendet DELETE /api/sync/:code an den Server.
 * 2. Löscht den SessionKey sofort rückstandslos aus dem RAM.
 */
export async function stopSyncSession(code?: string): Promise<void> {
  if (code) {
    try {
      await fetch(`/api/sync/${encodeURIComponent(code.trim().toUpperCase())}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('[Sync Client] Fehler beim Senden von DELETE:', e);
    }
  }
  clearActiveSessionKey();
}

/**
 * Verbindet ein Zweitgerät (z.B. Fernbedienung / Smartphone) mit einer Zero-Knowledge Sitzung:
 * 1. Lädt opaken EncryptedPayload vom Server (/api/sync/:code).
 * 2. Importiert den SessionKey aus dem Fragment / Input.
 * 3. Entschlüsselt den AppState lokal im Browser.
 * 4. Bereinigt die Browser-URL via history.replaceState.
 */
export async function connectSyncSession(
  code: string,
  encodedKey: string
): Promise<{ decryptedState: any; sessionKey: CryptoKey }> {
  const cleanCode = code.trim().toUpperCase();
  const sessionKey = await importSessionKey(encodedKey);

  const res = await fetch(`/api/sync/${encodeURIComponent(cleanCode)}`);
  if (!res.ok) {
    throw new Error(`Sitzung ${cleanCode} ungültig oder abgelaufen (HTTP ${res.status}).`);
  }

  const data = await res.json();
  if (!data?.encryptedPayload) {
    throw new Error('Server hat keinen verschlüsselten Payload zurückgegeben.');
  }

  const decryptedState = await decryptSyncState(data.encryptedPayload, sessionKey);
  setActiveSessionKey(sessionKey, encodedKey);
  cleanSyncUrlFromHistory();

  return { decryptedState, sessionKey };
}

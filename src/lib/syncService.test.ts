import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSyncSessionKey,
  importSessionKey,
  exportSessionKey,
  createSyncUrl,
  parseSyncHash,
  encryptSyncState,
  decryptSyncState,
  isEncryptedSyncPayloadV1,
  getActiveSessionKey,
  getActiveEncodedSessionKey,
  setActiveSessionKey,
  clearActiveSessionKey,
  EncryptedSyncPayloadV1,
} from './syncService';

// Mock Web Crypto in Node environment if needed
if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.subtle) {
  const { webcrypto } = await import('node:crypto');
  // @ts-ignore
  globalThis.crypto = webcrypto;
}

test('Zero-Knowledge Sync – generateSyncSessionKey erzeugt frischen 256-Bit Key und URL-sicheres Base64', async () => {
  const { sessionKey, encodedKey } = await generateSyncSessionKey();
  assert.ok(sessionKey, 'SessionKey muss existieren');
  assert.equal(sessionKey.algorithm.name, 'AES-GCM');
  // @ts-ignore
  assert.equal(sessionKey.algorithm.length, 256);

  assert.ok(typeof encodedKey === 'string' && encodedKey.length > 0, 'EncodedKey muss ein String sein');
  // URL-sicher: keine +, / oder = Zeichen
  assert.ok(!encodedKey.includes('+'), 'Darf kein + enthalten');
  assert.ok(!encodedKey.includes('/'), 'Darf kein / enthalten');
  assert.ok(!encodedKey.includes('='), 'Darf kein Padding = enthalten');

  // Re-Import prüfen
  const reimported = await importSessionKey(encodedKey, true);
  const raw1 = await exportSessionKey(sessionKey);
  const raw2 = await exportSessionKey(reimported);
  assert.equal(raw1, raw2, 'Re-importierter Schlüssel muss identische Bytes aufweisen');
});

test('Zero-Knowledge Sync – createSyncUrl und parseSyncHash generieren und parsen #sync=CODE&key=KEY korrekt', () => {
  const code = 'X9K2P4';
  const encodedKey = 'abcdefghijklmnopqrstuvwxyz0123456789-_ABCDE'; // 43 Zeichen (32 Bytes Base64URL)
  const origin = 'https://klassio.example/unterricht';

  const fullUrl = createSyncUrl(code, encodedKey, origin);
  assert.equal(fullUrl, `https://klassio.example/unterricht#sync=X9K2P4&key=${encodedKey}`);

  // Fragment isoliert parsen
  const parsedFromHash = parseSyncHash(`#sync=X9K2P4&key=${encodedKey}`);
  assert.ok(parsedFromHash);
  assert.equal(parsedFromHash.code, 'X9K2P4');
  assert.equal(parsedFromHash.encodedKey, encodedKey);

  // Vollständige URL parsen
  const parsedFromUrl = parseSyncHash(fullUrl);
  assert.ok(parsedFromUrl);
  assert.equal(parsedFromUrl.code, 'X9K2P4');
  assert.equal(parsedFromUrl.encodedKey, encodedKey);

  // Ungültige Fragmente abweisen
  assert.equal(parseSyncHash(''), null);
  assert.equal(parseSyncHash('#other=123'), null);
  assert.equal(parseSyncHash('#sync=X9K2P4'), null, 'Fehlender Key muss abgewiesen werden');
  assert.equal(
    parseSyncHash(`?sync=X9K2P4&key=${encodedKey}`),
    null,
    'SessionKey in Query-Parametern muss abgewiesen werden, weil Queries an den Server übertragen werden',
  );
  assert.equal(
    parseSyncHash(`https://klassio.example/unterricht?sync=X9K2P4&key=${encodedKey}`),
    null,
    'Auch vollständige URLs mit Query-Key dürfen nicht als Sync-Link akzeptiert werden',
  );
});

test('Zero-Knowledge Sync – encryptSyncState und decryptSyncState Roundtrip mit echtem Datenbestand', async () => {
  const { sessionKey } = await generateSyncSessionKey();

  const mockAppState = {
    stufe: 3,
    aktuelleKlasse: '3b',
    schueler: [
      { id: 's1', name: 'Musterkind Anna', geschlecht: 'w', note: 1, bemerkung: 'Sensible Förderdiagnostik' },
      { id: 's2', name: 'Musterkind Ben', geschlecht: 'm', note: 2, bemerkung: 'Sprachförderbedarf MIKA-D' },
    ],
    boardSettings: {
      activeSyncCode: 'T7H3W9',
      isRemoteController: false,
    },
  };

  const payload: EncryptedSyncPayloadV1 = await encryptSyncState(mockAppState, sessionKey);

  // 1. Strukturvalidierung
  assert.ok(isEncryptedSyncPayloadV1(payload), 'Muss ein valider EncryptedSyncPayloadV1 sein');
  assert.equal(payload.protocolVersion, 1);
  assert.ok(payload.encryptedState.ciphertext.length > 0);
  assert.ok(payload.encryptedState.iv.length > 0);
  assert.equal(payload.encryptedState.algorithm, 'AES-GCM-256');

  // 2. Zero-Knowledge-Prüfung: Keinerlei Klartext-Strings im Payload auffindbar!
  const serializedPayload = JSON.stringify(payload);
  assert.ok(!serializedPayload.includes('Musterkind Anna'), 'Schülername darf nicht im Ciphertext lesbar sein');
  assert.ok(!serializedPayload.includes('Sensible Förderdiagnostik'), 'Diagnostik darf nicht im Klartext übertragen werden');
  assert.ok(!serializedPayload.includes('MIKA-D'), 'Förderbedarfe dürfen nicht unverschlüsselt vorliegen');

  // 3. Entschlüsselung
  const decrypted = await decryptSyncState(payload, sessionKey);
  assert.deepEqual(decrypted, mockAppState, 'Entschlüsselter Zustand muss identisch zum Originalzustand sein');
});

test('Zero-Knowledge Sync – Entschlüsselung mit falschem SessionKey schlägt fehl', async () => {
  const keyPairA = await generateSyncSessionKey();
  const keyPairB = await generateSyncSessionKey();

  const mockData = { geheimnis: 'Vertrauliche Notenkonferenz' };
  const payload = await encryptSyncState(mockData, keyPairA.sessionKey);

  await assert.rejects(
    async () => {
      await decryptSyncState(payload, keyPairB.sessionKey);
    },
    /Entschlüsselung fehlgeschlagen|integrity check failed|operation failed/i,
    'Falscher SessionKey muss Entschlüsselung sicher abweisen'
  );
});

test('Zero-Knowledge Sync – Manipulierter Ciphertext wird durch AES-GCM Authentifizierungs-Tag abgewiesen', async () => {
  const { sessionKey } = await generateSyncSessionKey();
  const mockData = { saldo: 500 };
  const payload = await encryptSyncState(mockData, sessionKey);

  // Ciphertext manipulieren (1 Zeichen ändern)
  const tamperedCiphertext = payload.encryptedState.ciphertext.slice(0, -2) + 'AA';
  const tamperedPayload: EncryptedSyncPayloadV1 = {
    ...payload,
    encryptedState: {
      ...payload.encryptedState,
      ciphertext: tamperedCiphertext,
    },
  };

  await assert.rejects(
    async () => {
      await decryptSyncState(tamperedPayload, sessionKey);
    },
    'Manipulierter Ciphertext muss durch GCM AuthTag Integritätsprüfung verworfen werden'
  );
});

test('Zero-Knowledge Sync – In-Memory SessionKey Speicher arbeitet flüchtig und isoliert', async () => {
  clearActiveSessionKey();
  assert.equal(getActiveSessionKey(), null);
  assert.equal(getActiveEncodedSessionKey(), null);

  const { sessionKey, encodedKey } = await generateSyncSessionKey();
  setActiveSessionKey(sessionKey, encodedKey);

  assert.equal(getActiveSessionKey(), sessionKey);
  assert.equal(getActiveEncodedSessionKey(), encodedKey);

  clearActiveSessionKey();
  assert.equal(getActiveSessionKey(), null);
  assert.equal(getActiveEncodedSessionKey(), null);
});

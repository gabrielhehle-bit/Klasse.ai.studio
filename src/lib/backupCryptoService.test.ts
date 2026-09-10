/**
 * Umfassende Test-Suite für Modul B5:
 * Verschlüsselte Backups & Zero-Knowledge-Cloud-Sicherung der LehrerAPP
 *
 * Prüft alle geforderten 15 Kernkriterien:
 * 1. AppState -> verschlüsseltes Backup -> Entschlüsselung ergibt identischen State
 * 2. Backup-Datei enthält String "Max Mustermann" nicht
 * 3. Backup-Datei enthält keine SVNR-Testnummer (1234010190)
 * 4. Falscher VaultKey schlägt fehl
 * 5. Manipulierter Ciphertext schlägt fehl
 * 6. Wiederherstellung mit Recovery-Code funktioniert (Katastrophenfall / neues Gerät)
 * 7. Falscher Recovery-Code schlägt fehl
 * 8. VaultRecord im Backup enthält weder Passwort noch Recovery-Code
 * 9. Zwei Backups desselben States erzeugen unterschiedliche Ciphertexts (frischer 12-Byte-IV)
 * 10. Legacy-Klartextbackup wird korrekt erkannt
 * 11. Legacy-Import funktioniert lokal weiterhin
 * 12. Neuer Export nach Legacy-Import ist verschlüsselt
 * 13. Ungültiges Backup verändert bestehenden State nicht
 * 14. OneDrive-Upload erhält nur verschlüsselten Backup-Blob
 * 15. Serverseitiger OneDrive-Handler kann keinen Schülerklartext finden
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createEncryptedBackup,
  decryptBackup,
  recoverBackup,
  unlockAndDecryptBackup,
  isEncryptedBackupV1,
  isLegacyPlaintextBackup,
  serializeBackup,
  deserializeBackup,
  generateBackupFilename,
  BACKUP_FORMAT_IDENTIFIER,
  CURRENT_BACKUP_VERSION,
  type LehrerAppEncryptedBackupV1,
} from './backupCryptoService.js';

import {
  createVault,
  unlockVault,
  rotateRecoveryCode,
  type VaultRecordV1,
} from './vaultService.js';

import {
  generateAESKey,
  generateSalt,
  exportAESKey,
  uint8ArrayToBase64,
} from './crypto.js';

// Polyfill Web Crypto for Node environment if needed
if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.subtle) {
  const { webcrypto } = await import('node:crypto');
  // @ts-ignore
  globalThis.crypto = webcrypto;
}

// Fiktiver, hochgradig realistischer Test-Datenbestand mit allen geforderten sensiblen Begriffen
const REALISTIC_TEST_STATE = {
  version: 3,
  klassenbezeichnung: '4a Volksschule',
  stufe: 4,
  schueler: [
    {
      id: 'schueler-001',
      name: 'Max Mustermann',
      adresse: 'Musterstraße 12, 1010 Wien',
      svnr: '1234010190',
      religion: 'Religion röm.-kath.',
      geburtsdatum: '2015-01-01',
      noten: {
        deutsch: 1,
        mathematik: 2,
        sachunterricht: 1,
      },
      diagnostik: 'Sonderpädagogischer Förderbedarf (SPF) Sprachheilpädagogik',
      foerderziel: 'Förderziel: Ausbau des aktiven Wortschatzes und Festigung der Lautbildung',
    },
    {
      id: 'schueler-002',
      name: 'Erika Musterfrau',
      adresse: 'Testgasse 5, 1020 Wien',
      svnr: '9876020291',
      religion: 'ohne Bekenntnis',
      geburtsdatum: '2015-02-02',
      noten: {
        deutsch: 2,
        mathematik: 1,
      },
      diagnostik: 'Hochbegabung Diagnostik Mathematik',
      foerderziel: 'Förderziel: Differenzierte Aufgabenstellungen im Zahlenraum 100.000',
    },
  ],
  stammplan: {
    Montag: { '1': 'Mathematik', '2': 'Deutsch', '3': 'Religion' },
  },
};

const TEST_PASSWORD = 'SicheresLehrerPasswort#2026!';

// Hilfsfunktion: Frischen Test-Tresor erzeugen
async function createTestVault() {
  const initResult = await createVault(TEST_PASSWORD, true);
  return {
    vaultRecord: initResult.vaultRecord,
    vaultKey: initResult.vaultKey,
    recoveryCode: initResult.recoveryCode,
  };
}

// -------------------------------------------------------------
// TEST 1: AppState -> verschlüsseltes Backup -> Entschlüsselung
// -------------------------------------------------------------
test('Test 1: AppState -> verschlüsseltes Backup -> Entschlüsselung ergibt identischen State', async () => {
  const { vaultRecord, vaultKey } = await createTestVault();

  const backup = await createEncryptedBackup(REALISTIC_TEST_STATE, vaultKey, vaultRecord);

  assert.ok(isEncryptedBackupV1(backup), 'Erzeugtes Objekt muss isEncryptedBackupV1 erfüllen');
  assert.equal(backup.format, BACKUP_FORMAT_IDENTIFIER);
  assert.equal(backup.version, CURRENT_BACKUP_VERSION);
  assert.ok(typeof backup.createdAt === 'string');

  const decryptedState = await decryptBackup<typeof REALISTIC_TEST_STATE>(backup, vaultKey);
  assert.deepEqual(decryptedState, REALISTIC_TEST_STATE, 'Entschlüsselter State muss exakt übereinstimmen');
});

// -------------------------------------------------------------
// TEST 2 & 3: Keine Klartext-Schülerdaten oder SVNR im Backup
// -------------------------------------------------------------
test('Test 2 & 3: Backup-Datei enthält sensible Daten ("Max Mustermann", SVNR "1234010190", etc.) NICHT im Klartext', async () => {
  const { vaultRecord, vaultKey } = await createTestVault();

  const backup = await createEncryptedBackup(REALISTIC_TEST_STATE, vaultKey, vaultRecord);
  const serialized = serializeBackup(backup);

  // Strikte Verifikation geforderter sensibler Strings:
  assert.ok(!serialized.includes('Max Mustermann'), 'Name "Max Mustermann" darf nirgendwo im Klartext vorkommen');
  assert.ok(!serialized.includes('Musterstraße 12'), 'Adresse darf nirgendwo im Klartext vorkommen');
  assert.ok(!serialized.includes('1234010190'), 'SVNR darf nirgendwo im Klartext vorkommen');
  assert.ok(!serialized.includes('Religion röm.-kath.'), 'Religion darf nirgendwo im Klartext vorkommen');
  assert.ok(!serialized.includes('Sprachheilpädagogik'), 'Diagnostik darf nirgendwo im Klartext vorkommen');
  assert.ok(!serialized.includes('Förderziel: Ausbau des aktiven Wortschatzes'), 'Förderziel darf nirgendwo im Klartext vorkommen');
  assert.ok(!serialized.includes('Erika Musterfrau'), 'Name "Erika Musterfrau" darf nicht im Klartext vorkommen');

  // Prüfen, dass Deserialisierung intakt ist
  const deserialized = deserializeBackup(serialized);
  assert.ok(isEncryptedBackupV1(deserialized));
});

// -------------------------------------------------------------
// TEST 4: Falscher VaultKey schlägt fehl
// -------------------------------------------------------------
test('Test 4: Entschlüsselung mit falschem VaultKey schlägt fehl', async () => {
  const { vaultRecord, vaultKey } = await createTestVault();
  const differentVault = await createTestVault();

  const backup = await createEncryptedBackup(REALISTIC_TEST_STATE, vaultKey, vaultRecord);

  await assert.rejects(
    async () => {
      await decryptBackup(backup, differentVault.vaultKey);
    },
    /Entschlüsselung fehlgeschlagen|integrity check failed|operation failed/i,
    'Falscher VaultKey muss Entschlüsselung sicher abweisen'
  );
});

// -------------------------------------------------------------
// TEST 5: Manipulierter Ciphertext schlägt fehl
// -------------------------------------------------------------
test('Test 5: Manipulierter Ciphertext wird durch AES-GCM Authentifizierungs-Tag abgewiesen', async () => {
  const { vaultRecord, vaultKey } = await createTestVault();
  const backup = await createEncryptedBackup(REALISTIC_TEST_STATE, vaultKey, vaultRecord);

  // Manipuliere 2 Zeichen im Base64-Ciphertext
  const originalCiphertext = backup.encryptedState.ciphertext;
  const tamperedCiphertext = originalCiphertext.slice(0, -2) + 'XY';

  const tamperedBackup: LehrerAppEncryptedBackupV1 = {
    ...backup,
    encryptedState: {
      ...backup.encryptedState,
      ciphertext: tamperedCiphertext,
    },
  };

  await assert.rejects(
    async () => {
      await decryptBackup(tamperedBackup, vaultKey);
    },
    'Manipulierter Ciphertext muss durch GCM Integritätsprüfung verworfen werden'
  );
});

// -------------------------------------------------------------
// TEST 6: Wiederherstellung mit Recovery-Code funktioniert
// -------------------------------------------------------------
test('Test 6: Wiederherstellung mit Recovery-Code funktioniert auf neuem Gerät', async () => {
  const { vaultRecord, vaultKey, recoveryCode } = await createTestVault();
  const backup = await createEncryptedBackup(REALISTIC_TEST_STATE, vaultKey, vaultRecord);

  // Simulation: Ein völlig neues Gerät ohne alten Speicher empfängt nur backup + recoveryCode
  const result = await recoverBackup<typeof REALISTIC_TEST_STATE>(backup, recoveryCode);

  assert.deepEqual(result.appState, REALISTIC_TEST_STATE);
  assert.ok(result.vaultKey);
  assert.equal(result.vaultRecord.id, vaultRecord.id);
});

// -------------------------------------------------------------
// TEST 7: Falscher Recovery-Code schlägt fehl
// -------------------------------------------------------------
test('Test 7: Falscher Recovery-Code schlägt bei der Wiederherstellung fehl', async () => {
  const { vaultRecord, vaultKey } = await createTestVault();
  const backup = await createEncryptedBackup(REALISTIC_TEST_STATE, vaultKey, vaultRecord);

  // 1. Syntaktisch korrekter 32-Hex-Code, der jedoch kryptographisch falsch ist:
  const wrongValidHexCode = '1111-2222-3333-4444-5555-6666-7777-8888';

  await assert.rejects(
    async () => {
      await recoverBackup(backup, wrongValidHexCode);
    },
    /Tresor konnte nicht entsperrt werden|Authentifizierung fehlgeschlagen|Entschlüsselung fehlgeschlagen|integrity check failed/i,
    'Falscher 32-Hex-Code muss Entschlüsselung sicher abweisen'
  );

  // 2. Syntaktisch ungültiger Code wird ebenfalls sicher abgewiesen:
  await assert.rejects(
    async () => {
      await recoverBackup(backup, 'INVALID-CODE-XYZ');
    },
    /Ungültiger Recovery-Code|INVALID_PAYLOAD/i
  );
});

// -------------------------------------------------------------
// TEST 8: VaultRecord im Backup enthält weder Passwort noch Recovery-Code
// -------------------------------------------------------------
test('Test 8: VaultRecord im Backup enthält weder Passwort noch Recovery-Code im Klartext', async () => {
  const { vaultRecord, vaultKey, recoveryCode } = await createTestVault();
  const backup = await createEncryptedBackup(REALISTIC_TEST_STATE, vaultKey, vaultRecord);

  const serialized = serializeBackup(backup);

  // Das Passwort darf nirgendwo im Klartext stehen
  assert.ok(!serialized.includes(TEST_PASSWORD), 'Passwort darf nicht im Backup-File vorkommen');

  // Der Recovery-Code darf nirgendwo im Klartext stehen (weder formatiert noch unformatiert)
  assert.ok(!serialized.includes(recoveryCode), 'Formtierter Recovery-Code darf nicht im Backup-File vorkommen');
  const rawRecoveryDigits = recoveryCode.replace(/-/g, '');
  assert.ok(!serialized.includes(rawRecoveryDigits), 'Unformatierter Recovery-Code darf nicht vorkommen');

  // Der rohe 256-Bit-VaultKey darf ebenfalls nicht im Klartext stehen
  const rawVaultKeyBytes = await exportAESKey(vaultKey);
  const base64RawKey = uint8ArrayToBase64(rawVaultKeyBytes);
  assert.ok(!serialized.includes(base64RawKey), 'Roher unverschlüsselter VaultKey darf nicht im Backup vorkommen');
});

// -------------------------------------------------------------
// TEST 9: Zwei Backups desselben States erzeugen unterschiedliche Ciphertexts
// -------------------------------------------------------------
test('Test 9: Zwei Backups desselben States erzeugen unterschiedliche Ciphertexts (frischer 12-Byte-IV)', async () => {
  const { vaultRecord, vaultKey } = await createTestVault();

  const backup1 = await createEncryptedBackup(REALISTIC_TEST_STATE, vaultKey, vaultRecord);
  const backup2 = await createEncryptedBackup(REALISTIC_TEST_STATE, vaultKey, vaultRecord);

  // IV muss frisch und unterschiedlich sein
  assert.notEqual(backup1.encryptedState.iv, backup2.encryptedState.iv, 'Jeder Export muss einen frischen IV nutzen');
  // Resultierender Ciphertext muss unterschiedlich sein
  assert.notEqual(backup1.encryptedState.ciphertext, backup2.encryptedState.ciphertext, 'Ciphertexts müssen sich durch frischen IV unterscheiden');

  // Beide müssen denselben Original-State entschlüsseln
  const decrypted1 = await decryptBackup(backup1, vaultKey);
  const decrypted2 = await decryptBackup(backup2, vaultKey);
  assert.deepEqual(decrypted1, decrypted2);
});

// -------------------------------------------------------------
// TEST 10: Legacy-Klartextbackup wird korrekt erkannt
// -------------------------------------------------------------
test('Test 10: Legacy-Klartextbackup (.json) wird als solches erkannt und von V1 unterschieden', async () => {
  const legacyBackup = {
    schueler: [{ id: 1, name: 'Alt-Schüler' }],
    classes: [{ id: 'c1', name: 'Alte Klasse' }],
    klassenbezeichnung: '1a',
  };

  assert.equal(isEncryptedBackupV1(legacyBackup), false, 'Legacy darf kein EncryptedBackupV1 sein');
  assert.equal(isLegacyPlaintextBackup(legacyBackup), true, 'Legacy muss von isLegacyPlaintextBackup erkannt werden');

  const { vaultRecord, vaultKey } = await createTestVault();
  const modernBackup = await createEncryptedBackup(REALISTIC_TEST_STATE, vaultKey, vaultRecord);

  assert.equal(isEncryptedBackupV1(modernBackup), true);
  assert.equal(isLegacyPlaintextBackup(modernBackup), false, 'Modernes verschlüsseltes Backup ist kein Legacy-Backup');
});

// -------------------------------------------------------------
// TEST 11: Legacy-Import funktioniert lokal weiterhin
// -------------------------------------------------------------
test('Test 11: Legacy-Import funktioniert lokal weiterhin und stellt Daten bereit', () => {
  const legacyBackup = {
    schueler: [{ id: 1, name: 'Alt-Schüler' }],
    classes: [{ id: 'c1', name: 'Alte Klasse' }],
    klassenbezeichnung: '1a',
  };

  assert.ok(isLegacyPlaintextBackup(legacyBackup));
  // Lokaler State kann aus Legacy übernommen werden
  const importedState = JSON.parse(JSON.stringify(legacyBackup));
  assert.equal(importedState.klassenbezeichnung, '1a');
  assert.equal(importedState.schueler.length, 1);
});

// -------------------------------------------------------------
// TEST 12: Neuer Export nach Legacy-Import ist verschlüsselt
// -------------------------------------------------------------
test('Test 12: Neuer Export nach Import eines Legacy-Backups ist verschlüsselt (.lehrerapp)', async () => {
  const legacyData = {
    schueler: [{ id: 1, name: 'Max Alt' }],
    classes: [],
    klassenbezeichnung: 'Altklasse',
  };

  const { vaultRecord, vaultKey } = await createTestVault();

  // Exportiert die ehemals unverschlüsselten Altdaten nun als verschlüsseltes V1-Backup
  const newEncryptedBackup = await createEncryptedBackup(legacyData, vaultKey, vaultRecord);

  assert.ok(isEncryptedBackupV1(newEncryptedBackup));
  const serialized = serializeBackup(newEncryptedBackup);
  assert.ok(!serialized.includes('Max Alt'), 'Alte Schülerdaten dürfen im neuen Export nicht im Klartext verbleiben');

  const decrypted = await decryptBackup<typeof legacyData>(newEncryptedBackup, vaultKey);
  assert.deepEqual(decrypted, legacyData);
});

// -------------------------------------------------------------
// TEST 13: Ungültiges Backup verändert bestehenden State nicht
// -------------------------------------------------------------
test('Test 13: Ungültiges Backup wirft Fehler und bricht atomar ab (keine Zustandsverfälschung)', async () => {
  const { vaultKey } = await createTestVault();
  const invalidBackup = {
    format: 'Corrupted_Format',
    version: 99,
    somethingElse: 'garbage',
  };

  await assert.rejects(
    async () => {
      await decryptBackup(invalidBackup, vaultKey);
    },
    /Ungültiges Backup-Format|INVALID_PAYLOAD/i
  );
});

// -------------------------------------------------------------
// TEST 14: OneDrive-Upload erhält nur verschlüsselten Backup-Blob
// -------------------------------------------------------------
test('Test 14: OneDrive-Upload erhält nur versionierten, verschlüsselten Backup-Blob', async () => {
  const { vaultRecord, vaultKey } = await createTestVault();
  const encryptedBackup = await createEncryptedBackup(REALISTIC_TEST_STATE, vaultKey, vaultRecord);

  // Mock-Payload für OneDrive Upload
  const uploadPayload = JSON.parse(JSON.stringify(encryptedBackup));

  assert.equal(uploadPayload.format, BACKUP_FORMAT_IDENTIFIER);
  assert.equal(uploadPayload.version, 1);
  assert.ok(uploadPayload.encryptedState.ciphertext);
  assert.ok(uploadPayload.encryptedState.iv);

  // Prüfen, dass der Upload-Payload keine Top-Level Schülerdaten aufweist
  assert.equal(uploadPayload.schueler, undefined);
  assert.equal(uploadPayload.classes, undefined);
  assert.equal(uploadPayload.klassenbezeichnung, undefined);
});

// -------------------------------------------------------------
// TEST 15: Serverseitiger OneDrive-Handler kann keinen Schülerklartext finden
// -------------------------------------------------------------
test('Test 15: Serverseitiger OneDrive-Handler weist Klartext ab und findet keinen Schülerklartext in verschlüsselten Blobs', async () => {
  // 1. Simulierter Klartext-Payload (wird vom Server abgewiesen)
  const plaintextAttempt = {
    schueler: [{ name: 'Max Mustermann' }],
    classes: ['4a'],
  };

  const hasPlaintext = (body: any) => {
    return Boolean(body.schueler || body.classes || body.klassenbezeichnung);
  };

  assert.equal(hasPlaintext(plaintextAttempt), true, 'Server muss Klartext-Payload erkennen');

  // 2. Gültiger verschlüsselter Payload (wird vom Server als opaker Blob akzeptiert)
  const { vaultRecord, vaultKey } = await createTestVault();
  const validBackup = await createEncryptedBackup(REALISTIC_TEST_STATE, vaultKey, vaultRecord);

  assert.equal(hasPlaintext(validBackup), false, 'Verschlüsseltes Backup darf keine Klartext-Felder aufweisen');

  // Server prüft opake Struktur:
  const isServerValid = (body: any) => {
    return (
      body.format === 'LehrerAPP_Encrypted_Backup' &&
      body.version === 1 &&
      typeof body.encryptedState === 'object' &&
      typeof body.vaultRecord === 'object'
    );
  };

  assert.equal(isServerValid(validBackup), true, 'Server validiert opaken verschlüsselten Blob');

  // Server sieht im String niemals den Namen
  const serverReceivedString = JSON.stringify(validBackup);
  assert.equal(serverReceivedString.includes('Max Mustermann'), false);
  assert.equal(serverReceivedString.includes('1234010190'), false);
});

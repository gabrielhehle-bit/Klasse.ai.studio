import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  encryptData,
  decryptData,
  deriveKeyFromPassword,
  generateAESKey,
  generateIV,
  generateSalt,
  DEFAULT_PBKDF2_ITERATIONS,
  CANONICAL_AAD_V1
} from './crypto';
import {
  createVault,
  unlockVault,
  unlockVaultWithRecoveryCode,
  changeVaultPassword,
  rotateRecoveryCode
} from './vaultService';
import {
  pseudonymisiere,
  depseudonymisiere
} from './pseudonymisierung';
import {
  createEncryptedBackup,
  decryptBackup,
  recoverBackup
} from './backupCryptoService';
import {
  generateSyncSessionKey,
  encryptSyncState,
  decryptSyncState
} from './syncService';
import { AppState, Student } from '../types';

describe('B8: Umfassende Ende-zu-Ende Sicherheits- und Integritätsvalidierung', () => {
  const MARKERS = {
    vorname: 'MAX-MUSTERMANN-SENSITIVE-TEST',
    nachname: 'VORMERKUNG-GEHEIM-987',
    svnr: '1234010190',
    adresse: 'Musterstraße 12',
    email: 'eltern@example.at',
    telefon: '+43 664 1234567',
    religion: 'römisch-katholisch',
    notiz: 'MAX-MUSTERMANN-SENSITIVE-TEST benötigt besondere medizinische Förderung.'
  };

  const dummyStudent: Student = {
    id: 'student-e2e-marker-1',
    vorname: MARKERS.vorname,
    nachname: MARKERS.nachname,
    name: `${MARKERS.vorname} ${MARKERS.nachname}`,
    niveau: 1,
    geschlecht: 'm',
    sv_nummer: MARKERS.svnr,
    anschrift: MARKERS.adresse,
    email_eltern: MARKERS.email,
    telefon_mutter: MARKERS.telefon,
    religion: MARKERS.religion,
    notiz: MARKERS.notiz,
    geburtstag: '2015-01-01',
    staatsbuergerschaft: 'Österreich',
    besuchsjahr: '3',
    espf: false,
    spf: false,
    erstsprache: 'Deutsch',
    gruppen: []
  };

  const dummyAppState: AppState = {
    schule: 'Volksschule Musterstadt',
    klasse: '3A',
    schuljahr: '2026/27',
    lehrer: 'Prof. Musterlehrer',
    schueler: [dummyStudent],
    classes: [{ id: '3a', name: '3A', schueler: [dummyStudent] }],
    noten: {},
    anwesenheit: {}
  } as any;

  // TEIL 17 & 3: Klartext-Marker und Pseudonymisierungsprüfung
  it('TEIL 17 & 3: Kein Klartext-Marker verlässt die App im pseudonymisierten KI-Prompt', () => {
    const rawPrompt = `Schüler ${MARKERS.vorname} ${MARKERS.nachname}, SVNR: ${MARKERS.svnr}, Adresse: ${MARKERS.adresse}, Tel: ${MARKERS.telefon}, Notiz: ${MARKERS.notiz}`;
    const result = pseudonymisiere(rawPrompt, dummyAppState);

    assert.strictEqual(result.text.includes(MARKERS.vorname), false, 'Vorname darf nicht im Prompt sein');
    assert.strictEqual(result.text.includes(MARKERS.nachname), false, 'Nachname darf nicht im Prompt sein');
    assert.strictEqual(result.text.includes(MARKERS.svnr), false, 'SVNR darf nicht im Prompt sein');
    assert.strictEqual(result.text.includes(MARKERS.adresse), false, 'Adresse darf nicht im Prompt sein');
    assert.strictEqual(result.text.includes(MARKERS.telefon), false, 'Telefon darf nicht im Prompt sein');
    assert.strictEqual(result.text.includes(MARKERS.notiz), false, 'Sensible Notiz darf nicht im Prompt sein');

    // Depseudonymisierung stellt lokalen Namen im Browser wieder her
    const aiResponse = `Förderempfehlung für Kind A: Bitte regelmäßige Pausen einbauen.`;
    const depseudo = depseudonymisiere(aiResponse, result.map);
    assert.ok(depseudo.includes(MARKERS.vorname), 'Lokale Depseudonymisierung muss den Schülernamen für die Lehrkraft wiederherstellen');
  });

  // TEIL 17 & 12: Verschlüsselte Persistenz enthält keine Klartext-Marker
  it('TEIL 17 & 12: Verschlüsselte Persistenz enthält absolut keine Klartext-Marker', async () => {
    const vaultKey = await generateAESKey(false);
    const encrypted = await encryptData(JSON.stringify(dummyAppState), vaultKey);
    const serialized = JSON.stringify(encrypted);

    for (const [field, marker] of Object.entries(MARKERS)) {
      assert.strictEqual(serialized.includes(marker), false, `Marker ${field} darf nicht im Ciphertext zu finden sein`);
    }

    const decrypted = await decryptData<string>(encrypted, vaultKey);
    const recovered = JSON.parse(decrypted);
    assert.strictEqual(recovered.schueler[0].vorname, MARKERS.vorname);
  });

  // TEIL 18: Negativtests mit falschem Schlüssel
  it('TEIL 18: Negativtest mit falschem Schlüssel schlägt kontrolliert fehl (Storage, Sync, Backup)', async () => {
    const key1 = await generateAESKey(true);
    const key2 = await generateAESKey(true);

    // 1. Storage
    const encryptedStorage = await encryptData('sensible schülerdaten', key1);
    await assert.rejects(async () => {
      await decryptData(encryptedStorage, key2);
    });

    // 2. Sync
    const creds1 = await generateSyncSessionKey();
    const creds2 = await generateSyncSessionKey();
    const encryptedSync = await encryptSyncState(dummyAppState, creds1.sessionKey);
    await assert.rejects(async () => {
      await decryptSyncState(encryptedSync, creds2.sessionKey);
    });

    // 3. Backup
    const { vaultRecord, vaultKey } = await createVault('TestPassword123!');
    const otherKey = await generateAESKey(true);
    const backupResult = await createEncryptedBackup(dummyAppState, vaultKey, vaultRecord);
    await assert.rejects(async () => {
      await decryptBackup(backupResult, otherKey);
    });
  });

  // TEIL 19: Manipulationstests
  it('TEIL 19: Manipulation von Ciphertext, IV oder Version wird von AES-GCM abgewiesen', async () => {
    const key = await generateAESKey(false);
    const validPayload = await encryptData('Originaler Zustand', key);

    // Manipulierter Ciphertext
    const tamperedCipher = { ...validPayload, ciphertext: validPayload.ciphertext.slice(0, -4) + 'AAAA' };
    await assert.rejects(async () => {
      await decryptData(tamperedCipher, key);
    });

    // Manipulierter IV
    const tamperedIV = { ...validPayload, iv: 'AQIDBAUGBwgJCgsMDQ4PEA==' };
    await assert.rejects(async () => {
      await decryptData(tamperedIV, key);
    });

    // Ungültige Version
    const tamperedVersion = { ...validPayload, version: 99 as any };
    await assert.rejects(async () => {
      await decryptData(tamperedVersion, key);
    });
  });

  // TEIL 20 & 21: Recovery mit neuem Gerät und .lehrerapp Backup
  it('TEIL 20 & 21: Recovery auf neuem Gerät via Recovery-Code und Vault-Key', async () => {
    const password = 'MeinSicheresPasswort123!';
    const { vaultRecord, recoveryCode, vaultKey: originalVaultKey } = await createVault(password);

    // Backup auf altem Gerät erstellen
    const backup = await createEncryptedBackup(dummyAppState, originalVaultKey, vaultRecord);

    // Simulation: Neues Gerät (nur vaultRecord, Backup und Recovery-Code vorhanden)
    const { appState: recoveredAppState } = await recoverBackup<AppState>(backup, recoveryCode);

    assert.strictEqual(recoveredAppState.schueler[0].vorname, MARKERS.vorname);
    assert.strictEqual(recoveredAppState.schueler[0].sv_nummer, MARKERS.svnr);
  });

  // TEIL 22: Passwortwechsel bewahrt bestehende verschlüsselte Daten
  it('TEIL 22: Passwortwechsel verändert VaultKey nicht; bestehende verschlüsselte Daten bleiben gültig', async () => {
    const oldPassword = 'AltesPasswort123!';
    const newPassword = 'NeuesSicheresPasswort456!';
    const { vaultRecord, recoveryCode, vaultKey } = await createVault(oldPassword);

    // Zustand vorab verschlüsseln
    const encryptedState = await encryptData(JSON.stringify(dummyAppState), vaultKey);

    // Passwort ändern
    const updatedVaultRecord = await changeVaultPassword(vaultRecord, oldPassword, newPassword);

    // Mit neuem Passwort entsperren
    const unlockedKey = await unlockVault(updatedVaultRecord, newPassword);

    // Altes verschlüsseltes Datum mit neu entsperrtem Key lesen
    const decryptedJson = await decryptData<string>(encryptedState, unlockedKey);
    const restored = JSON.parse(decryptedJson);
    assert.strictEqual(restored.schueler[0].vorname, MARKERS.vorname);

    // Recovery funktioniert mit dem bestehenden Recovery-Code nach wie vor
    const recoveryKey = await unlockVaultWithRecoveryCode(updatedVaultRecord, recoveryCode);
    const decryptedViaRecovery = await decryptData<string>(encryptedState, recoveryKey);
    assert.strictEqual(JSON.parse(decryptedViaRecovery).schueler[0].vorname, MARKERS.vorname);
  });

  // TEIL 23: Recovery-Rotation
  it('TEIL 23: Recovery-Rotation erzeugt neuen gültigen Code und invalidiert den alten Code', async () => {
    const password = 'PasswortFürRotation123!';
    const { vaultRecord, recoveryCode: oldCode } = await createVault(password);

    const { updatedRecord, newRecoveryCode } = await rotateRecoveryCode(vaultRecord, password);
    assert.notStrictEqual(oldCode, newRecoveryCode);

    // Neuer Code entsperrt erfolgreich
    const newKey = await unlockVaultWithRecoveryCode(updatedRecord, newRecoveryCode);
    assert.ok(newKey);

    // Alter Code wird abgewiesen
    await assert.rejects(async () => {
      await unlockVaultWithRecoveryCode(updatedRecord, oldCode);
    });
  });

  // TEIL 26: Performance mit 30 Schülern
  it('TEIL 26: Performance-Validierung mit realistischem 30-Schüler-Klassensatz (< 500ms)', async () => {
    const students: Student[] = Array.from({ length: 30 }, (_, i) => ({
      id: `std-${i + 1}`,
      vorname: `Vorname_${i + 1}`,
      nachname: `Nachname_${i + 1}`,
      name: `Vorname_${i + 1} Nachname_${i + 1}`,
      niveau: 1,
      geschlecht: i % 2 === 0 ? 'm' : 'w',
      sv_nummer: `${1000 + i} 010190`,
      notiz: `Pädagogische Notiz für Schüler ${i + 1} mit Details zu Stärken und Förderbedarf.`,
      religion: 'o.B.',
      geburtstag: '2015-01-01',
      staatsbuergerschaft: 'Österreich',
      besuchsjahr: '3',
      espf: false,
      spf: false,
      erstsprache: 'Deutsch',
      gruppen: []
    }));

    const bigAppState: AppState = {
      ...dummyAppState,
      schueler: students,
      classes: [{ id: '3a', name: '3A', schueler: students }]
    } as any;

    const vaultKey = await generateAESKey(true);

    const startEnc = performance.now();
    const encrypted = await encryptData(JSON.stringify(bigAppState), vaultKey);
    const encDuration = performance.now() - startEnc;

    const startDec = performance.now();
    const decrypted = await decryptData<string>(encrypted, vaultKey);
    const decDuration = performance.now() - startDec;

    assert.ok(encDuration < 500, `Verschlüsselung dauerte ${encDuration}ms (Limit: 500ms)`);
    assert.ok(decDuration < 500, `Entschlüsselung dauerte ${decDuration}ms (Limit: 500ms)`);
    assert.strictEqual(JSON.parse(decrypted).schueler.length, 30);
  });

  // TEIL 27 & 28: AAD / AES-GCM / PBKDF2 Konsistenz
  it('TEIL 27 & 28: IV-Länge ist exakt 12 Byte, PBKDF2 verwendet 600.000 Iterationen und min. 16 Byte Salt', async () => {
    assert.strictEqual(DEFAULT_PBKDF2_ITERATIONS, 600_000);
    assert.strictEqual(CANONICAL_AAD_V1, 'LehrerAPP|EncryptedPayload|v1');

    const iv = generateIV();
    assert.strictEqual(iv.byteLength, 12);

    const salt = generateSalt(16);
    assert.strictEqual(salt.byteLength, 16);

    const key = await generateAESKey(false);
    const enc1 = await encryptData('test', key);
    const enc2 = await encryptData('test', key);

    // Frische IVs pro Aufruf
    assert.notStrictEqual(enc1.iv, enc2.iv);
    assert.notStrictEqual(enc1.ciphertext, enc2.ciphertext);
  });
});

import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createVault,
  unlockVault,
  recoverVault,
  changeVaultPassword,
  resetVaultPasswordWithRecovery,
  rotateRecoveryCode,
  generateVaultKeyBytes,
  generateRecoveryCode,
  normalizeRecoveryCode,
  formatRecoveryCode,
  isVaultRecord,
  MIN_PASSWORD_LENGTH,
} from './vaultService.js';
import {
  saveVaultRecord,
  loadVaultRecord,
  deleteVaultRecord,
  hasVault,
  __resetVaultStorageForTesting,
} from './vaultStorage.js';
import {
  encryptData,
  decryptData,
  exportAESKey,
  CryptoError,
} from './crypto.js';

describe('B3: Vault & Schlüsselverwaltung der LehrerAPP', () => {
  const TEST_PW_A = 'SicheresLehrerPasswort2026!';
  const TEST_PW_B = 'NeuesLehrerPasswort2026!Plus';

  beforeEach(() => {
    __resetVaultStorageForTesting();
  });

  // Test 1: Vault erstellen → Passwort entsperrt VaultKey korrekt
  it('Test 1: Vault erstellen → Passwort entsperrt VaultKey korrekt', async () => {
    const { vaultRecord, vaultKey, recoveryCode } = await createVault(TEST_PW_A);

    assert.ok(isVaultRecord(vaultRecord));
    assert.strictEqual(vaultRecord.version, 1);
    assert.ok(typeof recoveryCode === 'string' && recoveryCode.length > 0);

    const unlockedKey = await unlockVault(vaultRecord, TEST_PW_A);
    assert.strictEqual(unlockedKey.algorithm.name, 'AES-GCM');

    // Funktionaler Beweis: Daten mit vaultKey verschlüsseln und mit unlockedKey entschlüsseln
    const testSecret = { schueler: 'Max Mustermann', note: 1 };
    const payload = await encryptData(testSecret, vaultKey);
    const decrypted = await decryptData<typeof testSecret>(payload, unlockedKey);
    assert.deepStrictEqual(decrypted, testSecret);
  });

  // Test 2: Falsches Passwort schlägt fehl
  it('Test 2: Falsches Passwort schlägt fehl', async () => {
    const { vaultRecord } = await createVault(TEST_PW_A);

    await assert.rejects(
      async () => {
        await unlockVault(vaultRecord, 'KomplettFalschesPasswort123');
      },
      (err: any) => {
        assert.ok(err instanceof CryptoError);
        assert.strictEqual(err.code, 'DECRYPTION_FAILED');
        return true;
      }
    );
  });

  // Test 3: Recovery-Code entsperrt denselben VaultKey
  it('Test 3: Recovery-Code entsperrt denselben VaultKey', async () => {
    const { vaultRecord, vaultKey, recoveryCode } = await createVault(TEST_PW_A);

    const recoveredKey = await recoverVault(vaultRecord, recoveryCode);

    // Funktionaler Beweis: Daten mit vaultKey verschlüsseln, mit recoveredKey entschlüsseln
    const testData = { dossier: 'Diagnostischer Test IKM', punkte: 95 };
    const payload = await encryptData(testData, vaultKey);
    const decrypted = await decryptData<typeof testData>(payload, recoveredKey);
    assert.deepStrictEqual(decrypted, testData);
  });

  // Test 4: Falscher Recovery-Code schlägt fehl
  it('Test 4: Falscher Recovery-Code schlägt fehl', async () => {
    const { vaultRecord } = await createVault(TEST_PW_A);
    const fakeCode = '0000-0000-0000-0000-0000-0000-0000-0000';

    await assert.rejects(
      async () => {
        await recoverVault(vaultRecord, fakeCode);
      },
      (err: any) => {
        assert.ok(err instanceof CryptoError);
        assert.strictEqual(err.code, 'DECRYPTION_FAILED');
        return true;
      }
    );
  });

  // Test 5: Passwortänderung funktioniert
  it('Test 5: Passwortänderung funktioniert', async () => {
    const { vaultRecord, vaultKey } = await createVault(TEST_PW_A);
    const updatedRecord = await changeVaultPassword(vaultRecord, TEST_PW_A, TEST_PW_B);

    assert.notStrictEqual(updatedRecord.passwordSalt, vaultRecord.passwordSalt);
    assert.notStrictEqual(updatedRecord.encryptedVaultKey.iv, vaultRecord.encryptedVaultKey.iv);

    const unlockedKey = await unlockVault(updatedRecord, TEST_PW_B);
    const secret = { info: 'Geheime Notenkonferenz' };
    const payload = await encryptData(secret, vaultKey);
    const decrypted = await decryptData<typeof secret>(payload, unlockedKey);
    assert.deepStrictEqual(decrypted, secret);
  });

  // Test 6: Altes Passwort funktioniert nach Passwortänderung nicht mehr
  it('Test 6: Altes Passwort funktioniert nach Passwortänderung nicht mehr', async () => {
    const { vaultRecord } = await createVault(TEST_PW_A);
    const updatedRecord = await changeVaultPassword(vaultRecord, TEST_PW_A, TEST_PW_B);

    await assert.rejects(
      async () => {
        await unlockVault(updatedRecord, TEST_PW_A);
      },
      (err: any) => {
        assert.ok(err instanceof CryptoError);
        assert.strictEqual(err.code, 'DECRYPTION_FAILED');
        return true;
      }
    );
  });

  // Test 7: Recovery funktioniert nach Passwortänderung weiterhin
  it('Test 7: Recovery funktioniert nach Passwortänderung weiterhin', async () => {
    const { vaultRecord, vaultKey, recoveryCode } = await createVault(TEST_PW_A);
    const updatedRecord = await changeVaultPassword(vaultRecord, TEST_PW_A, TEST_PW_B);

    const recoveredKey = await recoverVault(updatedRecord, recoveryCode);
    const secret = { dokument: 'Schularbeit Mathematik 3a' };
    const payload = await encryptData(secret, vaultKey);
    const decrypted = await decryptData<typeof secret>(payload, recoveredKey);
    assert.deepStrictEqual(decrypted, secret);
  });

  // Test 8: Passwort-Reset über Recovery funktioniert
  it('Test 8: Passwort-Reset über Recovery funktioniert', async () => {
    const { vaultRecord, vaultKey, recoveryCode } = await createVault(TEST_PW_A);

    const resetRecord = await resetVaultPasswordWithRecovery(
      vaultRecord,
      recoveryCode,
      TEST_PW_B
    );

    // Altes Passwort funktioniert nicht mehr
    await assert.rejects(async () => {
      await unlockVault(resetRecord, TEST_PW_A);
    });

    // Neues Passwort entsperrt denselben VaultKey
    const unlockedKey = await unlockVault(resetRecord, TEST_PW_B);
    const testMsg = { text: 'Wiederhergestellte Leistungsdaten' };
    const payload = await encryptData(testMsg, vaultKey);
    const decrypted = await decryptData<typeof testMsg>(payload, unlockedKey);
    assert.deepStrictEqual(decrypted, testMsg);
  });

  // Test 9: VaultKey bleibt bei Passwortänderung identisch
  it('Test 9: VaultKey bleibt bei Passwortänderung identisch', async () => {
    // Erstelle Vault mit extractable VaultKey zum Bit-genauen Vergleich
    const { vaultRecord, vaultKey } = await createVault(TEST_PW_A, true);
    const originalRawKey = await exportAESKey(vaultKey);

    const updatedRecord = await changeVaultPassword(vaultRecord, TEST_PW_A, TEST_PW_B);
    const newUnlockedKey = await unlockVault(updatedRecord, TEST_PW_B, true);
    const afterChangeRawKey = await exportAESKey(newUnlockedKey);

    assert.deepStrictEqual(afterChangeRawKey, originalRawKey);
  });

  // Test 10: Recovery-Rotation erzeugt neuen Recovery-Code
  it('Test 10: Recovery-Rotation erzeugt neuen Recovery-Code', async () => {
    const { vaultRecord, recoveryCode: oldCode } = await createVault(TEST_PW_A);

    const { updatedRecord, newRecoveryCode } = await rotateRecoveryCode(
      vaultRecord,
      TEST_PW_A
    );

    assert.notStrictEqual(newRecoveryCode, oldCode);
    assert.ok(isVaultRecord(updatedRecord));
  });

  // Test 11: Alter Recovery-Code funktioniert nach Rotation nicht mehr
  it('Test 11: Alter Recovery-Code funktioniert nach Rotation nicht mehr', async () => {
    const { vaultRecord, recoveryCode: oldCode } = await createVault(TEST_PW_A);

    const { updatedRecord } = await rotateRecoveryCode(vaultRecord, TEST_PW_A);

    await assert.rejects(
      async () => {
        await recoverVault(updatedRecord, oldCode);
      },
      (err: any) => {
        assert.ok(err instanceof CryptoError);
        assert.strictEqual(err.code, 'DECRYPTION_FAILED');
        return true;
      }
    );
  });

  // Test 12: Neuer Recovery-Code funktioniert
  it('Test 12: Neuer Recovery-Code funktioniert', async () => {
    const { vaultRecord, vaultKey } = await createVault(TEST_PW_A);

    const { updatedRecord, newRecoveryCode } = await rotateRecoveryCode(
      vaultRecord,
      TEST_PW_A
    );

    const recoveredKey = await recoverVault(updatedRecord, newRecoveryCode);
    const data = { secret: 'Rotierter Schlüssel schützt weiterhin' };
    const payload = await encryptData(data, vaultKey);
    const decrypted = await decryptData<typeof data>(payload, recoveredKey);
    assert.deepStrictEqual(decrypted, data);
  });

  // Test 13: Zwei Vaults mit gleichem Passwort erzeugen unterschiedliche VaultKeys und Salts
  it('Test 13: Zwei Vaults mit gleichem Passwort erzeugen unterschiedliche VaultKeys und Salts', async () => {
    const vault1 = await createVault(TEST_PW_A, true);
    const vault2 = await createVault(TEST_PW_A, true);

    assert.notStrictEqual(vault1.vaultRecord.passwordSalt, vault2.vaultRecord.passwordSalt);
    assert.notStrictEqual(vault1.vaultRecord.recoverySalt, vault2.vaultRecord.recoverySalt);
    assert.notStrictEqual(vault1.recoveryCode, vault2.recoveryCode);

    const rawKey1 = await exportAESKey(vault1.vaultKey);
    const rawKey2 = await exportAESKey(vault2.vaultKey);
    assert.notDeepStrictEqual(rawKey1, rawKey2);
  });

  // Test 14: VaultRecord enthält kein Klartextpasswort
  it('Test 14: VaultRecord enthält kein Klartextpasswort', async () => {
    const { vaultRecord } = await createVault(TEST_PW_A);
    const recordString = JSON.stringify(vaultRecord);

    assert.ok(!recordString.includes(TEST_PW_A));
    assert.ok(!recordString.toLowerCase().includes('passwort2026'));
  });

  // Test 15: VaultRecord enthält keinen Klartext-Recovery-Code
  it('Test 15: VaultRecord enthält keinen Klartext-Recovery-Code', async () => {
    const { vaultRecord, recoveryCode } = await createVault(TEST_PW_A);
    const recordString = JSON.stringify(vaultRecord);
    const normalized = normalizeRecoveryCode(recoveryCode);

    assert.ok(!recordString.includes(recoveryCode));
    assert.ok(!recordString.includes(normalized));
  });

  // Test 16: VaultStorage speichert und lädt VaultRecord korrekt
  it('Test 16: VaultStorage speichert und lädt VaultRecord korrekt', async () => {
    assert.strictEqual(await hasVault(), false);
    assert.strictEqual(await loadVaultRecord(), null);

    const { vaultRecord } = await createVault(TEST_PW_A);
    await saveVaultRecord(vaultRecord);

    assert.strictEqual(await hasVault(), true);
    const loaded = await loadVaultRecord();
    assert.ok(loaded !== null);
    assert.deepStrictEqual(loaded, vaultRecord);

    await deleteVaultRecord();
    assert.strictEqual(await hasVault(), false);
    assert.strictEqual(await loadVaultRecord(), null);
  });

  // Test 17: VaultStorage speichert niemals entsperrten VaultKey
  it('Test 17: VaultStorage speichert niemals entsperrten VaultKey', async () => {
    const { vaultRecord, vaultKey } = await createVault(TEST_PW_A, true);
    const rawKey = await exportAESKey(vaultKey);
    const rawKeyBase64 = Buffer.from(rawKey).toString('base64');
    const rawKeyHex = Buffer.from(rawKey).toString('hex');

    await saveVaultRecord(vaultRecord);
    const loaded = await loadVaultRecord();
    const loadedString = JSON.stringify(loaded);

    // Der unverschlüsselte 32-Byte-Key darf nirgends im gespeicherten JSON auftauchen
    assert.ok(!loadedString.includes(rawKeyBase64));
    assert.ok(!loadedString.includes(rawKeyHex));
  });

  // Test 18: In-Memory Session Lifecycle & Listener
  it('Test 18: In-Memory Session Lifecycle & Listener benachrichtigt sauber', async () => {
    const { getActiveVaultKey, setActiveVaultSession, clearActiveVaultSession, subscribeVaultSession } = await import('./vaultStorage.js');
    
    let notifyStatus: boolean | null = null;
    const unsubscribe = subscribeVaultSession((unlocked) => {
      notifyStatus = unlocked;
    });

    const { vaultKey, vaultRecord } = await createVault(TEST_PW_A);
    assert.strictEqual(getActiveVaultKey(), null);

    // Entsperren & Setzen
    setActiveVaultSession(vaultKey, vaultRecord);
    assert.strictEqual(getActiveVaultKey(), vaultKey);
    assert.strictEqual(notifyStatus, true);

    // Sperren
    clearActiveVaultSession();
    assert.strictEqual(getActiveVaultKey(), null);
    assert.strictEqual(notifyStatus, false);

    unsubscribe();
  });

  // Ergänzende Hilfstests: Formatierung & Normalisierung von Recovery-Codes
  it('Zusatztest: Recovery-Code-Formatierung und -Normalisierung', () => {
    const bytes = new Uint8Array(16);
    bytes.fill(0xab);
    const formatted = formatRecoveryCode(bytes);
    assert.strictEqual(formatted, 'ABAB-ABAB-ABAB-ABAB-ABAB-ABAB-ABAB-ABAB');

    const normalized = normalizeRecoveryCode('  abab-abab abab-abab-abab-abab-abab-abab ');
    assert.strictEqual(normalized, 'ABABABABABABABABABABABABABABABAB');

    assert.throws(() => normalizeRecoveryCode('ZuKurz'), (err: any) => {
      assert.ok(err instanceof CryptoError);
      return true;
    });
  });

  it('Zusatztest: Mindestpasswortlänge wird strikt durchgesetzt', async () => {
    await assert.rejects(
      async () => {
        await createVault('123456789'); // 9 Zeichen < 10
      },
      (err: any) => {
        assert.ok(err instanceof CryptoError);
        assert.strictEqual(err.code, 'INVALID_PAYLOAD');
        return true;
      }
    );
  });
});

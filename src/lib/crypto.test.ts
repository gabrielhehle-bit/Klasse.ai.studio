import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateAESKey,
  importAESKey,
  exportAESKey,
  generateIV,
  generateSalt,
  encryptData,
  decryptData,
  deriveKeyFromPassword,
  isEncryptedPayload,
  uint8ArrayToBase64,
  base64ToUint8Array,
  CryptoError,
  DEFAULT_PBKDF2_ITERATIONS,
  CANONICAL_AAD_V1,
} from './crypto.js';

describe('B2: Web-Crypto-Basis (AES-GCM-256 & PBKDF2)', () => {
  // Test 1: Objekt verschlüsseln und wieder korrekt entschlüsseln
  it('Test 1: Objekt verschlüsseln und wieder korrekt entschlüsseln', async () => {
    const key = await generateAESKey();
    const original = { id: 'test-1', title: 'Planung Deutsch', done: true, count: 42 };

    const payload = await encryptData(original, key);
    assert.strictEqual(payload.version, 1);
    assert.strictEqual(payload.algorithm, 'AES-GCM-256');
    assert.ok(typeof payload.iv === 'string' && payload.iv.length > 0);
    assert.ok(typeof payload.ciphertext === 'string' && payload.ciphertext.length > 0);

    const decrypted = await decryptData<typeof original>(payload, key);
    assert.deepStrictEqual(decrypted, original);
  });

  // Test 2: String mit Umlauten und Sonderzeichen funktioniert
  it('Test 2: String mit Umlauten und Sonderzeichen funktioniert (Ä Ö Ü ß €)', async () => {
    const key = await generateAESKey();
    const specialText = 'Schülerprüfungen in Österreich: Überprüfung für Schülerinnen & Schüler: ÄÖÜäöüß — 100,50 € / 100 %!';

    const payload = await encryptData(specialText, key);
    const decrypted = await decryptData<string>(payload, key);
    assert.strictEqual(decrypted, specialText);
  });

  // Test 3: Komplexes verschachteltes Objekt funktioniert
  it('Test 3: Komplexes verschachteltes Objekt funktioniert', async () => {
    const key = await generateAESKey();
    const nestedData = {
      klasse: '3A',
      jahr: 2026,
      schueler: [
        { id: 'S1', vorname: 'Anna', noten: [1, 2, 1], aktiv: true, meta: { foerderung: null } },
        { id: 'S2', vorname: 'Lukas', noten: [3, 2], aktiv: false, meta: { tags: ['Lesen', 'Rechnen'] } },
      ],
      konfiguration: {
        theme: 'modern_dark',
        notenGewichtung: { schularbeiten: 0.5, mitarbeit: 0.5 },
      },
    };

    const payload = await encryptData(nestedData, key);
    const decrypted = await decryptData<typeof nestedData>(payload, key);
    assert.deepStrictEqual(decrypted, nestedData);
  });

  // Test 4: Zwei Verschlüsselungen derselben Daten mit demselben Schlüssel erzeugen unterschiedliche IVs und unterschiedliche Ciphertexts
  it('Test 4: Zwei Verschlüsselungen erzeugen immer frische IVs und unterschiedliche Ciphertexts', async () => {
    const key = await generateAESKey();
    const data = { geheimnis: 'Sensible Leistungsdaten' };

    const payload1 = await encryptData(data, key);
    const payload2 = await encryptData(data, key);

    // IVs müssen unterschiedlich sein
    assert.notStrictEqual(payload1.iv, payload2.iv);
    // Ciphertexts müssen aufgrund unterschiedlicher IVs unterschiedlich sein
    assert.notStrictEqual(payload1.ciphertext, payload2.ciphertext);

    // Beide müssen sich korrekt entschlüsseln lassen
    const dec1 = await decryptData<typeof data>(payload1, key);
    const dec2 = await decryptData<typeof data>(payload2, key);
    assert.deepStrictEqual(dec1, data);
    assert.deepStrictEqual(dec2, data);
  });

  // Test 5: Falscher Schlüssel kann Payload nicht entschlüsseln
  it('Test 5: Falscher Schlüssel kann Payload nicht entschlüsseln', async () => {
    const keyA = await generateAESKey();
    const keyB = await generateAESKey();

    const payload = await encryptData({ text: 'Vertraulich' }, keyA);

    await assert.rejects(
      async () => {
        await decryptData(payload, keyB);
      },
      (err: any) => {
        assert.ok(err instanceof CryptoError);
        assert.strictEqual(err.code, 'DECRYPTION_FAILED');
        return true;
      }
    );
  });

  // Test 6: Manipulierter Ciphertext schlägt fehl
  it('Test 6: Manipulierter Ciphertext schlägt fehl', async () => {
    const key = await generateAESKey();
    const payload = await encryptData({ status: 'ok' }, key);

    // Ciphertext manipulieren (1 Byte im Base64-String verändern)
    const rawCipher = base64ToUint8Array(payload.ciphertext);
    rawCipher[0] = rawCipher[0] ^ 0xff; // Erstes Byte invertieren
    const tamperedPayload = {
      ...payload,
      ciphertext: uint8ArrayToBase64(rawCipher),
    };

    await assert.rejects(
      async () => {
        await decryptData(tamperedPayload, key);
      },
      (err: any) => {
        assert.ok(err instanceof CryptoError);
        assert.strictEqual(err.code, 'DECRYPTION_FAILED');
        return true;
      }
    );
  });

  // Test 7: Manipulierter IV schlägt fehl
  it('Test 7: Manipulierter IV schlägt fehl', async () => {
    const key = await generateAESKey();
    const payload = await encryptData({ status: 'ok' }, key);

    // IV manipulieren (1 Byte im IV-Array verändern)
    const rawIv = base64ToUint8Array(payload.iv);
    rawIv[0] = rawIv[0] ^ 0x01;
    const tamperedPayload = {
      ...payload,
      iv: uint8ArrayToBase64(rawIv),
    };

    await assert.rejects(
      async () => {
        await decryptData(tamperedPayload, key);
      },
      (err: any) => {
        assert.ok(err instanceof CryptoError);
        assert.strictEqual(err.code, 'DECRYPTION_FAILED');
        return true;
      }
    );
  });

  // Test 8: Falsche Payload-Version wird abgelehnt
  it('Test 8: Falsche Payload-Version wird abgelehnt', async () => {
    const key = await generateAESKey();
    const payload = await encryptData({ test: true }, key);

    const wrongVersionPayload = {
      ...payload,
      version: 2 as any,
    };

    await assert.rejects(
      async () => {
        await decryptData(wrongVersionPayload, key);
      },
      (err: any) => {
        assert.ok(err instanceof CryptoError);
        assert.strictEqual(err.code, 'UNSUPPORTED_VERSION');
        return true;
      }
    );
  });

  // Test 9: isEncryptedPayload erkennt gültige und ungültige Strukturen
  it('Test 9: isEncryptedPayload erkennt gültige und ungültige Strukturen', async () => {
    const key = await generateAESKey();
    const validPayload = await encryptData('Gültige Daten', key);

    // Gültig
    assert.strictEqual(isEncryptedPayload(validPayload), true);

    // Ungültig: null / undefined / primitives
    assert.strictEqual(isEncryptedPayload(null), false);
    assert.strictEqual(isEncryptedPayload(undefined), false);
    assert.strictEqual(isEncryptedPayload('string'), false);
    assert.strictEqual(isEncryptedPayload(123), false);

    // Ungültig: Fehlende oder falsche Felder
    assert.strictEqual(isEncryptedPayload({}), false);
    assert.strictEqual(isEncryptedPayload({ ...validPayload, version: 2 }), false);
    assert.strictEqual(isEncryptedPayload({ ...validPayload, algorithm: 'AES-CBC' }), false);
    assert.strictEqual(isEncryptedPayload({ ...validPayload, iv: '' }), false);
    assert.strictEqual(isEncryptedPayload({ ...validPayload, ciphertext: '' }), false);
    assert.strictEqual(isEncryptedPayload({ version: 1, algorithm: 'AES-GCM-256' }), false);
  });

  // Test 10: PBKDF2 mit gleichem Passwort + gleichem Salt + gleichen Iterationen liefert funktional denselben Schlüssel
  it('Test 10: PBKDF2 mit identischen Parametern liefert funktional denselben Schlüssel', async () => {
    const password = 'SehrSicheresSchulPasswort!2026';
    const salt = generateSalt(16);
    // Für schnelle Testdurchläufe verwenden wir 100.000 Iterationen
    const iterations = 100_000;

    const key1 = await deriveKeyFromPassword(password, salt, iterations);
    const key2 = await deriveKeyFromPassword(password, salt, iterations);

    const testData = { vertraulich: 'Zeugnisdaten 4b' };

    // Mit Key 1 verschlüsseln, mit Key 2 entschlüsseln
    const payload = await encryptData(testData, key1);
    const decrypted = await decryptData<typeof testData>(payload, key2);

    assert.deepStrictEqual(decrypted, testData);
  });

  // Test 11: Anderer Salt führt zu anderem Schlüssel
  it('Test 11: Anderer Salt führt zu anderem Schlüssel', async () => {
    const password = 'PasswortGleich123!';
    const salt1 = generateSalt(16);
    const salt2 = generateSalt(16);
    const iterations = 100_000;

    const key1 = await deriveKeyFromPassword(password, salt1, iterations);
    const key2 = await deriveKeyFromPassword(password, salt2, iterations);

    const payload = await encryptData({ info: 'Streng geheim' }, key1);

    await assert.rejects(
      async () => {
        await decryptData(payload, key2);
      },
      (err: any) => {
        assert.ok(err instanceof CryptoError);
        assert.strictEqual(err.code, 'DECRYPTION_FAILED');
        return true;
      }
    );
  });

  // Test 12: 32-Byte-Key kann importiert werden; falsche Länge wird abgelehnt
  it('Test 12: 32-Byte-Key kann importiert werden; falsche Länge wird abgelehnt', async () => {
    // 32 Byte (256 Bit) gültiger Rohschlüssel
    const validRawKey = new Uint8Array(32);
    for (let i = 0; i < 32; i++) validRawKey[i] = i + 1;

    const importedKey = await importAESKey(validRawKey);
    assert.strictEqual(importedKey.algorithm.name, 'AES-GCM');
    assert.strictEqual((importedKey.algorithm as any).length, 256);

    // Funktionaler Test mit importiertem Key
    const payload = await encryptData('Importierter Schlüssel funktioniert', importedKey);
    const decrypted = await decryptData<string>(payload, importedKey);
    assert.strictEqual(decrypted, 'Importierter Schlüssel funktioniert');

    // Falsche Längen ablehnen (16 Byte = 128 Bit, 24 Byte = 192 Bit, 33 Byte)
    const shortKey16 = new Uint8Array(16);
    await assert.rejects(
      async () => {
        await importAESKey(shortKey16);
      },
      (err: any) => {
        assert.ok(err instanceof CryptoError);
        assert.strictEqual(err.code, 'INVALID_KEY_LENGTH');
        return true;
      }
    );

    const longKey33 = new Uint8Array(33);
    await assert.rejects(
      async () => {
        await importAESKey(longKey33);
      },
      (err: any) => {
        assert.ok(err instanceof CryptoError);
        assert.strictEqual(err.code, 'INVALID_KEY_LENGTH');
        return true;
      }
    );
  });

  // Zusätzliche Tests: Export-Restriktionen & Base64-Helfer & Salt-Länge
  it('Zusatztest: Key-Export nur bei extractable=true erlaubt', async () => {
    const nonExtractableKey = await generateAESKey(false);
    assert.strictEqual(nonExtractableKey.extractable, false);
    await assert.rejects(
      async () => {
        await exportAESKey(nonExtractableKey);
      },
      (err: any) => {
        assert.ok(err instanceof CryptoError);
        assert.strictEqual(err.code, 'KEY_NOT_EXTRACTABLE');
        return true;
      }
    );

    const extractableKey = await generateAESKey(true);
    assert.strictEqual(extractableKey.extractable, true);
    const exportedRaw = await exportAESKey(extractableKey);
    assert.strictEqual(exportedRaw.byteLength, 32);

    // Re-Import des exportierten Schlüssels
    const reimportedKey = await importAESKey(exportedRaw);
    const payload = await encryptData('Export/Import Cycle', extractableKey);
    const decrypted = await decryptData<string>(payload, reimportedKey);
    assert.strictEqual(decrypted, 'Export/Import Cycle');
  });

  it('Zusatztest: Salt-Generierung erzwingt mindestens 16 Byte', () => {
    assert.throws(
      () => {
        generateSalt(15);
      },
      (err: any) => {
        assert.ok(err instanceof CryptoError);
        assert.strictEqual(err.code, 'INVALID_SALT_LENGTH');
        return true;
      }
    );
    const validSalt = generateSalt(32);
    assert.strictEqual(validSalt.byteLength, 32);
  });

  it('Zusatztest: Base64-Helfer konvertieren fehlerfrei und werfen bei ungültigem Format', () => {
    const sample = new Uint8Array([0, 1, 254, 255, 128, 64, 32]);
    const b64 = uint8ArrayToBase64(sample);
    const decoded = base64ToUint8Array(b64);
    assert.deepStrictEqual(decoded, sample);

    assert.throws(
      () => {
        base64ToUint8Array('!!! Kein Valides Base64 ===');
      },
      (err: any) => {
        assert.ok(err instanceof CryptoError);
        assert.strictEqual(err.code, 'INVALID_PAYLOAD');
        return true;
      }
    );
  });
});

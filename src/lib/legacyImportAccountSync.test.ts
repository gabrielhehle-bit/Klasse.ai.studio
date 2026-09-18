import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseBackupText, prepareBackupRestore } from './backupRestore';
import { normalizeAppState, syncActiveClass, switchClassState } from './appState';
import { accountSyncState } from './accountSyncService';
import { encryptData, decryptData } from './crypto';
import { createVault } from './vaultService';
import { createAccountSyncStore } from '../server/accountSyncStore';

function legacyBackup(extraStudent = false) {
  return {
    version: 2,
    activeClassId: 'legacy-1a',
    schuljahr: '2025/26',
    klassen: [
      {
        id: 'legacy-1a',
        name: '1a Alt',
        stufe: 1,
        schuljahr: '2025/26',
        schueler: [
          { id: 'l1', vorname: 'Emma', nachname: 'Alt' },
          ...(extraStudent ? [{ id: 'l2', vorname: 'Noah', nachname: 'Alt' }] : []),
        ],
        wochenplanung: {
          '38': {
            Mittwoch: {
              1: { fach: 'Mathematik', thema: 'Zahlenraum 10' },
            },
          },
        },
        noten: {
          Mathematik: {
            l1: [{ id: 'n1', wert: 1, titel: 'Zahlenraum' }],
          },
        },
      },
      {
        id: 'legacy-2b',
        name: '2b Alt',
        stufe: 2,
        schuljahr: '2025/26',
        schueler: [{ id: 'l3', vorname: 'Mia', nachname: 'Alt' }],
        jahresplanung: {
          Deutsch: [{ id: 'j1', monat: 'September', thema: 'Lesen' }],
        },
      },
    ],
  };
}

async function importLegacy(raw: string, vaultKey: CryptoKey) {
  const parsed = parseBackupText(raw);
  const restored = await prepareBackupRestore(parsed, vaultKey, () => null);
  assert.ok(restored);
  return syncActiveClass(normalizeAppState(restored));
}

test('alte JSON-Datei wird migriert und anschließend verschlüsselt im Konto-Sync gespeichert', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'klassio-legacy-sync-'));
  try {
    const vault = await createVault('Legacy account sync test 2026!');
    const migrated = await importLegacy(JSON.stringify(legacyBackup()), vault.vaultKey);

    assert.equal(migrated.classes.length, 2);
    assert.equal(migrated.schueler[0].vorname, 'Emma');
    assert.equal(switchClassState(migrated, 'legacy-2b').schueler[0].vorname, 'Mia');

    const encryptedState = await encryptData(accountSyncState(migrated), vault.vaultKey);
    const store = createAccountSyncStore(dir);
    const userId = '0123456789abcdef01234567';
    const first = await store.put(userId, {
      vaultRecord: vault.vaultRecord,
      encryptedState,
      expectedRevision: 0,
    });

    assert.equal(first.revision, 1);
    const serialized = JSON.stringify(first);
    assert.ok(!serialized.includes('Emma'));
    assert.ok(!serialized.includes('Mia'));
    assert.ok(!serialized.includes('Zahlenraum 10'));

    const decrypted = await decryptData<any>(first.encryptedState, vault.vaultKey);
    const roundtrip = syncActiveClass(normalizeAppState(decrypted));
    assert.equal(roundtrip.classes.length, 2);
    assert.equal(roundtrip.schueler[0].vorname, 'Emma');
    assert.equal(roundtrip.wochenplanung['38'].Mittwoch[1].thema, 'Zahlenraum 10');
    assert.equal((switchClassState(roundtrip, 'legacy-2b').jahresplanung as any).Deutsch[0].thema, 'Lesen');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('erneuter Alt-JSON-Import wird als neue Revision übernommen und nicht mit altem Serverstand vermischt', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'klassio-legacy-resync-'));
  try {
    const vault = await createVault('Legacy resync test 2026!');
    const store = createAccountSyncStore(dir);
    const userId = 'abcdef0123456789abcdef01';

    const firstState = await importLegacy(JSON.stringify(legacyBackup(false)), vault.vaultKey);
    const first = await store.put(userId, {
      vaultRecord: vault.vaultRecord,
      encryptedState: await encryptData(accountSyncState(firstState), vault.vaultKey),
      expectedRevision: 0,
    });
    assert.equal(first.revision, 1);

    const importedAgain = await importLegacy(JSON.stringify(legacyBackup(true)), vault.vaultKey);
    const second = await store.put(userId, {
      vaultRecord: vault.vaultRecord,
      encryptedState: await encryptData(accountSyncState(importedAgain), vault.vaultKey),
      expectedRevision: first.revision,
    });
    assert.equal(second.revision, 2);

    const latest = await decryptData<any>(second.encryptedState, vault.vaultKey);
    const normalizedLatest = syncActiveClass(normalizeAppState(latest));
    assert.deepEqual(normalizedLatest.schueler.map((student: any) => student.vorname), ['Emma', 'Noah']);

    await assert.rejects(
      store.put(userId, {
        vaultRecord: vault.vaultRecord,
        encryptedState: await encryptData(accountSyncState(firstState), vault.vaultKey),
        expectedRevision: first.revision,
      }),
      /REVISION_CONFLICT/,
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

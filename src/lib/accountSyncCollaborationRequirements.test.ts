import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AccountSyncStore } from '../server/accountSyncStore';
import { mentionAliasesForTeacher } from '../server/teacherIdentity';
import { resolveMentionUserIds, type LehrerzimmerUser } from '../server/lehrerzimmerStore';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const encryptedPayload = {
  version: 1 as const,
  algorithm: 'AES-GCM-256' as const,
  iv: 'AAAAAAAAAAAAAAAA',
  ciphertext: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
};

const vaultRecord = {
  version: 1 as const,
  id: 'vault_account_sync_test',
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
  passwordSalt: 'CCCCCCCCCCCCCCCCCCCCCCCC',
  passwordKdfIterations: 600_000,
  encryptedVaultKey: encryptedPayload,
  recoverySalt: 'DDDDDDDDDDDDDDDDDDDDDDDD',
  recoveryKdfIterations: 600_000,
  recoveryWrappedVaultKey: encryptedPayload,
};

test('Konto-Sync wird an die E-Mail-Identität gebunden und speichert nur Chiffretext', async () => {
  const temp = await fsp.mkdtemp(path.join(os.tmpdir(), 'klassio-account-sync-'));
  try {
    const store = new AccountSyncStore(temp);
    const userId = 'abcdef012345abcdef012345';
    const first = await store.put(userId, {
      vaultRecord,
      encryptedState: encryptedPayload,
      expectedRevision: 0,
    });
    assert.equal(first.revision, 1);

    const storedPath = path.join(temp, 'account-sync', userId + '.json');
    const raw = await fsp.readFile(storedPath, 'utf8');
    assert.match(raw, /AES-GCM-256/);
    assert.doesNotMatch(raw, /Schüler|Noten|Musterkind|Vorname/);

    const loaded = await store.get(userId);
    assert.equal(loaded?.vaultRecord.id, vaultRecord.id);
    assert.equal(loaded?.revision, 1);
  } finally {
    await fsp.rm(temp, { recursive: true, force: true });
  }
});

test('Konto-Sync verhindert stilles Überschreiben durch veraltete Geräte', async () => {
  const temp = await fsp.mkdtemp(path.join(os.tmpdir(), 'klassio-account-sync-'));
  try {
    const store = new AccountSyncStore(temp);
    const userId = '1234567890abcdef12345678';
    await store.put(userId, { vaultRecord, encryptedState: encryptedPayload, expectedRevision: 0 });

    await assert.rejects(
      () => store.put(userId, { vaultRecord, encryptedState: encryptedPayload, expectedRevision: 0 }),
      /REVISION_CONFLICT/,
    );
  } finally {
    await fsp.rm(temp, { recursive: true, force: true });
  }
});

test('E-Mail-Konto synchronisiert den AppState Ende-zu-Ende statt Klartext serverseitig zu verarbeiten', () => {
  const server = read('server.ts');
  const context = read('src/context/AppContext.tsx');
  const vaultGate = read('src/components/VaultGate.tsx');
  const backupUtils = read('src/utils/backupUtils.ts');

  assert.match(server, /app\.get\('\/api\/account-sync', requireEmailAccount/);
  assert.match(server, /app\.put\('\/api\/account-sync', requireEmailAccount/);
  assert.match(server, /createAccountSyncStore/);
  assert.match(context, /pushAccountSyncSnapshot/);
  assert.match(context, /decryptAccountSyncSnapshot/);
  assert.match(context, /REVISION_CONFLICT/);
  assert.match(vaultGate, /fetchAccountSyncSnapshot/);
  assert.match(vaultGate, /saveVaultRecord\(remote\.vaultRecord\)/);
  assert.match(backupUtils, /isAccountSyncHealthy\(\)/);
});

test('Lehrerzimmer unterstützt @vorname, @nachname und @vornamenachname eindeutig', () => {
  const aliases = mentionAliasesForTeacher('Anna Muster', 'anna.muster');
  assert.ok(aliases.includes('anna'));
  assert.ok(aliases.includes('muster'));
  assert.ok(aliases.includes('annamuster'));
  assert.ok(aliases.includes('anna.muster'));

  const users: LehrerzimmerUser[] = [
    {
      userId: 'u1',
      displayName: 'Anna Muster',
      handle: 'anna.muster',
      schoolId: 'school',
      joinedAt: new Date(0).toISOString(),
      lastSeenAt: new Date(0).toISOString(),
    },
    {
      userId: 'u2',
      displayName: 'Peter Beispiel',
      handle: 'peter.beispiel',
      schoolId: 'school',
      joinedAt: new Date(0).toISOString(),
      lastSeenAt: new Date(0).toISOString(),
    },
  ];

  assert.deepEqual(resolveMentionUserIds(users, 'Hallo @anna'), ['u1']);
  assert.deepEqual(resolveMentionUserIds(users, 'Hallo @muster'), ['u1']);
  assert.deepEqual(resolveMentionUserIds(users, 'Hallo @annamuster'), ['u1']);
});

test('Mehrdeutige Kurz-Erwähnungen markieren nicht versehentlich die falsche Lehrperson', () => {
  const users: LehrerzimmerUser[] = [
    {
      userId: 'u1',
      displayName: 'Anna Muster',
      handle: 'anna.muster',
      schoolId: 'school',
      joinedAt: new Date(0).toISOString(),
      lastSeenAt: new Date(0).toISOString(),
    },
    {
      userId: 'u2',
      displayName: 'Anna Beispiel',
      handle: 'anna.beispiel',
      schoolId: 'school',
      joinedAt: new Date(0).toISOString(),
      lastSeenAt: new Date(0).toISOString(),
    },
  ];

  assert.deepEqual(resolveMentionUserIds(users, 'Hallo @anna'), []);
  assert.deepEqual(resolveMentionUserIds(users, 'Hallo @annamuster'), ['u1']);
});

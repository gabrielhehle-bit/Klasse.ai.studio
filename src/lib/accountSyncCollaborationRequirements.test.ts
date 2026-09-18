import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AccountSyncStore } from '../server/accountSyncStore';
import { mentionAliasesForTeacher } from '../server/teacherIdentity';
import { resolveMentionUserIds, type LehrerzimmerUser } from '../server/lehrerzimmerStore';
import { accountSyncState, hasEmailAccountSession, mergeAccountSyncState } from './accountSyncService';

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

test('E-Mail-Kontostatus behandelt Netzwerkfehler nicht als Abmeldung', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error('offline');
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => hasEmailAccountSession(),
      (error: any) => error?.code === 'SESSION_STATUS_UNAVAILABLE',
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('E-Mail-Kontostatus unterscheidet echte Abmeldung von Verbindungsfehlern', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    authenticated: true,
    account: null,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })) as typeof fetch;

  try {
    assert.equal(await hasEmailAccountSession(), false);
  } finally {
    globalThis.fetch = previousFetch;
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

test('Konto-Sync überträgt keine gerätespezifische Navigation und reagiert auf spätere E-Mail-Anmeldung', () => {
  const local = {
    currentPage: 'notenmappe',
    previousPage: 'schueler',
    unterrichtsmodus_sidebar_open: true,
    tempQrValue: 'local-only',
    boardSettings: {
      activeSyncCode: 'ABC123',
      isRemoteController: true,
      gabicRole: 'teacher',
      remoteLastActiveTs: 123,
      isTafelOpen: true,
      showAmpel: true,
    },
  } as any;

  const sanitized = accountSyncState(local);
  assert.equal(sanitized.currentPage, 'cockpit');
  assert.equal(sanitized.previousPage, 'wochenplanung');
  assert.equal(sanitized.unterrichtsmodus_sidebar_open, false);
  assert.equal(sanitized.tempQrValue, '');
  assert.equal(sanitized.boardSettings.activeSyncCode, undefined);
  assert.equal(sanitized.boardSettings.isTafelOpen, false);

  const remote = {
    ...local,
    currentPage: 'dashboard',
    previousPage: 'cockpit',
    unterrichtsmodus_sidebar_open: false,
    tempQrValue: '',
    boardSettings: { ...local.boardSettings, activeSyncCode: undefined, isTafelOpen: false },
  } as any;
  const merged = mergeAccountSyncState(remote, local);
  assert.equal(merged.currentPage, 'notenmappe');
  assert.equal(merged.previousPage, 'schueler');
  assert.equal(merged.boardSettings.activeSyncCode, 'ABC123');
  assert.equal(merged.boardSettings.isTafelOpen, true);

  const context = read('src/context/AppContext.tsx');
  const emailLogin = read('src/components/EmailAccountLogin.tsx');
  assert.match(context, /ACCOUNT_SESSION_CHANGED_EVENT/);
  assert.match(context, /15_000/);
  assert.match(emailLogin, /notifyAccountSessionChanged\(\)/);
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
  assert.deepEqual(resolveMentionUserIds(users, 'Hallo @anna.muster.'), ['u1']);
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


test('Konto-Einstellungen zeigen Sync-Zustand, Fehlerhinweis und manuellen Neuversuch', () => {
  const context = read('src/context/AppContext.tsx');
  const accountSettings = read('src/components/settings/AccountSettings.tsx');

  assert.match(context, /accountSyncMessage/);
  assert.match(context, /retryAccountSync/);
  assert.match(context, /document\.visibilityState === 'visible'/);
  assert.match(accountSettings, /data-testid="account-sync-status"/);
  assert.match(accountSettings, /Erneut versuchen/);
  assert.match(accountSettings, /Sync-Konflikt – nichts überschrieben/);

  const vaultGate = read('src/components/VaultGate.tsx');
  assert.match(vaultGate, /SESSION_STATUS_UNAVAILABLE/);
  assert.match(vaultGate, /kein neuer Tresor angelegt/);
  assert.match(vaultGate, /setGateState\('checking'\)/);
});

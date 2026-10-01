import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AccountSyncStore } from '../server/accountSyncStore';
import { createVault } from './vaultService';
import { encryptData, decryptData } from './crypto';
import { parseAccountLiveRevision, needsAccountLiveRefresh } from './accountLiveSync';

test('live hints reject invalid revisions and retain unapplied revisions until confirmed', () => {
  for (const data of ['', '{', 'null', '{}', '{"revision":-1}', '{"revision":1.5}', '{"revision":"2"}']) {
    assert.equal(parseAccountLiveRevision(data), null);
  }
  assert.equal(parseAccountLiveRevision('{"revision":0}'), 0);
  assert.equal(parseAccountLiveRevision('{"revision":2}'), 2);
  assert.equal(needsAccountLiveRefresh(2, 1), true);
  assert.equal(needsAccountLiveRefresh(2, 2), false);
  assert.equal(needsAccountLiveRefresh(1, 2), false);
});

test('a second device receives only committed account-scoped revision hints; conflicting writes never notify', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'klassio-live-'));
  try {
    const store = new AccountSyncStore(dir);
    const user = 'a'.repeat(24), other = 'b'.repeat(24);
    const vault = await createVault('Synthetic-Live-Test-2026!');
    const encryptedState = await encryptData({ note: 'synthetic live edit' }, vault.vaultKey);
    const hints: number[] = [];
    const unrelated: number[] = [];
    const unsubscribe = store.subscribe(user, revision => hints.push(revision));
    const stopOther = store.subscribe(other, revision => unrelated.push(revision));
    const broken = store.subscribe(user, () => { throw new Error('disconnected'); });
    const first = await store.put(user, { vaultRecord: vault.vaultRecord, encryptedState, expectedRevision: 0 });
    assert.deepEqual(hints, [1]);
    assert.deepEqual(unrelated, []);
    const received = await store.get(user);
    assert.equal(received?.revision, hints[0]);
    assert.deepEqual(await decryptData(received!.encryptedState, vault.vaultKey), { note: 'synthetic live edit' });
    await assert.rejects(store.put(user, { vaultRecord: vault.vaultRecord, encryptedState, expectedRevision: 0 }), /REVISION_CONFLICT/);
    assert.deepEqual(hints, [1]);
    await store.put(user, { vaultRecord: vault.vaultRecord, encryptedState, expectedRevision: first.revision });
    assert.deepEqual(hints, [1, 2]);
    unsubscribe(); broken(); stopOther();
    await store.put(user, { vaultRecord: vault.vaultRecord, encryptedState, expectedRevision: 2 });
    assert.deepEqual(hints, [1, 2]);
    assert.throws(() => store.subscribe('../other-account', () => {}), /INVALID_ACCOUNT/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('live connections have an account limit and release their slots on disconnect', async () => {
  const store = new AccountSyncStore('/unused-live-limit-test');
  const user = 'c'.repeat(24);
  const stops = Array.from({ length: 12 }, () => store.subscribe(user, () => {}));
  assert.throws(() => store.subscribe(user, () => {}), /TOO_MANY_LIVE_CONNECTIONS/);
  stops[0]();
  store.subscribe(user, () => {})();
  stops.forEach(stop => stop());
});

import test from 'node:test';
import assert from 'node:assert/strict';
import localforage from 'localforage';
import { ensureTeamTeachingDevice, deleteTeamTeachingDevice, __resetTeamTeachingDeviceForTesting } from './teamTeachingDevice';
import { generateSharedClassKey, wrapClassKeyForPublicKey, unwrapClassKey } from './teamTeachingCrypto';

test('Team device identity survives concurrent startup, reload and storage failure', async t => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const records = new Map<string, unknown>();
  let failWrites = false;
  let failReads = false;
  let writes = 0;
  const fakeStorage = {
    async getItem(key: string) {
      await new Promise(resolve => setTimeout(resolve, 5));
      if (failReads) throw new Error('IndexedDB temporarily unreadable');
      return records.get(key) ?? null;
    },
    async setItem(key: string, value: unknown) {
      writes++;
      if (failWrites) throw new Error('IndexedDB write unavailable');
      records.set(key, structuredClone(value));
      return value;
    },
    async removeItem(key: string) { records.delete(key); },
    async clear() { records.clear(); },
  };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { indexedDB: {} } });
  t.mock.method(localforage, 'createInstance', () => fakeStorage as any);
  t.after(() => {
    __resetTeamTeachingDeviceForTesting();
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else delete (globalThis as any).window;
  });

  const concurrent = await Promise.all(Array.from({ length: 6 }, () => ensureTeamTeachingDevice('owner-1')));
  assert.equal(new Set(concurrent.map(device => device.deviceId)).size, 1);
  assert.equal(writes, 1, 'Concurrent callers must persist exactly one RSA identity');
  const first = concurrent[0];
  const classKey = await generateSharedClassKey();
  const wrapped = await wrapClassKeyForPublicKey(classKey, first.publicKeyJwk);

  __resetTeamTeachingDeviceForTesting();
  const restored = await ensureTeamTeachingDevice('owner-1');
  assert.equal(restored.deviceId, first.deviceId);
  assert.equal(restored.publicKeyJwk.n, first.publicKeyJwk.n);
  assert.equal(restored.privateKey.extractable, false);
  assert.ok(await unwrapClassKey(wrapped, restored.privateKey), 'The persisted private key must still decrypt the team class after reload');

  const other = await ensureTeamTeachingDevice('editor-2');
  assert.notEqual(other.deviceId, first.deviceId, 'Different accounts must have separate identities');
  await assert.rejects(() => unwrapClassKey(wrapped, other.privateKey));

  __resetTeamTeachingDeviceForTesting();
  failReads = true;
  const writesBeforeReadFailure = writes;
  await assert.rejects(() => ensureTeamTeachingDevice('owner-1'), /nicht gelesen/);
  assert.equal(writes, writesBeforeReadFailure, 'An unreadable store must never be overwritten');
  failReads = false;
  assert.equal((await ensureTeamTeachingDevice('owner-1')).deviceId, first.deviceId);

  failWrites = true;
  const temporary = await ensureTeamTeachingDevice('storage-failure');
  assert.equal((await ensureTeamTeachingDevice('storage-failure')).deviceId, temporary.deviceId,
    'A failed IndexedDB write must not regenerate a new identity on the next request');

  failWrites = false;
  const pending = ensureTeamTeachingDevice('delete-during-creation');
  await deleteTeamTeachingDevice('delete-during-creation');
  const deleted = await pending;
  assert.notEqual((await ensureTeamTeachingDevice('delete-during-creation')).deviceId, deleted.deviceId,
    'Device deletion must not be undone by a late RSA generation');
});

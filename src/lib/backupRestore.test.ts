import test from 'node:test';
import assert from 'node:assert/strict';
import localforage from 'localforage';
import { prepareBackupRestore } from './backupRestore';
import { createVault } from './vaultService';
import { createEncryptedBackup } from './backupCryptoService';
import { getActiveVaultKey, setActiveVaultSession, getActiveVaultRecord } from './vaultStorage';
import { decryptData } from './crypto';
import { normalizeAppState } from './appState';
import { saveEncryptedAppState, loadEncryptedAppState, restoreEncryptedAppState, loadPreImportBackup, STORAGE_KEYS, __resetSecureStorageForTesting } from './secureStorageService';

const password = 'Test-only strong password 123!';
const oldState = normalizeAppState({ klassenbezeichnung: 'Local', schueler: [{ id: 'local', name: 'Local Synthetic' }] });
const newState = normalizeAppState({ klassenbezeichnung: 'Imported', schueler: [{ id: 'foreign', name: 'Foreign Synthetic' }] });

test('restore uses the local vault and keeps a decryptable pre-import generation', async () => {
  __resetSecureStorageForTesting();
  const local = await createVault(password);
  const foreign = await createVault('Different backup password 123!');
  setActiveVaultSession(local.vaultKey, local.vaultRecord);
  const backup = await createEncryptedBackup(newState, foreign.vaultKey, foreign.vaultRecord);
  const decoded = await prepareBackupRestore(backup, local.vaultKey, () => 'Different backup password 123!');
  assert.equal(getActiveVaultKey(), local.vaultKey);
  assert.deepEqual(getActiveVaultRecord(), local.vaultRecord);
  await saveEncryptedAppState(oldState, local.vaultKey);
  await restoreEncryptedAppState(oldState, decoded as any, local.vaultKey);
  assert.deepEqual(await loadEncryptedAppState(local.vaultKey), JSON.parse(JSON.stringify(newState)));
  assert.deepEqual(await loadPreImportBackup(local.vaultKey), JSON.parse(JSON.stringify(oldState)));
  await assert.rejects(loadEncryptedAppState(foreign.vaultKey));
});

test('cancel and wrong credentials do not change local session or data', async () => {
  __resetSecureStorageForTesting();
  const local = await createVault(password);
  const foreign = await createVault('Other password 123!');
  setActiveVaultSession(local.vaultKey, local.vaultRecord);
  await saveEncryptedAppState(oldState, local.vaultKey);
  const backup = await createEncryptedBackup(newState, foreign.vaultKey, foreign.vaultRecord);
  assert.equal(await prepareBackupRestore(backup, local.vaultKey, () => null), null);
  await assert.rejects(prepareBackupRestore(backup, local.vaultKey, () => 'wrong'));
  assert.equal(getActiveVaultKey(), local.vaultKey);
  assert.deepEqual(await loadEncryptedAppState(local.vaultKey), JSON.parse(JSON.stringify(oldState)));
});

test('32-character passwords, recovery codes and encrypted emergency records are supported', async () => {
  const local = await createVault(password);
  const foreign = await createVault('X'.repeat(32));
  const backup = await createEncryptedBackup(newState, foreign.vaultKey, foreign.vaultRecord);
  assert.ok(await prepareBackupRestore(backup, local.vaultKey, () => 'X'.repeat(32)));
  assert.ok(await prepareBackupRestore(backup, local.vaultKey, () => foreign.recoveryCode));
  const record = await saveEncryptedAppState(oldState, local.vaultKey);
  assert.deepEqual(await prepareBackupRestore(record, local.vaultKey, () => null), JSON.parse(JSON.stringify(oldState)));
});

test('rejects malformed legacy data instead of normalizing away broken lists', async () => {
  const { vaultKey } = await createVault(password);
  for (const input of [[], null, { classes: [null] }, { schueler: 'broken' }, { classes: [{ schueler: {} }] }]) {
    await assert.rejects(prepareBackupRestore(input, vaultKey, () => null));
  }
  assert.deepEqual(await prepareBackupRestore({ schueler: [] }, vaultKey, () => null), { schueler: [] });
});

test('writes are ordered: an in-flight autosave cannot overwrite a later restore', async () => {
  __resetSecureStorageForTesting();
  const { vaultKey } = await createVault(password);
  const oldSave = saveEncryptedAppState(oldState, vaultKey);
  const restore = restoreEncryptedAppState(oldState, newState, vaultKey);
  await Promise.all([oldSave, restore]);
  assert.deepEqual(await loadEncryptedAppState(vaultKey), JSON.parse(JSON.stringify(newState)));
});

test('browser storage failure aborts restore without reporting an in-memory success', async () => {
  const { vaultKey } = await createVault(password);
  const storage = new Map<string, any>();
  const original = { get: localforage.getItem, set: localforage.setItem, window: globalThis.window };
  let failPrimary = false;
  let failBackup = false;
  let corruptPrimaryRead = false;
  (globalThis as any).window = {};
  localforage.getItem = (async (key: string) => corruptPrimaryRead && key === STORAGE_KEYS.PRIMARY ? 'corrupt' : storage.get(key) ?? null) as any;
  localforage.setItem = (async (key: string, value: any) => {
    if ((failPrimary && key === STORAGE_KEYS.PRIMARY) || (failBackup && key === STORAGE_KEYS.PRE_IMPORT)) throw new Error('Quota exceeded');
    storage.set(key, value); return value;
  }) as any;
  try {
    // Fallback storage is not available in this simulated browser; primary remains testable.
    const initial = await saveEncryptedAppState(oldState, vaultKey);
    failBackup = true;
    await assert.rejects(restoreEncryptedAppState(oldState, newState, vaultKey));
    assert.deepEqual(JSON.parse(storage.get(STORAGE_KEYS.PRIMARY)), initial);
    failBackup = false;
    failPrimary = true;
    await assert.rejects(restoreEncryptedAppState(oldState, newState, vaultKey));
    assert.ok(storage.has(STORAGE_KEYS.PRE_IMPORT));
    assert.deepEqual(await decryptData(JSON.parse(storage.get(STORAGE_KEYS.PRE_IMPORT)).encryptedState, vaultKey), JSON.parse(JSON.stringify(oldState)));
    failPrimary = false;
    corruptPrimaryRead = true;
    await assert.rejects(restoreEncryptedAppState(oldState, newState, vaultKey));
    assert.deepEqual(await decryptData(JSON.parse(storage.get(STORAGE_KEYS.PRIMARY)).encryptedState, vaultKey), JSON.parse(JSON.stringify(oldState)));
    for (const value of storage.values()) assert.ok(!String(value).includes('Synthetic'));
  } finally {
    localforage.getItem = original.get;
    localforage.setItem = original.set;
    if (original.window === undefined) delete (globalThis as any).window;
    else globalThis.window = original.window;
  }
});

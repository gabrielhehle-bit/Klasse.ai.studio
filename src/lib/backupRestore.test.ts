import test from 'node:test';
import assert from 'node:assert/strict';
import localforage from 'localforage';
import { createVault } from './vaultService';
import { createEncryptedBackup, serializeBackup } from './backupCryptoService';
import { prepareBackupRestore, parseBackupJSON, validateBackupState, commitBackupRestore } from './backupRestoreService';
import { initialAppState, normalizeAppState, syncActiveClass, switchClassState } from './appState';
import { getActiveVaultKey, getActiveVaultRecord, setActiveVaultSession, clearActiveVaultSession } from './vaultStorage';
import { loadEncryptedAppState, loadEncryptedPreImportBackup, saveEncryptedAppState, __resetSecureStorageForTesting } from './secureStorageService';
import { triggerBackupDownload } from '../utils/backupUtils';
const state = () => JSON.parse(JSON.stringify(normalizeAppState({ ...structuredClone(initialAppState), klassenbezeichnung: '3a', schueler: [{ id: 's1', vorname: 'Ada', nachname: 'Testkind' }] })));
const password = 'P'.repeat(32);
const source = await createVault(password);
const destination = await createVault('Anderes-Tresorpasswort!');
function replaceGlobal(name: string, value: any) {
  const original = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, value });
  return () => { if (original) Object.defineProperty(globalThis, name, original); else delete (globalThis as any)[name]; };
}

test('JSON download is encrypted, complete and restorable', async t => {
  const data = state(); setActiveVaultSession(source.vaultKey, source.vaultRecord);
  let blob: Blob | undefined; const attrs: Record<string, string> = {};
  t.mock.method(URL, 'createObjectURL', (value: any) => { blob = value; return 'blob:test'; });
  t.mock.method(URL, 'revokeObjectURL', () => undefined);
  const cleanupDocument = replaceGlobal('document', { createElement: () => ({ setAttribute: (k: string, v: string) => attrs[k] = v, click() {} }), body: { appendChild() {}, removeChild() {} } });
  const cleanupStorage = replaceGlobal('localStorage', { setItem() {}, removeItem() {} });
  try {
    await triggerBackupDownload(data);
    assert.match(attrs.download, /\.json$/); assert.match(blob!.type, /^application\/json/);
    const text = await blob!.text(); assert.ok(!text.includes('Testkind'));
    assert.deepEqual(await prepareBackupRestore(parseBackupJSON(text), () => { throw Error('Unnecessary password prompt'); }), data);
  } finally { cleanupDocument(); cleanupStorage(); }
});

test('Another-device restore preserves destination password and stores an encrypted rollback', async () => {
  __resetSecureStorageForTesting();
  const before = state(); const incoming = state(); incoming.schueler[0].vorname = 'Neu';
  const exported = serializeBackup(await createEncryptedBackup(incoming, source.vaultKey, source.vaultRecord));
  setActiveVaultSession(destination.vaultKey, destination.vaultRecord);
  const prepared = await prepareBackupRestore(parseBackupJSON(exported), () => password);
  assert.deepEqual(prepared, incoming); assert.equal(getActiveVaultKey(), destination.vaultKey);
  assert.deepEqual(getActiveVaultRecord(), destination.vaultRecord);
  await commitBackupRestore(before, prepared!, destination.vaultKey);
  assert.deepEqual(await loadEncryptedAppState(destination.vaultKey), incoming);
  assert.deepEqual(await loadEncryptedPreImportBackup(destination.vaultKey), before);
});

test('Legacy JSON with BOM and recovery code both restore', async () => {
  const data = state();
  assert.deepEqual(await prepareBackupRestore(parseBackupJSON('\uFEFF' + JSON.stringify(data)), () => null), data);
  const backup = await createEncryptedBackup(data, source.vaultKey, source.vaultRecord);
  assert.deepEqual(await prepareBackupRestore(backup, () => source.recoveryCode, destination.vaultKey), data);
});

test('Cancel, wrong password, tampering and unknown versions preserve the active vault', async () => {
  setActiveVaultSession(destination.vaultKey, destination.vaultRecord);
  const backup = await createEncryptedBackup(state(), source.vaultKey, source.vaultRecord);
  assert.equal(await prepareBackupRestore(backup, () => null), null);
  await assert.rejects(prepareBackupRestore(backup, () => 'FalschesPasswort'), /Passwort/);
  const damaged = structuredClone(backup); damaged.encryptedState.ciphertext = 'AAAA';
  await assert.rejects(prepareBackupRestore(damaged, () => password));
  await assert.rejects(prepareBackupRestore({ ...backup, version: 99, schueler: [] }, () => null), /Version/);
  assert.equal(getActiveVaultKey(), destination.vaultKey);
});

test('Malformed JSON and invalid collections are rejected before normalization', () => {
  for (const data of [null, [], {}, { schueler: [] }, { classes: 'wrong' }, { ...state(), noten: [] }, { ...state(), schueler: [null] }]) assert.throws(() => validateBackupState(data));
  assert.throws(() => parseBackupJSON('const backup = {"schueler": []};'), /JSON/);
});

test('Failure creating rollback prevents writes; failed primary write restores previous data', async () => {
  let writes = 0;
  await assert.rejects(commitBackupRestore(state(), state(), destination.vaultKey, {
    savePrevious: async () => { throw Error('quota'); }, saveState: async () => { writes++; return {} as any; },
  }), /quota/); assert.equal(writes, 0);
  const before = state(); const next = state(); next.klassenbezeichnung = 'Neu'; const written: any[] = [];
  await assert.rejects(commitBackupRestore(before, next, destination.vaultKey, {
    savePrevious: async () => undefined,
    saveState: async value => { written.push(value); if (written.length === 1) throw Error('disk'); return {} as any; },
  }), /disk/); assert.deepEqual(written, [next, before]);
});

test('Browser quota failure must not silently save only in RAM', async t => {
  const cleanup = replaceGlobal('window', { indexedDB: {} });
  t.mock.method(localforage, 'setItem', async () => { throw new Error('QuotaExceededError'); });
  try { await assert.rejects(saveEncryptedAppState(state(), destination.vaultKey), /QuotaExceeded/); } finally { cleanup(); }
});

test('Locked vault cannot export plaintext', async () => {
  clearActiveVaultSession(); await assert.rejects(triggerBackupDownload(state()), /Tresor entsperren/);
});

test('A → B → A plus normalization preserves assessments and class extensions', () => {
  const a = { id: 'A', name: 'A', stufe: 3, klassenvorstand: true, schueler: [], saAssessments: { A: { points: 7 } }, klassenglas_missions: ['a'], customFutureField: { x: 1 } };
  const b = { id: 'B', name: 'B', stufe: 4, klassenvorstand: true, schueler: [], saAssessments: { B: { points: 9 } }, klassenglas_missions: ['b'] };
  let app = normalizeAppState({ ...structuredClone(initialAppState), classes: [a, b], activeClassId: 'A' });
  app = syncActiveClass(switchClassState(app, 'B'));
  assert.deepEqual(app.saAssessments, b.saAssessments); assert.deepEqual(app.classes![1].saAssessments, b.saAssessments);
  app = syncActiveClass(switchClassState(normalizeAppState(app), 'A'));
  assert.deepEqual(app.saAssessments, a.saAssessments); assert.deepEqual(app.klassenglas_missions, a.klassenglas_missions);
  assert.deepEqual((app.classes![0] as any).customFutureField, a.customFutureField); assert.deepEqual(app.classes![1].saAssessments, b.saAssessments);
});

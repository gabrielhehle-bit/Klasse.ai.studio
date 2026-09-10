import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBackupText, prepareBackupRestore } from './backupRestore';
import { triggerBackupDownload } from '../utils/backupUtils';
import { createVault } from './vaultService';
import { clearActiveVaultSession } from './vaultStorage';
import { isEncryptedBackupV1, decryptBackup } from './backupCryptoService';

const synthetic = { schueler: [{ id: 'synthetic', vorname: 'Backup-Testname' }] };

test('imports JSON, BOM and simple legacy JS wrappers without executing JavaScript', () => {
  const json = JSON.stringify(synthetic);
  for (const text of [json, '\uFEFF  '+json, 'const backup = '+json+';', 'let backup = '+json, 'var backup = '+json+';', 'export default '+json+';']) {
    assert.deepEqual(parseBackupText(text), synthetic);
  }
});

test('rejects arbitrary text, executable expressions and trailing JavaScript', () => {
  for (const text of ['not a backup', 'prefix {"schueler":[]} suffix', 'const b = {"schueler":[]}; alert(1);', 'const b = {schueler: []};', 'const b = (() => ({"schueler":[]}))();', '{"schueler":[]} {"classes":[]}']) {
    assert.throws(() => parseBackupText(text));
  }
});

test('export refuses missing vault instead of silently downloading plaintext', async () => {
  clearActiveVaultSession();
  await assert.rejects(triggerBackupDownload(synthetic as any), /Tresor/);
});

test('JSON download stays encrypted and round-trips through the shared import decoder', async () => {
  const vault = await createVault('Synthetic test password 123!');
  let downloaded: Blob | undefined;
  let filename = '';
  let clicked = false;
  const original = {
    document: globalThis.document, localStorage: globalThis.localStorage,
    createURL: URL.createObjectURL, revokeURL: URL.revokeObjectURL,
  };
  const anchor = { setAttribute: (name: string, value: string) => { if (name === 'download') filename = value; }, click: () => { clicked = true; } };
  try {
    (globalThis as any).document = { createElement: () => anchor, body: { appendChild() {}, removeChild() {} } };
    (globalThis as any).localStorage = { setItem() {}, removeItem() {} };
    URL.createObjectURL = ((blob: Blob) => { downloaded = blob; return 'blob:synthetic'; }) as any;
    URL.revokeObjectURL = () => {};
    await triggerBackupDownload(synthetic as any, vault.vaultKey, vault.vaultRecord);
    assert.equal(clicked, true);
    assert.ok(filename.endsWith('.json'));
    const text = await downloaded!.text();
    assert.ok(!text.includes('Backup-Testname'));
    const backup = parseBackupText(text);
    assert.ok(isEncryptedBackupV1(backup));
    assert.deepEqual(await decryptBackup(backup, vault.vaultKey), synthetic);
    assert.deepEqual(await prepareBackupRestore(backup, vault.vaultKey, () => null), synthetic);
  } finally {
    URL.createObjectURL = original.createURL;
    URL.revokeObjectURL = original.revokeURL;
    for (const name of ['document', 'localStorage'] as const) {
      if (original[name] === undefined) delete (globalThis as any)[name];
      else (globalThis as any)[name] = original[name];
    }
  }
});

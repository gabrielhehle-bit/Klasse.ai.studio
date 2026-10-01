import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialAppState } from './appState';
import { appStateFingerprint } from './accountSyncService';
import { needsServerLoadConfirmation } from './accountServerLoad';

const state = (name: string) => ({ ...structuredClone(initialAppState), schoolName: name });
test('Manuelles Laden: unveränderter lokaler Stand übernimmt neueren Serverstand', () => {
  const local = state('Alt');
  assert.equal(needsServerLoadConfirmation(local, state('Neu'), appStateFingerprint(local)), false);
});
test('Manuelles Laden: unbekannte Baseline und lokale Änderungen benötigen Zustimmung', () => {
  assert.equal(needsServerLoadConfirmation(state('Lokal'), state('Server')), true);
  assert.equal(needsServerLoadConfirmation(state('Lokal'), state('Server'), appStateFingerprint(state('Vorher'))), true);
  assert.equal(needsServerLoadConfirmation(state('Gleich'), state('Gleich')), false);
});
test('Manuelles Laden: entfernte Klassen benötigen auch mit sauberer Baseline Zustimmung', () => {
  const local = { ...state('Schule'), activeClassId: 'a', classes: [{ ...initialAppState.classes[0], id: 'a', name: '1a', namen: [{ id: 'kind', vorname: 'Anna' }] }] } as any;
  const incoming = { ...state('Schule'), classes: [], activeClassId: undefined };
  assert.equal(needsServerLoadConfirmation(local, incoming, appStateFingerprint(local)), true);
});
test('Manueller Ladeweg ersetzt erst nach gesicherter Kopie und lädt niemals Daten hoch', () => {
  const source = readFileSync('src/context/AppContext.tsx', 'utf8');
  const loader = source.split('const loadLatestAccountState =')[1].split('const resolveAccountSyncConflict =')[0];
  assert.doesNotMatch(loader, /pushAccountSyncSnapshot|pushSharedClass/);
  assert.match(loader, /await pullSharedClass/);
  assert.match(loader, /await restoreEncryptedAppState\(previous, next, key\)/);
  assert.ok(loader.indexOf('await restoreEncryptedAppState') < loader.indexOf('setAppInternal(next)'));
  assert.match(loader, /checked.revision !== remote.revision/);
  assert.match(loader, /getActiveVaultKey\(\) !== key/);
});

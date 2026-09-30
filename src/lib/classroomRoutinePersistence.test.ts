import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAppState, syncActiveClass, switchClassState } from './appState';
import { appStateFingerprint, mergeAccountSyncState } from './accountSyncService';
import { encryptSyncState, decryptSyncState } from './syncService';
import { logObservation } from './utils';
import type { AppState } from '../types';

const date = '2026-09-30';
function fixture() {
  return normalizeAppState({ activeClassId: 'a', classes: ['a', 'b'].map(id => ({
    id, name: `Testklasse ${id}`,
    schueler: [{ id: 'shared-test-id', vorname: 'Testkind', nachname: id }],
  })) });
}
function record(state: AppState, text: string, art: 'positiv' | 'beobachten') {
  state = syncActiveClass({ ...state,
    anwesenheit: { ...state.anwesenheit, 'shared-test-id': { [date]: { '1': 'e', '2': 'e' } } },
    anwesenheitDetail: { ...state.anwesenheitDetail, 'shared-test-id': { [date]: { notiz: `Grund ${text}` } } },
  });
  logObservation((update: (previous: AppState) => AppState) => { state = syncActiveClass(update(state)); },
    'shared-test-id', text, 'Notiz', 'Schülerdossier', date, { fach: 'Deutsch', art });
  return state;
}

test('Anwesenheit und Dossiernotizen bleiben nach Klassenwechsel und Neuladen getrennt', () => {
  let state = record(fixture(), 'Beobachtung A', 'positiv');
  state = record(switchClassState(state, 'b'), 'Beobachtung B', 'beobachten');
  state = normalizeAppState(JSON.parse(JSON.stringify(switchClassState(state, 'a'))));
  assert.equal(state.anwesenheit['shared-test-id'][date]['1'], 'e');
  assert.equal(state.anwesenheitDetail['shared-test-id'][date].notiz, 'Grund Beobachtung A');
  assert.equal(state.notes.length, 1);
  assert.equal(state.notes[0].inhalt, 'Beobachtung A');
  assert.equal((state.notes[0] as any).art, 'positiv');
  assert.equal(state.notes[0].fach, 'Deutsch');
  const other = switchClassState(state, 'b');
  assert.equal(other.anwesenheitDetail['shared-test-id'][date].notiz, 'Grund Beobachtung B');
  assert.equal(other.notes.length, 1);
  assert.equal((other.notes[0] as any).art, 'beobachten');
  assert.equal(other.journal[0].id, other.notes[0].id);
});

test('Anwesenheit und Notiz mit Markierung überstehen verschlüsselten Sync', async () => {
  const state = record(fixture(), 'Verschlüsselte Testbeobachtung', 'positiv');
  assert.notEqual(appStateFingerprint(state), appStateFingerprint(fixture()));
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const payload = await encryptSyncState(state, key);
  assert.ok(!JSON.stringify(payload).includes('Verschlüsselte Testbeobachtung'));
  const received = normalizeAppState(await decryptSyncState<AppState>(payload, key));
  const secondState = normalizeAppState(mergeAccountSyncState(received, fixture()));
  assert.deepEqual(secondState.anwesenheit, state.anwesenheit);
  assert.deepEqual(secondState.anwesenheitDetail, state.anwesenheitDetail);
  assert.deepEqual(secondState.notes, state.notes);
  assert.deepEqual(secondState.journal, state.journal);
});

test('Notizmarkierungen werden auch ohne Fach gespeichert und leere Notizen ignoriert', () => {
  let state: any = { notes: [], journal: [] };
  const update = (fn: (previous: any) => any) => { state = fn(state); };
  for (const art of ['neutral', 'positiv', 'beobachten'] as const) {
    logObservation(update, 'test', art, 'Notiz', 'Schülerdossier', date, { art });
    assert.equal(state.notes[0].art, art);
    assert.equal(state.notes[0].fach, undefined);
  }
  logObservation(update, 'test', '   ');
  assert.equal(state.notes.length, 3);
});

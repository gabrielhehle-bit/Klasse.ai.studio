import test from 'node:test';
import assert from 'node:assert/strict';
import { saveSyncPresentation } from './saveSyncPresentation';
test('Gerätewechsel ist nur mit lokalem und aktuellem Servernachweis grün', () => {
  assert.equal(saveSyncPresentation('saved', 'synced', true).ready, true);
  for (const local of ['pending', 'error'] as const) assert.equal(saveSyncPresentation(local, 'synced', true).ready, false);
  for (const status of ['disabled', 'idle', 'saved-local', 'syncing', 'conflict', 'error', 'saving-local', 'local-error'] as const) assert.equal(saveSyncPresentation('saved', status, true).ready, false);
  assert.equal(saveSyncPresentation('saved', 'synced', false).ready, false);
});
test('Offline, lokaler Nachweis, ausstehende Änderungen und Konflikte sind unterscheidbar', () => {
  assert.equal(saveSyncPresentation('saved', 'saved-local', false).label, 'Offline · auf diesem Gerät gespeichert');
  assert.equal(saveSyncPresentation('pending', 'synced', true).label, 'Änderung noch ausstehend');
  assert.equal(saveSyncPresentation('saved', 'disabled', true).label, 'Auf diesem Gerät gespeichert');
  assert.equal(saveSyncPresentation('saved', 'conflict', true).label, 'Synchronisationskonflikt');
  assert.equal(saveSyncPresentation('error', 'synced', false).label, 'Speichern fehlgeschlagen');
});
test('Persönlicher Sync allein reicht bei ausstehenden Teamänderungen nicht', () => {
  for (const team of ['pending', 'conflict', 'error'] as const) assert.equal(saveSyncPresentation('saved', 'synced', true, team).ready, false);
  assert.equal(saveSyncPresentation('saved', 'synced', true, 'synced').ready, true);
  assert.equal(saveSyncPresentation('saved', 'synced', true, 'conflict').label, 'Synchronisationskonflikt');
});

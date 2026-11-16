import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { saveSyncPresentation } from './saveSyncPresentation';
test('Gerätewechsel ist nur mit lokalem und aktuellem Servernachweis grün', () => {
  assert.equal(saveSyncPresentation('saved', 'synced', true).ready, true);
  assert.equal(saveSyncPresentation('saved', 'synced', true).compactLabel, 'Synchronisiert');
  for (const local of ['pending', 'error'] as const) assert.equal(saveSyncPresentation(local, 'synced', true).ready, false);
  for (const status of ['disabled', 'idle', 'saved-local', 'syncing', 'conflict', 'error', 'saving-local', 'local-error'] as const) assert.equal(saveSyncPresentation('saved', status, true).ready, false);
  assert.equal(saveSyncPresentation('saved', 'synced', false).ready, false);
});
test('Offline, lokaler Nachweis, ausstehende Änderungen und Konflikte sind unterscheidbar', () => {
  assert.equal(saveSyncPresentation('saved', 'saved-local', false).label, 'Offline · auf diesem Gerät gespeichert');
  assert.equal(saveSyncPresentation('pending', 'synced', true).label, 'Änderung noch ausstehend');
  assert.equal(saveSyncPresentation('saved', 'disabled', true).label, 'Auf diesem Gerät gespeichert');
  assert.equal(saveSyncPresentation('saved', 'disabled', true).compactLabel, 'Lokal gespeichert');
  assert.equal(saveSyncPresentation('saved', 'saved-local', false).compactLabel, 'Offline · lokal gespeichert');
  assert.equal(saveSyncPresentation('saved', 'conflict', true).compactLabel, 'Sync-Konflikt');
  assert.equal(saveSyncPresentation('saved', 'conflict', true).label, 'Synchronisationskonflikt');
  assert.equal(saveSyncPresentation('error', 'synced', false).label, 'Speichern fehlgeschlagen');
});
test('Persönlicher Sync allein reicht bei ausstehenden Teamänderungen nicht', () => {
  for (const team of ['pending', 'conflict', 'error'] as const) assert.equal(saveSyncPresentation('saved', 'synced', true, team).ready, false);
  assert.equal(saveSyncPresentation('saved', 'synced', true, 'synced').ready, true);
  assert.equal(saveSyncPresentation('saved', 'synced', true, 'conflict').label, 'Synchronisationskonflikt');
});


test('autosave guidance distinguishes durable local saves from confirmed account and team uploads', () => {
  const status = readFileSync('src/components/SaveSyncStatus.tsx', 'utf8');
  const team = readFileSync('src/components/ClassTeam.tsx', 'utf8');
  assert.match(status, /data-testid="autosave-explanation"/);
  assert.match(status, /getrennt, was auf diesem Gerät und auf dem Server angekommen ist/);
  assert.match(status, /Änderung wird automatisch gespeichert/);
  assert.match(team, /data-testid="team-autosave-explanation"/);
  assert.match(team, /Erst „Team synchronisiert“ bestätigt den gemeinsamen Stand/);
});

test('mobile header exposes real save and sync text instead of an unexplained colored dot', () => {
  const topbar = readFileSync('src/components/Topbar.tsx', 'utf8');
  const status = readFileSync('src/components/SaveSyncStatus.tsx', 'utf8');
  assert.match(topbar, /<SaveSyncStatus fullWidth \/>/);
  assert.match(status, /fullWidth = false/);
  assert.match(status, /data-testid="mobile-save-state"/);
  assert.match(status, /\{state\.compactLabel\}/);
  assert.match(status, /state\.attention \? 'bg-rose-500'/);
  assert.match(status, /min-h-11/);
  assert.match(status, /aria-label=\{\`Speicherstatus: \$\{statusTitle\}\`\}/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const saveSyncStatus = readFileSync('src/components/SaveSyncStatus.tsx', 'utf8');
const topbar = readFileSync('src/components/Topbar.tsx', 'utf8');

test('Der Speicherstatus enthält keine Steuerung für das Tafellayout', () => {
  assert.doesNotMatch(saveSyncStatus, /cockpitEditing/);
  assert.doesNotMatch(saveSyncStatus, /cockpitLayoutMode/);
  assert.doesNotMatch(saveSyncStatus, /data-widget-resize/);
  assert.doesNotMatch(saveSyncStatus, /blockAccidentalLayoutChanges/);
});

test('Heute hat einen klaren Bearbeiten-Einstieg ohne wechselnde Breite', () => {
  assert.match(saveSyncStatus, /isDashboard/);
  assert.match(saveSyncStatus, /open-dashboard-customize/);
  assert.match(saveSyncStatus, /aria-label="Heute bearbeiten"/);
  assert.match(saveSyncStatus, /w-\[5\.75rem\]/);
});

test('Speicherstatus bleibt auf großen Bildschirmen kompakt und zeigt am Handy Text', () => {
  assert.match(topbar, /<SaveSyncStatus \/>/);
  assert.match(topbar, /<SaveSyncStatus fullWidth \/>/);
  assert.match(saveSyncStatus, /fullWidth \? "w-full" : "w-fit shrink-0"/);
  assert.match(saveSyncStatus, /"w-11 justify-center rounded-full"/);
  assert.match(saveSyncStatus, /min-h-11/);
  assert.match(saveSyncStatus, /h-2\.5 w-2\.5/);
  assert.match(saveSyncStatus, /bg-emerald-500/);
  assert.match(saveSyncStatus, /bg-amber-400/);
});

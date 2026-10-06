import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const saveSyncStatus = readFileSync('src/components/SaveSyncStatus.tsx', 'utf8');
const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const topbar = readFileSync('src/components/Topbar.tsx', 'utf8');

test('Lehrercockpit-Widgets bleiben jederzeit verschiebbar und skalierbar', () => {
  assert.match(cockpit, /<SaveSyncStatus compact/);
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

test('Speicherstatus bleibt in Heute und Cockpit ein fester Punkt', () => {
  assert.match(topbar, /<SaveSyncStatus \/>/);
  assert.match(saveSyncStatus, /h-8 w-8/);
  assert.match(saveSyncStatus, /h-2\.5 w-2\.5/);
  assert.match(saveSyncStatus, /bg-emerald-500/);
  assert.match(saveSyncStatus, /bg-amber-400/);
});

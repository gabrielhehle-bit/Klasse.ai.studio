import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const saveSyncStatus = readFileSync('src/components/SaveSyncStatus.tsx', 'utf8');
const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const topbar = readFileSync('src/components/Topbar.tsx', 'utf8');

test('Lehrercockpit verwendet den kompakten Benutzen/Bearbeiten-Schalter', () => {
  assert.match(cockpit, /<SaveSyncStatus compact/);
  assert.match(saveSyncStatus, /cockpitEditing/);
  assert.match(saveSyncStatus, /Benutzen/);
  assert.match(saveSyncStatus, /Bearbeiten/);
  assert.match(saveSyncStatus, /w-\[5\.75rem\]/);
});

test('Benutzen-Modus schützt Layout, lässt Widget-Inhalte aber bedienbar', () => {
  assert.match(saveSyncStatus, /data\.cockpitLayoutMode/);
  assert.match(saveSyncStatus, /data-widget-resize/);
  assert.match(saveSyncStatus, /board-widget-element/);
  assert.match(saveSyncStatus, /button, a, input, textarea, select/);
  assert.match(saveSyncStatus, /event\.clientY <= rect\.top \+ 50/);
});

test('Speicherstatus bleibt in Heute und Cockpit ein fester Punkt', () => {
  assert.match(topbar, /<SaveSyncStatus \/>/);
  assert.match(saveSyncStatus, /h-8 w-8/);
  assert.match(saveSyncStatus, /h-2\.5 w-2\.5/);
  assert.match(saveSyncStatus, /bg-emerald-500/);
  assert.match(saveSyncStatus, /bg-amber-400/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Lehrercockpit zeigt keinen dauerhaften schwebenden Haustier-Launcher und keine Haustier-Menüs mehr', () => {
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  assert.match(cockpit, /const showFloatingClassPetUi = false;/);
  assert.match(cockpit, /showFloatingClassPetUi && actualShowPet/);
  assert.match(cockpit, /showFloatingClassPetUi && petAccessoryOverlayOpen/);
});

test('Das Klassenhaustier als reguläre Funktion bleibt im Dashboard erhalten', () => {
  const dashboard = readFileSync('src/components/Dashboard.tsx', 'utf8');
  assert.match(dashboard, /<MemoizedClassPetWidget \/>/);
});

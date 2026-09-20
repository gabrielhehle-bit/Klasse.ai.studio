import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Das Klassenhaustier bleibt im Lehrercockpit nutzbar; die Entfernung betrifft nur das Dashboard', () => {
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  assert.doesNotMatch(cockpit, /const showFloatingClassPetUi = false;/);
  assert.match(cockpit, /\{actualShowPet &&/);
  assert.match(cockpit, /\{petAccessoryOverlayOpen && \(/);
});

test('Das Klassenhaustier bleibt als eigenständige Funktion erhalten, aber nicht im Dashboard', () => {
  const dashboard = readFileSync('src/components/Dashboard.tsx', 'utf8');
  assert.doesNotMatch(dashboard, /<MemoizedClassPetWidget \/>/);
  const widget = readFileSync('src/components/ClassPetWidget.tsx', 'utf8');
  assert.match(widget, /export default|export const ClassPetWidget/);
});

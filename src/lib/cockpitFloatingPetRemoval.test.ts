import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Das Klassenmaskottchen bleibt als reguläres Widget nutzbar, ohne schwebende Alt-Begleiter', () => {
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  assert.doesNotMatch(cockpit, /const showFloatingClassPetUi = false;/);
  assert.match(cockpit, /\{false && actualShowPet &&/);
  assert.match(cockpit, /\{false && petAccessoryOverlayOpen && \(/);
  assert.match(cockpit, /case "pet":\s*return <ClassMascotWidget/);
});

test('Das Klassenhaustier bleibt als eigenständige Funktion erhalten, aber nicht im Dashboard', () => {
  const dashboard = readFileSync('src/components/Dashboard.tsx', 'utf8');
  assert.doesNotMatch(dashboard, /<MemoizedClassPetWidget \/>/);
  const widget = readFileSync('src/components/ClassPetWidget.tsx', 'utf8');
  assert.match(widget, /export default|export const ClassPetWidget/);
});

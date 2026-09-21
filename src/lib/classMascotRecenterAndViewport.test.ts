import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { centerClassMascotInViewport } from './classMascot';

test('Maskottchen positioniert sich in jeder Cockpitgröße mittig, unabhängig von der weißen Schreibfläche', () => {
  assert.deepEqual(centerClassMascotInViewport(1000, 600, 220), { x: 39, y: (380 / 1200) * 100 });
  assert.deepEqual(centerClassMascotInViewport(220, 220, 220), { x: 0, y: 0 });
  assert.deepEqual(centerClassMascotInViewport(120, 90, 280), { x: 12.5, y: 0 });
  assert.deepEqual(centerClassMascotInViewport(0, 600, 220), { x: 0, y: 0 });
  assert.deepEqual(centerClassMascotInViewport(NaN, 600, 220), { x: 0, y: 0 });
});

test('Nach Fernbedienung oder Viewport-Wechsel wird am neuen Cockpit-Root neu gemessen', () => {
  const widget = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');
  assert.match(widget, /const stage = isFreeMascot \? mascotPortalTarget : activeStageRef\.current/);
  assert.match(widget, /\[activeStageRef, isFreeMascot, mascotPortalTarget\]/);
  assert.match(widget, /observer\.observe\(stage\)/);
  assert.match(widget, /observer\.disconnect\(\)/);
  assert.match(widget, /if \(isFreeMascot\) setStageSize\(\{ width: 0, height: 0 \}\)/);
});

test('Zurückholen ist über das eigene Maskottchen-Fach möglich; keine neue schwebende Steuerung', () => {
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  const chooser = readFileSync('src/components/ClassMascotSettingsPanel.tsx', 'utf8');
  assert.match(cockpit, /onRecenterMascot=\{recenterClassMascot\}/);
  assert.match(cockpit, /outerContainerRef\.current/);
  assert.match(cockpit, /const centered = cockpitWidgets\.some\(widget => widget\.type === "pet"\)/);
  assert.match(cockpit, /setApp\(prev => \(\{ \.\.\.prev, cockpitLayout: centered \}\)\)/);
  assert.match(chooser, /Maskottchen wiederfinden · mittig platzieren/);
  assert.match(chooser, /onClick=\{onRecenterMascot\}/);
  const app = readFileSync('src/App.tsx', 'utf8');
  assert.doesNotMatch(app, /<UnifiedFAB\s*\/>/);
  assert.doesNotMatch(app, /<VoiceCommander\s*\/>/);
});

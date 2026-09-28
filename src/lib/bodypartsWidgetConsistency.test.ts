import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function bodypartsSource() {
  const source = readFileSync('src/components/cockpit/CockpitWidgetContents.tsx', 'utf8');
  const start = source.indexOf('export const BodypartsWidgetContent');
  const end = source.indexOf('// ==========================================', start + 50);
  assert.ok(start >= 0 && end > start, 'BodypartsWidgetContent must exist');
  return source.slice(start, end);
}

test('bodyparts uses shared widget settings and safe atomic persistence', () => {
  const catalog = readFileSync('src/lib/cockpitWidgetCatalog.ts', 'utf8');
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  const source = bodypartsSource();

  assert.match(catalog, /COCKPIT_WIDGET_SETTINGS_IDS[\s\S]*"bodyparts",/);
  assert.match(cockpit, /case "bodyparts":[\s\S]*showSettings=\{widgetSettingsOpenId === widget\.id\}/);
  assert.match(cockpit, /w\.type === "bodyparts" && updates\.settings/);
  assert.match(source, /Körper-Entdecker-Einstellungen/);
});

test('bodyparts classroom surface is readable and touch friendly', () => {
  const source = bodypartsSource();

  assert.match(source, /min-h-11/);
  assert.match(source, /min-h-16/);
  assert.match(source, /text-lg font-black/);
  assert.doesNotMatch(source, /indigo-/);
  assert.doesNotMatch(source, /text-\[(?:6|6\.5|7|7\.5|8|8\.5|9|9\.5)px\]/);
  assert.doesNotMatch(source, /overflow-x-auto/);
});

test('bodyparts removes score gamification and disposable AudioContexts', () => {
  const source = bodypartsSource();

  assert.doesNotMatch(source, /quizScore|Punkte:/);
  assert.doesNotMatch(source, /AudioContext|createOscillator|triggerSound/);
  assert.doesNotMatch(source, /Quiz-Meister|🏆/);
  assert.match(source, /Bei einer falschen Antwort darfst du weiterprobieren/);
});

test('bodyparts no longer contains misleading legacy anatomy claims', () => {
  const source = readFileSync('src/lib/bodypartsWidgetModel.ts', 'utf8');

  assert.doesNotMatch(source, /Leber beim Spülen|unkaputtbare|halbes Tennisspielfeld|Banane zuerst|Giftstoffe ab/);
  assert.match(source, /Lungenbläschen/);
  assert.match(source, /Dünndarm werden viele Nährstoffe aufgenommen/);
  assert.match(source, /Skelett stützt den Körper/);
});

test('bodyparts has a larger board-first default and optimal size', () => {
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  const widget = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');

  assert.match(cockpit, /id: "widget-bodyparts",[\s\S]{0,180}w: 44,[\s\S]{0,80}h: 56/);
  assert.match(widget, /bodyparts: \{ w: 44, h: 56 \}/);
});

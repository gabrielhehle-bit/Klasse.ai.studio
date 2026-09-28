import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function mottoSource() {
  const source = readFileSync('src/components/cockpit/CockpitWidgetContents.tsx', 'utf8');
  const start = source.indexOf('export const DailyquotesWidgetContent');
  const end = source.indexOf('// NEW WIDGET 18:', start);
  assert.ok(start >= 0 && end > start, 'DailyquotesWidgetContent must exist');
  return source.slice(start, end);
}

test('morning motto uses the shared widget gear for setup', () => {
  const catalog = readFileSync('src/lib/cockpitWidgetCatalog.ts', 'utf8');
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  const source = mottoSource();

  assert.match(catalog, /COCKPIT_WIDGET_SETTINGS_IDS[\s\S]*"dailyquotes",/);
  assert.match(cockpit, /case "dailyquotes":[\s\S]*showSettings=\{widgetSettingsOpenId === widget\.id\}/);
  assert.match(source, /Morgen-Motto-Einstellungen/);
  assert.match(source, /Eigenes Motto/);
  assert.match(source, /KI-Vorschlag erstellen/);
});

test('morning motto keeps the classroom surface calm and readable', () => {
  const source = mottoSource();

  assert.match(source, /text-\[clamp\(0\.95rem,3\.6cqw,1\.35rem\)\]/);
  assert.match(source, /min-h-11 shrink-0 rounded-xl bg-accent/);
  assert.doesNotMatch(source, /Tägliches Morgen-Motto/);
  assert.doesNotMatch(source, /indigo-/);
  assert.doesNotMatch(source, /amber-/);
  assert.doesNotMatch(source, /text-\[8(?:\.5)?px\]/);
});

test('AI generation stays inside settings and never replaces the board with a loading card', () => {
  const source = mottoSource();

  assert.match(source, /showSettings && \(/);
  assert.match(source, /Es wird nur das gewählte Thema gesendet/);
  assert.doesNotMatch(source, /Lade\.\.\. 🪄/);
  assert.doesNotMatch(source, /Zauberkugel/);
});

test('morning motto persists custom text and has a roomier optimal size', () => {
  const model = readFileSync('src/lib/dailyQuotesWidgetModel.ts', 'utf8');
  const widget = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');

  assert.match(model, /customTitle: string/);
  assert.match(model, /customText: string/);
  assert.match(model, /useCustom: boolean/);
  assert.match(widget, /dailyquotes: \{ w: 34, h: 42 \}/);
  assert.match(cockpit, /id: "widget-dailyquotes",[\s\S]{0,150}w: 34,[\s\S]{0,50}h: 42/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function dictionarySource() {
  const source = readFileSync('src/components/cockpit/CockpitWidgetContents.tsx', 'utf8');
  const start = source.indexOf('export const DictionaryWidgetContent');
  const end = source.indexOf('// ==========================================', start + 20);
  assert.ok(start >= 0 && end > start, 'DictionaryWidgetContent must exist');
  return source.slice(start, end);
}

test('Bildwörterbuch nutzt die gemeinsame Zahnrad-Konfiguration', () => {
  const catalog = readFileSync('src/lib/cockpitWidgetCatalog.ts', 'utf8');
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  const source = dictionarySource();

  assert.match(catalog, /COCKPIT_WIDGET_SETTINGS_IDS[\s\S]*"dictionary",/);
  assert.match(cockpit, /case "dictionary":[\s\S]*showSettings=\{widgetSettingsOpenId === widget\.id\}/);
  assert.match(source, /Bildwörterbuch-Einstellungen/);
  assert.match(source, /Wortfeld/);
  assert.match(source, /Sprachhilfen/);
});

test('Bildwörterbuch ist touchfreundlich und folgt dem KLASSIO-Akzent', () => {
  const source = dictionarySource();

  assert.match(source, /min-h-11/);
  assert.match(source, /min-h-20/);
  assert.match(source, /bg-accent/);
  assert.match(source, /text-accent/);
  assert.doesNotMatch(source, /indigo-/);
  assert.doesNotMatch(source, /text-\[(?:5\.5|6\.5|7|7\.5|8|8\.5|9)px\]/);
});

test('Bildwörterbuch entfernt Streak-Gamification und automatische Quiz-Hektik', () => {
  const source = dictionarySource();

  assert.doesNotMatch(source, /bestStreak|setStreak|Aktuelle Serie|Beste Serie/);
  assert.doesNotMatch(source, /setTimeout\(\(\) => \{\s*startQuizRound/);
  assert.match(source, /Nächste Aufgabe/);
  assert.match(source, /Versuch es noch einmal/);
});

test('Kategorie gilt für Lernen und Zuordnen und Settings werden atomar gemerged', () => {
  const source = dictionarySource();
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');

  assert.match(source, /filterDictionaryCards\(settings\.category\)/);
  assert.match(source, /createDictionaryRound\(cards\)/);
  assert.match(source, /onUpdateRef\.current\(\{ settings: patch \}\)/);
  assert.match(cockpit, /w\.type === "dictionary" && updates\.settings/);
});

test('Bildwörterbuch hat eine besser lesbare Standard- und Optimalgröße', () => {
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  const widget = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');

  assert.match(cockpit, /id: "widget-dictionary",[\s\S]{0,160}w: 38,[\s\S]{0,60}h: 50/);
  assert.match(widget, /dictionary: \{ w: 38, h: 50 \}/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function sortingSource() {
  const source = readFileSync('src/components/cockpit/CockpitWidgetContents.tsx', 'utf8');
  const start = source.indexOf('export const SortingWidgetContent');
  const end = source.indexOf('// NEW WIDGET 17:', start);
  assert.ok(start >= 0 && end > start, 'SortingWidgetContent must exist');
  return source.slice(start, end);
}

test('sorting widget keeps setup behind the shared widget settings gear', () => {
  const catalog = readFileSync('src/lib/cockpitWidgetCatalog.ts', 'utf8');
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  const source = sortingSource();

  assert.match(catalog, /"sorting",/);
  assert.match(cockpit, /case "sorting":[\s\S]*showSettings=\{widgetSettingsOpenId === widget\.id\}/);
  assert.match(source, /Zahlensortierer-Einstellungen/);
  assert.doesNotMatch(source, /Zahlen-Sortierer \(Mathe\)/);
});

test('sorting widget uses the KLASSIO accent and large touch targets', () => {
  const source = sortingSource();

  assert.match(source, /bg-accent/);
  assert.match(source, /min-h-14 rounded-2xl/);
  assert.match(source, /aria-live="polite"/);
  assert.doesNotMatch(source, /indigo-/);
});

test('wrong answers preserve correct progress and explain the comparison', () => {
  const source = sortingSource();

  const wrongBranch = source.slice(
    source.indexOf('if (value !== nextExpected)'),
    source.indexOf('const updated = [...sorted, value]'),
  );
  assert.match(wrongBranch, /describeSortingMistake/);
  assert.doesNotMatch(wrongBranch, /setSorted\(\[\]\)/);
});

test('sorting widget reuses one audio context and cleans it up', () => {
  const source = sortingSource();

  assert.match(source, /audioContextRef\.current \|\| new AudioCtx\(\)/);
  assert.match(source, /audioContextRef\.current\.close\(\)/);
});

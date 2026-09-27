import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/components/cockpit/CockpitWidgetContents.tsx', 'utf8');
const start = source.indexOf('export const MathbalancerWidgetContent');
const end = source.indexOf('// 29. WIDGET: ANIMAL AUDIO MEMORY', start);
const widget = source.slice(start, end);

test('Gewichte-Waage bietet die korrekte Lösung immer als Antwort an', () => {
  assert.match(widget, /\.filter\(\(value\) => value !== unknownX\)/);
  assert.match(widget, /\[\.\.\.pool\.slice\(0, 7\), unknownX\]/);
  assert.match(widget, /answerChoices\.map/);
});

test('Gewichte-Waage nutzt den gemeinsamen KLASSIO-Akzent', () => {
  assert.doesNotMatch(widget, /indigo-/);
  assert.match(widget, /bg-accent hover:bg-accent-hover text-accent-text/);
  assert.match(widget, /border-accent/);
  assert.match(widget, /hover:bg-accent-soft/);
});

test('Gewichte-Waage hat keinen doppelten Innentitel und keine eigene Scrollfläche', () => {
  assert.doesNotMatch(widget, /Gewichte-Waagen-Trainer/);
  assert.doesNotMatch(widget, /overflow-y-auto/);
  assert.match(widget, /min-h-full w-full/);
  assert.match(widget, /overflow-visible/);
});

test('Gewichte-Waage hält alle Aktionen touchfreundlich', () => {
  assert.match(widget, /min-h-11 px-3 rounded-xl/);
  assert.match(widget, /min-h-11 text-center font-black/);
  assert.match(widget, /aria-label="Neue Gewichte-Waage erstellen"/);
  assert.match(widget, /aria-live="polite"/);
});

test('Gewichte-Waage behält semantische Rückmeldungen', () => {
  assert.match(widget, /bg-emerald-50/);
  assert.match(widget, /bg-amber-50/);
  assert.match(widget, /bg-rose-500/);
});

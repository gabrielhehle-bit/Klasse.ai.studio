import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/components/cockpit/CockpitWidgetContents.tsx', 'utf8');
const start = source.indexOf('export const EstimationjarWidgetContent');
const end = source.indexOf('// 15. WIDGET: REIM-MASCHINE', start);
const widget = source.slice(start, end);

test('Schätz-Glas nutzt gestaffelte Mengenbereiche mit passenden Schätzschritten', () => {
  assert.match(widget, /easy: \{ min: 10, max: 25, step: 1 \}/);
  assert.match(widget, /medium: \{ min: 25, max: 60, step: 5 \}/);
  assert.match(widget, /hard: \{ min: 60, max: 120, step: 5 \}/);
});

test('Schätz-Glas vermittelt eine echte Schätzstrategie', () => {
  assert.match(widget, /Schätz-Tipp:/);
  assert.match(widget, /Gruppen von 5 oder 10/);
  assert.match(widget, /clusterMarks/);
});

test('Schätz-Glas zeigt nach dem Auflösen Schätzung, Ist-Wert und Abweichung', () => {
  assert.match(widget, /Geschätzt/);
  assert.match(widget, /Tatsächlich/);
  assert.match(widget, /Abweichung/);
  assert.match(widget, /Math\.abs\(userGuess - jarCount\)/);
});

test('Schätz-Glas nutzt große Touchflächen und KLASSIO-Akzent', () => {
  assert.doesNotMatch(widget, /indigo-/);
  assert.match(widget, /min-h-11 rounded-xl bg-accent/);
  assert.match(widget, /bg-accent text-accent-text/);
  assert.match(widget, /min-h-11 rounded-xl border/);
});

test('Schätz-Glas besitzt keinen doppelten Innentitel und keine eigene Scrollfläche', () => {
  assert.doesNotMatch(widget, />\s*🫙 Schätz-Glas\s*</);
  assert.doesNotMatch(widget, /overflow-y-auto/);
  assert.match(widget, /min-h-full w-full/);
});

test('Schätz-Glas kündigt Feedback barrierearm an', () => {
  assert.match(widget, /aria-live="polite"/);
  assert.match(widget, /Schätzung prüfen/);
  assert.match(widget, /Neues Glas/);
});

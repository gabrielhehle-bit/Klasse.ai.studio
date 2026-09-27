import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/components/cockpit/CockpitWidgetContents.tsx', 'utf8');
const start = source.indexOf('export const MathpyramidWidgetContent');
const end = source.indexOf('// 12. WIDGET: MÜLL-TRENNER RECYCLING', start);
const widget = source.slice(start, end);

test('Mathe-Pyramide hält jede Schwierigkeitsstufe eindeutig lösbar', () => {
  assert.match(widget, /showIndices = \[3, 4, 5\]/);
  assert.match(widget, /showIndices = \[1, 2, 4\]/);
  assert.match(widget, /\[0, 1, 3\] : \[0, 2, 5\]/);
  assert.doesNotMatch(widget, /\[0, 4\] : \[1, 5\]/);
});

test('Mathe-Pyramide hält alle Werte im gewählten Zahlenraum', () => {
  assert.match(widget, /while \(top > r\)/);
  assert.match(widget, /top = b1 \+ 2 \* b2 \+ b3/);
});

test('Mathe-Pyramide trennt Vorgaben von geprüften Lösungen', () => {
  assert.match(widget, /const \[given, setGiven\]/);
  assert.match(widget, /const \[checked, setChecked\]/);
  assert.match(widget, /readOnly=\{isGiven \|\| \(hasBeenChecked && valueCorrect\)\}/);
});

test('Mathe-Pyramide akzeptiert nur numerische Eingaben und meldet fehlende Steine', () => {
  assert.match(widget, /inputMode="numeric"/);
  assert.match(widget, /replace\(\/\[\^0-9\]\/g, ''\)/);
  assert.match(widget, /Es fehlen noch/);
});

test('Mathe-Pyramide nutzt KLASSIO-Akzent, große Steine und touchfreundliche Steuerung', () => {
  assert.doesNotMatch(widget, /indigo-/);
  assert.match(widget, /min-h-14 sm:min-h-16/);
  assert.match(widget, /bg-accent text-accent-text/);
  assert.match(widget, /min-h-11 px-3 rounded-xl bg-accent/);
});

test('Mathe-Pyramide besitzt keinen doppelten Innentitel und kündigt Feedback barrierearm an', () => {
  assert.doesNotMatch(widget, />\s*🔺 Mathe-Pyramide\s*</);
  assert.match(widget, /aria-live="polite"/);
  assert.match(widget, /Regel: Zwei Nachbarsteine addieren/);
});


test('Mathe-Pyramide bietet Denk-Hilfe ohne die Lösung vorzugeben', () => {
  assert.match(widget, /const \[showHint, setShowHint\]/);
  assert.match(widget, /const hintForIndex =/);
  assert.match(widget, /Denk-Tipp:/);
  assert.match(widget, /Tipp ausblenden/);
  assert.match(widget, /aria-pressed=\{showHint\}/);
});

test('Mathe-Pyramide zeigt Legende und echten Lösungsfortschritt', () => {
  assert.match(widget, /Vorgegeben/);
  assert.match(widget, /Selbst rechnen/);
  assert.match(widget, /correctEditableCount/);
  assert.match(widget, /\{correctEditableCount\}\/\{editableIndices\.length\} gelöst/);
});

test('Mathe-Pyramide lässt sich per Enter prüfen', () => {
  assert.match(widget, /event\.key === 'Enter'/);
  assert.match(widget, /checkAnswer\(\)/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/components/cockpit/CockpitWidgetContents.tsx', 'utf8');
const start = source.indexOf('export const AngledetectiveWidgetContent');
const end = source.indexOf('// 15. WIDGET: REIM-MASCHINE', start);
const widget = source.slice(start, end);

test('Winkel-Detektiv trainiert schulgeeignete Winkel von 0 bis 180 Grad', () => {
  assert.match(widget, /max="180"/);
  assert.doesNotMatch(widget, /225|270|315/);
  assert.match(widget, /180/);
});

test('Winkel-Detektiv vermittelt Winkelarten ausdrücklich', () => {
  assert.match(widget, /spitzer Winkel/);
  assert.match(widget, /rechter Winkel/);
  assert.match(widget, /stumpfer Winkel/);
  assert.match(widget, /gestreckter Winkel/);
});

test('Winkel-Detektiv bietet abgestufte Schwierigkeit', () => {
  assert.match(widget, /type Level = 'basic' \| 'mixed' \| 'precise'/);
  assert.match(widget, /Grundwinkel/);
  assert.match(widget, /Gemischt/);
  assert.match(widget, /10°-Schritte/);
});

test('Winkel-Detektiv nutzt einen Halbkreis-Winkelmesser mit 0, 90 und 180 Grad', () => {
  assert.match(widget, /Halbkreis-Winkelmesser/);
  assert.match(widget, />0°</);
  assert.match(widget, />90°</);
  assert.match(widget, />180°</);
});

test('Winkel-Detektiv nutzt große Touchflächen, KLASSIO-Akzent und kein eigenes Scrollen', () => {
  assert.doesNotMatch(widget, /indigo-/);
  assert.doesNotMatch(widget, /overflow-y-auto/);
  assert.match(widget, /min-h-11 rounded-xl bg-accent/);
  assert.match(widget, /bg-accent text-accent-text/);
});

test('Winkel-Detektiv hat keinen doppelten Innentitel und barrierearmes Feedback', () => {
  assert.doesNotMatch(widget, />\s*📐 Winkel-Detektiv\s*</);
  assert.match(widget, /aria-live="polite"/);
});


test('Winkel-Detektiv lehrt Schätzen über die 90-Grad-Referenz', () => {
  assert.match(widget, /kleiner, genau oder größer als 90°/);
  assert.match(widget, /90 Grad Referenz/);
  assert.match(widget, /relationToRightAngle/);
});

test('Winkel-Detektiv macht die Schätzgüte nach der Lösung sichtbar', () => {
  assert.match(widget, /const estimateDiff =/);
  assert.match(widget, /Abweichung/);
  assert.match(widget, /estimateDiff <= 5/);
  assert.match(widget, /estimateDiff <= 15/);
  assert.match(widget, /bg-rose-50/);
});


test('Winkel-Detektiv erhält eine gemeinsame Fachwidget-Mindestgröße', () => {
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  const layout = readFileSync('src/components/cockpit/widgetLayout.ts', 'utf8');
  const frame = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');

  assert.match(cockpit, /id: "widget-angledetective",[\s\S]{0,180}w: 44,[\s\S]{0,80}h: 54/);
  assert.match(layout, /angledetective: \{ minW: 360, minH: 420, prefW: 520, prefH: 480 \}/);
  assert.match(frame, /angledetective: \{ w: 44, h: 54 \}/);
});

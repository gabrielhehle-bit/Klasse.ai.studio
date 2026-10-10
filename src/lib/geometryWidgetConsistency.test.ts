import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/components/cockpit/CockpitWidgetContents.tsx', 'utf8');
const start = source.indexOf('export const GeometryWidgetContent');
const end = source.indexOf('// NEW WIDGET 14:', start);
const widget = source.slice(start, end);

test('Geometrie-Muster nutzt fachlich saubere 2D/3D-Paare', () => {
  assert.match(widget, /Kreis'.*Kugel/s);
  assert.match(widget, /Quadrat'.*Würfel/s);
  assert.match(widget, /Rechteck'.*Quader/s);
  assert.match(widget, /Dreieck'.*Dreiecksprisma/s);
  assert.doesNotMatch(widget, /Stern \/ Prisma/);
});

test('Geometrie-Muster trennt Musterbau und 2D-3D-Vergleich', () => {
  assert.match(widget, /type Mode = 'pattern' \| 'compare'/);
  assert.match(widget, /Muster bauen/);
  assert.match(widget, /2D ↔ 3D/);
  assert.match(widget, /2D-Fläche/);
  assert.match(widget, /3D-Körper/);
});

test('Geometrie-Muster bietet sicheren Musterbau mit Undo statt nur Löschen', () => {
  assert.match(widget, /const removeLast =/);
  assert.match(widget, /Letzte zurück/);
  assert.match(widget, /Alles löschen/);
  assert.match(widget, /Form mittig setzen/);
});

test('Geometrie-Muster hält Platzierungen innerhalb der sichtbaren Fläche', () => {
  assert.match(widget, /Math\.min\(95, Math\.max\(5/);
  assert.match(widget, /Math\.min\(92, Math\.max\(8/);
});

test('Geometrie-Muster nutzt touchfreundliche Steuerung und KLASSIO-Akzent', () => {
  assert.doesNotMatch(widget, /indigo-/);
  assert.match(widget, /min-h-11 px-3 rounded-xl bg-accent/);
  assert.match(widget, /min-h-11 min-w-11 rounded-full/);
  assert.match(widget, /bg-accent text-accent-text/);
});

test('Geometrie-Muster besitzt keinen doppelten Innentitel und keine eigene Scrollfläche', () => {
  assert.doesNotMatch(widget, /Geometrie-Muster & 3D/);
  assert.doesNotMatch(widget, /overflow-y-auto/);
  assert.match(widget, /min-h-full w-full/);
});


test('Geometrie-Muster vermittelt Eigenschaften statt nur Formen zu zeigen', () => {
  assert.match(widget, /const properties: Record<ShapeType/);
  assert.match(widget, /4 Ecken/);
  assert.match(widget, /12 Kanten/);
  assert.match(widget, /eine gekrümmte Oberfläche/);
  assert.match(widget, /Beobachte:/);
});

test('Geometrie-Muster gibt im Kreativmodus einen echten Musterimpuls', () => {
  assert.match(widget, /Muster-Idee:/);
  assert.match(widget, /Kreis – Quadrat – Kreis – Quadrat/);
});


test('Geometrie-Muster erhält eine gemeinsame Fachwidget-Mindestgröße', () => {
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  const layout = readFileSync('src/components/cockpit/widgetLayout.ts', 'utf8');
  const frame = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');

  assert.match(cockpit, /id: "widget-geometry",[\s\S]{0,180}w: 46,[\s\S]{0,80}h: 58/);
  assert.match(layout, /geometry: \{ minW: 760, minH: 560, prefW: 800, prefH: 560 \}/);
  assert.match(frame, /geometry: \{ w: 46, h: 58 \}/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  cockpitWidgetSupportsSettings,
  getCockpitWidgetDisplayLabel,
} from './cockpitWidgetCatalog';

const widget = readFileSync('src/components/cockpit/widgets/FractionVisualizer.tsx', 'utf8');

test('Bruch-Visualisierer nutzt nur den gemeinsamen Widget-Titel', () => {
  assert.equal(getCockpitWidgetDisplayLabel('fractionvisualizer'), '◐ Bruch-Visualisierer');
  assert.equal(cockpitWidgetSupportsSettings('fractionvisualizer'), true);
  assert.doesNotMatch(widget, /<h3[^>]*>Bruch-Visualisierer<\/h3>/);
  assert.match(widget, /Einstellungen kommen ausschließlich über das gemeinsame Zahnrad/);
});

test('Bruch-Visualisierer folgt der KLASSIO-Akzentfarbe', () => {
  assert.doesNotMatch(widget, /indigo-/);
  assert.doesNotMatch(widget, /sky-(?:50|400|500|600)/);
  assert.match(widget, /bg-accent text-accent-text/);
  assert.match(widget, /text-accent/);
  assert.match(widget, /focus:stroke-accent/);
});

test('Bruch-Visualisierer erzeugt keine eigene vertikale Scrollfläche', () => {
  assert.doesNotMatch(widget, /overflow-y-auto/);
  assert.match(widget, /min-h-full w-full flex flex-col/);
  assert.match(widget, /overflow-visible/);
});

test('Bruch-Visualisierer hält Einstellungen und Direktaktionen touchfreundlich', () => {
  assert.match(widget, /aria-label="Bruchdarstellung einstellen"/);
  assert.match(widget, /aria-label="Bruch-Einstellungen schließen"/);
  assert.match(widget, /min-h-11 px-2\.5 py-1 text-xs font-semibold/);
  assert.match(widget, /min-h-11 px-2\.5 py-1 text-xs font-medium/);
  assert.match(widget, /w-11 h-11/);
});

test('Bruch-Visualisierer behält semantische Erfolgsfarbe für Gleichwertigkeit', () => {
  assert.match(widget, /bg-emerald-100/);
  assert.match(widget, /Gleichwertig/);
});

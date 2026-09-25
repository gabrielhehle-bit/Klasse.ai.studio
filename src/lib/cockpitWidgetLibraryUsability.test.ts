import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const css = readFileSync('src/index.css', 'utf8');

test('Widget-Bibliothek: Suche ist global und Kategorieauswahl beendet die Suche eindeutig', () => {
  assert.match(cockpit, /if \(nextSearch\.trim\(\)\) setActiveWidgetCategory\("categories"\)/);
  assert.match(cockpit, /setActiveWidgetCategory\(cat\.id\);\s*if \(widgetSearch\) setWidgetSearch\(""\)/);
  assert.match(cockpit, /Suche in allen Widgets: „\{widgetSearch\.trim\(\)\}“/);
  assert.match(cockpit, /\{filteredList\.length\} Treffer/);
});

test('Widget-Bibliothek: Such- und Variantenaktionen bleiben mindestens 44px hoch', () => {
  assert.match(cockpit, /aria-label="Widgetsuche leeren"[\s\S]*min-h-11 min-w-11/);
  assert.match(cockpit, /Favoriten-Ordner auswählen[\s\S]*min-h-11 max-w-52/);
  assert.match(cockpit, /className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-left text-xs font-semibold/);
  assert.doesNotMatch(cockpit, /aria-label="Widgetsuche leeren"[\s\S]{0,220}min-h-9 min-w-9/);
});

test('Widget-Bibliothek: Laptop nutzt zwei Spalten, Mobilansicht behält horizontale Kategorien', () => {
  assert.match(cockpit, /grid grid-cols-1 lg:grid-cols-2 gap-2\.5 pb-1/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.klassio-widget-library-sidebar \{[\s\S]*display: flex;[\s\S]*overflow-x: auto;[\s\S]*overflow-y: hidden;/);
  assert.match(css, /\.klassio-widget-library-sidebar > button \{[\s\S]*width: max-content !important;[\s\S]*flex: 0 0 auto;/);
});

test('Widget-Bibliothek: leere Zustände bleiben normal lesbar', () => {
  assert.match(cockpit, /Ordner "\{currentResolvedFolder\}" ist leer/);
  assert.match(cockpit, /Keine passenden Widgets gefunden/);
  assert.match(cockpit, /mt-1 max-w-sm text-xs leading-relaxed/);
  assert.doesNotMatch(cockpit, /text-\[7\.5px\] mt-1 max-w-\[240px\]/);
});

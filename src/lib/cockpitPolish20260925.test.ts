import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const surface = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const dock = readFileSync('src/components/cockpit/CockpitWidgetDock.tsx', 'utf8');
const widget = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');
const css = readFileSync('src/index.css', 'utf8');

test('cockpit keeps template creation visible while reducing themed outer frame', () => {
  assert.match(surface, /Vorlage erstellen/);
  assert.match(surface, /setVorlagenStartTab\("create"\)/);
  assert.match(surface, /overflow-hidden flex flex-col p-1 sm:p-1\.5 gap-1/);
  assert.match(surface, /min-h-\[46px\] py-1/);
  assert.match(surface, /klassio-whiteboard flex-1 relative/);
});

test('fullscreen is a direct top-level classroom control, not hidden only in options', () => {
  assert.match(surface, /aria-label=\{isFullscreen \? "Vollbild beenden" : "Vollbild öffnen"\}/);
  assert.match(surface, /onClick=\{toggleFullscreen\}/);
  assert.match(surface, /\{isFullscreen \? <Minimize size=\{14\} \/> : <Maximize size=\{14\} \/>\}/);
});

test('writing tools float vertically instead of consuming teaching-board height', () => {
  assert.match(surface, /klassio-board-toolbox absolute left-2 top-14/);
  assert.match(surface, /klassio-board-toolbox absolute left-2 top-14/);
  assert.match(surface, /aria-label="Schreiben und Papier"/);
  assert.match(css, /\.klassio-cockpit-shell \.klassio-board-toolbox/);
});

test('student list has an always-discoverable right-edge tab with real class count', () => {
  assert.match(surface, /klassio-student-edge-tab/);
  assert.match(surface, /aria-label="Schülerliste einblenden"/);
  assert.match(surface, /\{app\.schueler\?\.length \|\| 0\}/);
  assert.match(surface, /changeSidebarMode\(prevSidebarMode \|\| "expanded"\)/);
});

test('dock floats above the board and favorites can be removed quickly', () => {
  assert.match(css, /\.klassio-cockpit-shell \.klassio-dock-row \{[\s\S]*?margin-top: -60px/);
  assert.match(dock, /onContextMenu=\{event =>/);
  assert.match(dock, /Rechtsklick entfernt den Favoriten/);
  assert.match(dock, /aria-label="Weitere Widgets hinzufügen"/);
});

test('minimize is session-local and never closes widget state or changes its rectangle', () => {
  assert.match(widget, /onMinimize\?: \(\) => void/);
  assert.match(widget, /<Minus size=\{14\} \/>/);
  assert.match(widget, /<span>Minimieren<\/span>/);
  assert.match(surface, /const \[minimizedWidgetIds, setMinimizedWidgetIds\] = useState<string\[\]>\(\[\]\)/);
  assert.match(surface, /!minimizedWidgetIds\.includes\(w\.id\)/);
  assert.match(surface, /onMinimize=\{\(\) => setMinimizedWidgetIds/);
  assert.match(dock, /aria-label="Minimierte Widgets"/);
  assert.doesNotMatch(dock, /cockpitLayout\s*:/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  COMPACT_COCKPIT_SIDEBAR_WIDTH,
  COCKPIT_SIDEBAR_DOCK_GAP,
  getCockpitSidebarReservedRightPx,
} from './cockpitSidebarLayout';

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

test('dock floats above the board and favorites are removed only through deliberate edit UI', () => {
  assert.match(css, /\.klassio-cockpit-shell \.klassio-dock-row \{[\s\S]*?margin-top: -60px/);
  assert.doesNotMatch(dock, /onContextMenu=\{event =>/);
  assert.match(dock, /removeCockpitQuickbarItem\(current, id\)/);
  assert.match(dock, /Ja, entfernen/);
  assert.match(dock, /role="tab"/);
  assert.match(dock, /Widget hinzufügen/);
  assert.match(dock, /if \(event\.key === 'Escape'\) setEditing\(false\)/);
  assert.match(dock, /w-max max-w-full/);
  assert.doesNotMatch(dock, /indigo-/);
  assert.match(css, /background-color: var\(--accent\) !important/);
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


test('open widgets use semantic accent, obvious focus and safe touch resizing', () => {
  assert.match(widget, /data-widget-focused=\{isFocused \? "true" : "false"\}/);
  assert.match(widget, /data-widget-interacting=\{isDragging \? "dragging" : isResizing \? "resizing" : undefined\}/);
  assert.doesNotMatch(widget, /indigo-/);
  assert.match(widget, /aria-label="Widget-Größe ändern"/);
  assert.match(widget, /onKeyDown=\{handleResizeKeyDown\}/);
  assert.match(widget, /Tafelfläche/);
  assert.match(css, /cockpit-widget-container\[data-widget-focused="true"\]/);
  assert.match(css, /@container \(max-width: 260px\)/);
});

test('dock follows the real board width, condenses favorites and keeps system controls separate', () => {
  assert.equal(getCockpitSidebarReservedRightPx('hidden', 420), 0);
  assert.equal(
    getCockpitSidebarReservedRightPx('mini', 620),
    COMPACT_COCKPIT_SIDEBAR_WIDTH + COCKPIT_SIDEBAR_DOCK_GAP,
  );
  assert.equal(getCockpitSidebarReservedRightPx('expanded', 420), 420 + COCKPIT_SIDEBAR_DOCK_GAP);
  assert.ok(surface.includes('width: sidebarMode === "mini" ? COMPACT_COCKPIT_SIDEBAR_WIDTH'));
  assert.ok(surface.includes('reservedRightPx={getCockpitSidebarReservedRightPx('));
  assert.match(dock, /data-board-right-inset/);
  assert.match(dock, /favorites\.length <= 8/);
  assert.match(dock, /showFavoriteLabels/);
  assert.match(dock, /klassio-dock-system/);
  assert.match(dock, /data-dock-favorite-id/);
  assert.match(dock, /setPointerCapture/);
  assert.match(dock, /touch-none select-none cursor-grab/);
  assert.match(dock, /moveCockpitQuickbarItem\(current, item\.id, -1\)/);
});

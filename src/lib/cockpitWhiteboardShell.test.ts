import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_COCKPIT_SIDEBAR_WIDTH, clampCockpitSidebarWidth, resizeCockpitSidebarWidth } from './cockpitSidebarLayout';

const board = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const dock = readFileSync('src/components/cockpit/CockpitWidgetDock.tsx', 'utf8');
const css = readFileSync('src/index.css', 'utf8');

test('new teaching cockpit keeps the main whiteboard free and moves widget favorites below it', () => {
  assert.match(board, /klassio-cockpit-shell fixed inset-0/);
  assert.match(board, /klassio-whiteboard flex-1 relative/);
  assert.match(board, /min-h-0 \$\{isBoardTextEditing/);
  assert.doesNotMatch(board, /h-full w-full min-h-\[460px\]/);
  assert.match(board, /<CockpitWidgetDock[\s\S]*?onAddWidget=/);
  assert.doesNotMatch(board, /aria-label="Zusätzliche Widget-Leiste"/);
  assert.match(board, /fixed left-1\/2 -translate-x-1\/2 bottom-\[5\.5rem\] top-auto/);
  assert.match(css, /\.klassio-cockpit-shell \.klassio-whiteboard/);
  assert.match(css, /background-color: #ffffff !important;/);
});

test('shared writing surface can draw and erase, without overwriting widget layouts', () => {
  assert.match(board, /const \[boardTool, setBoardTool\] = useState<'select' \| 'text' \| 'pen' \| 'erase'>/);
  assert.match(board, /active=\{boardTool === "pen" \|\| boardTool === "erase"\}/);
  assert.match(board, /externalTool=\{boardTool === "erase" \? "erase" : "pen"\}/);
  assert.match(board, /onChange=\{saveBoardInkItems\}/);
  assert.match(board, /onDone=\{\(\) => setBoardTool\('select'\)\}/);
  assert.match(board, /onClick=\{\(\) => setShowBoardTools\(open => !open\)\}/);
});

test('right student list stays class-local, resizable, visible on touch, and uses existing public list', () => {
  assert.equal(DEFAULT_COCKPIT_SIDEBAR_WIDTH, 420);
  assert.equal(clampCockpitSidebarWidth(undefined), 420);
  assert.equal(clampCockpitSidebarWidth(NaN), 420);
  assert.equal(clampCockpitSidebarWidth(150), 300);
  assert.equal(clampCockpitSidebarWidth(900), 620);
  assert.equal(resizeCockpitSidebarWidth(420, 100, 50), 470);
  assert.equal(resizeCockpitSidebarWidth(420, 100, 150), 370);
  assert.match(board, /const sidebarMode = app\.boardSettings\?\.sidebarMode \|\| "hidden"/);
  assert.match(board, /cockpitStudentSidebarWidthByClass/);
  assert.match(board, /sidebarResizePreview \?\? sidebarPreferredWidth/);
  assert.match(board, /onPointerDown=\{handleSidebarResizeStart\}/);
  assert.match(board, /aria-label="Schülerliste schließen"/);
  assert.match(board, /<StudentListWidgetContent[\s\S]*?sidebarCompact=\{sidebarMode === "mini"\}/);
  assert.match(dock, /onToggleSidebar/);
  assert.match(css, /@media \(max-width: 960px\)/);
  assert.doesNotMatch(board, /const adaptSidebarToViewport/);
});

test('existing widget layout and encrypted board settings remain the only source of truth', () => {
  assert.match(board, /cockpitWidgets\.filter\(widget => widget\.visible\)/);
  assert.match(board, /cockpitLayout: updated/);
  assert.match(board, /loadAndSanitizeLayout\(app\.cockpitLayout\)/);
  assert.match(board, /\[boardTextClassKey\]: finalWidth/);
  assert.doesNotMatch(dock, /setApp\(|localStorage|cockpitLayout\s*:/);
});

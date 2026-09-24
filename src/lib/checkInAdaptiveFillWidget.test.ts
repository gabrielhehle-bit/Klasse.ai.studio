import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getStudentGridLayout } from './studentWidgetGrid';
import { getAdaptiveCheckInOptions, getCheckInPageLayout, shouldShowCheckInSummary } from './checkInWidgetLayout';

const source = readFileSync('src/components/cockpit/widgets/KidAttendanceWidget.tsx', 'utf8');

test('Compact 17-child widget reclaims header/footer and uses full grid height before paging', () => {
  const options = getAdaptiveCheckInOptions(480, 420);
  assert.equal(options.compactControls, true);
  assert.ok(options.grid.minCardHeight >= 44, 'Never trade touch safety for a smaller font');
  const grid = getStudentGridLayout(480, 420, 17, options.grid);
  assert.equal(grid.fits, true);
  assert.equal(shouldShowCheckInSummary(480, grid.fits, 420), false);
  assert.ok(grid.columns * grid.rows >= 17);
  assert.match(source, /gridTemplateRows: `repeat\(\$\{studentGrid\.rows\}, minmax\(0, 1fr\)\)`/);
  assert.match(source, /style=\{\{ height: '100%', minHeight: adaptiveLayout\.grid\.minCardHeight \}\}/);
  assert.match(source, /\{!compactControls && <div\s+className=\{\`px-3 py-2/);
});

test('When 17 pupils cannot fit, small widget shows reachable non-scrolling pages INSIDE its own frame', () => {
  const options = getAdaptiveCheckInOptions(280, 220);
  const grid = getStudentGridLayout(280, 220, 17, options.grid);
  assert.equal(grid.fits, false);
  assert.equal(shouldShowCheckInSummary(280, grid.fits, 220), false);
  const first = getCheckInPageLayout(280, 220, 17, 0, options.pages);
  assert.equal(first.canRender, true);
  assert.ok(first.pageSize >= 1);
  assert.ok(first.pageCount > 1);
  const last = getCheckInPageLayout(280, 220, 17, 999, options.pages);
  assert.equal(last.currentPage, first.pageCount - 1);
  assert.ok(last.start < 17);
  assert.match(source, /\) : pageLayout\.canRender \? \(/);
  assert.match(source, /visiblePageStudents\.map\(\(student\) => renderStudentCard\(student,/);
  assert.match(source, /gridTemplateRows: `repeat\(\$\{pageRows\}, minmax\(0, 1fr\)\)`/);
  assert.match(source, /aria-label="Vorherige Schülerseite"/);
  assert.match(source, /aria-label="Nächste Schülerseite"/);
});

test('Smartboard stays legible, teacher correction and voluntary mood are kept private', () => {
  const wide = getAdaptiveCheckInOptions(1280, 690);
  assert.equal(wide.compactControls, false);
  assert.equal(getStudentGridLayout(1280, 690, 25, wide.grid).fits, true);
  assert.match(source, /aria-label="Anwesenheit bearbeiten: Da, Fehlt oder Entschuldigt"/);
  assert.match(source, /status === 'absent'\s*\? `\$\{displayName\} ist bereits als abwesend erfasst`/);
  assert.match(source, /activeMoodStudent && renderChildMoodModal\(\)/);
  assert.match(source, /recordStudentMood\(prev, studentId, value, todayStr\)/);
  assert.doesNotMatch(source, /setApp\(.*?dummy|createTestStudents/);
});

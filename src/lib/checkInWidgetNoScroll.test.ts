import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getStudentGridLayout } from './studentWidgetGrid';
import { CHECK_IN_GRID_OPTIONS, shouldShowCheckInSummary } from './checkInWidgetLayout';

const source = readFileSync('src/components/cockpit/widgets/KidAttendanceWidget.tsx', 'utf8');

test('Ich bin da: compact always shows a summary, never a clipped student list', () => {
  assert.equal(shouldShowCheckInSummary(340, false), true);
  assert.equal(shouldShowCheckInSummary(340, true), true);
  assert.equal(shouldShowCheckInSummary(500, false), true);
  assert.equal(shouldShowCheckInSummary(900, false), false);
  assert.equal(shouldShowCheckInSummary(900, true), false);
  assert.match(source, /if \(showCompactSummary\)/);
  assert.match(source, /Alle Kinder öffnen/);
  assert.match(source, /disabled=\{!onUpdate\}/);
  assert.doesNotMatch(source, /isCompactCheckInOpen/);
});

test('Ich bin da: 25 pupils fit with 64px cards and actionable names on 1280×690 Smartboard area', () => {
  const grid = getStudentGridLayout(1280, 690, 25, CHECK_IN_GRID_OPTIONS);
  assert.equal(grid.fits, true);
  assert.ok(grid.columns * grid.rows >= 25);
  assert.ok(grid.cardHeight >= CHECK_IN_GRID_OPTIONS.minCardHeight);
  assert.equal(getStudentGridLayout(340, 360, 25, CHECK_IN_GRID_OPTIONS).fits, false);
  assert.match(source, /students\.map\(\(student\) => renderStudentCard\(student\)\)/);
  assert.match(source, /min-h-\[64px\] px-2 py-1/);
  assert.match(source, /minHeight: 64, height: Math\.min\(96, studentGrid\.cardHeight\)/);
  assert.match(source, /whitespace-normal break-words font-black leading-tight/);
});

test('Ich bin da: compact 25-child view has no internal scrolling and keeps teacher/mood flows', () => {
  const compact = source.slice(source.indexOf('if (showCompactSummary)'), source.indexOf('// AUSREICHEND GROSSE ANSICHT'));
  assert.match(compact, /summary\.present/);
  assert.match(compact, /summary\.open/);
  assert.match(compact, /summary\.absent/);
  assert.match(compact, /expandStudentGrid/);
  assert.doesNotMatch(compact, /overflow-y-auto|overflow-auto|no-scrollbar|students\.map/);
  assert.match(source, /activeMoodStudent && renderChildMoodModal\(\)/);
  assert.match(source, /isTeacherModalOpen && renderTeacherModal\(\)/);
  assert.match(source, /isFinalizeModalOpen && renderFinalizeModal\(\)/);
  assert.match(source, /document\.addEventListener\('visibilitychange', refreshToday\)/);
});

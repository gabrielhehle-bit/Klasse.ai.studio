import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getCheckInPreferences } from './checkInWidgetMode';
import { getStudentGridLayout } from './studentWidgetGrid';
import { CHECK_IN_GRID_OPTIONS } from './checkInWidgetLayout';

const widget = readFileSync('src/components/cockpit/widgets/KidAttendanceWidget.tsx', 'utf8');
const picker = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const frame = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');

test('Widget 1: 17 actual children fit into a typical wide classroom widget', () => {
  const grid = getStudentGridLayout(1200, 390, 17, CHECK_IN_GRID_OPTIONS);
  assert.equal(grid.fits, true);
  assert.ok(grid.rows * grid.columns >= 17);
  assert.ok(grid.cardHeight >= 64);
  assert.equal(getStudentGridLayout(340, 360, 25, CHECK_IN_GRID_OPTIONS).fits, false);
});

test('Widget 1: safe defaults and unknown stored values survive old layouts', () => {
  assert.deepEqual(getCheckInPreferences(undefined), {
    checkInMode: 'all',
    moodEnabled: true,
    startSize: 'large',
  });
  assert.deepEqual(getCheckInPreferences({ checkInMode: 'teacher', moodEnabled: false, startSize: 'compact' }), {
    checkInMode: 'teacher', moodEnabled: false, startSize: 'compact',
  });
  assert.deepEqual(getCheckInPreferences({ checkInMode: 'unknown', startSize: 'unknown' }), {
    checkInMode: 'all', moodEnabled: true, startSize: 'large',
  });
});

test('Widget 1: central library gear saves class-local defaults separately from installed instances', () => {
  assert.match(picker, /aria-label="Widget-Voreinstellungen öffnen"/);
  assert.match(picker, /<option value="kidattendance">🖐️ Ich bin da!<\/option>/);
  assert.match(picker, /data-widget-card-action="primary"/);
  assert.match(picker, /handleOpenWidgetInCockpitLayout\(primaryType as CockpitWidgetConfig\["type"\]\)/);
  assert.match(picker, /cockpitCheckInDefaultsByClass/);
  assert.match(picker, /selectedWidgetConfiguration === "kidattendance"/);
  assert.match(picker, /Auf vorhandenes Widget anwenden/);
  assert.match(picker, /checkInDefaults\.moodEnabled/);
  assert.match(picker, /type === "kidattendance" && !useOld/);
  assert.match(picker, /checkInSize\.w/);
});

test('Widget 1: expanding is ephemeral and restored without saving new widget coordinates', () => {
  const expand = widget.slice(widget.indexOf('const expandStudentGrid'), widget.indexOf('const denseStudentGrid'));
  assert.match(expand, /klassio:checkin-expand/);
  assert.doesNotMatch(expand, /onUpdate\?\.\(\{ x:|onUpdate\(\{ x:/);
  assert.match(frame, /klassio:checkin-expand/);
  assert.match(frame, /setIsMaximized\(detail\.expanded\)/);
  assert.match(widget, /collapseStudentGrid/);
});

test('Widget 1: attendance remains independent from optional voluntary mood', () => {
  assert.match(widget, /if \(!moodEnabled\) \{\s*setSelectedStudentId\(null\);\s*return;/);
  assert.match(widget, /checkInStudent\(app, studentId, todayStr\)/);
  assert.match(widget, /recordStudentMood\(prev, studentId, value, todayStr\)/);
});

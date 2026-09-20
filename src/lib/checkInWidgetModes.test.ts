import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getCheckInMode } from './checkInWidgetMode';

const widget = readFileSync('src/components/cockpit/widgets/KidAttendanceWidget.tsx', 'utf8');
const wrapper = readFileSync('src/components/cockpit/KidAttendanceWidgetContent.tsx', 'utf8');
const surface = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const frame = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');

test('A is the default for new and legacy/unknown settings, B and C remain stable across saved JSON', () => {
  assert.equal(getCheckInMode(undefined), 'all');
  assert.equal(getCheckInMode({}), 'all');
  assert.equal(getCheckInMode({ checkInMode: 'unrecognized' }), 'all');
  assert.equal(getCheckInMode({ checkInMode: 'individual' }), 'individual');
  assert.equal(getCheckInMode({ checkInMode: 'teacher' }), 'teacher');
});

test('Settings are accessible solely via the existing three-dot menu beside the widget title', () => {
  assert.match(frame, /aria-label="Widget-Menü öffnen"/);
  assert.match(surface, /"drawing",\s*"kidattendance",\s*\]\.includes\(widget\.type\)/);
  const caseText = surface.slice(surface.indexOf('case "kidattendance":'), surface.indexOf('case "groups":'));
  assert.match(caseText, /showSettings=\{widgetSettingsOpenId === widget\.id\}/);
  assert.match(caseText, /onCloseSettings=\{\(\) => setWidgetSettingsOpenId\(null\)\}/);
  assert.match(wrapper, /<KidAttendanceWidget \{\.\.\.props\} \/>/);
  assert.match(widget, /showSettings && renderCheckInSettings\(\)/);
  assert.match(widget, /aria-label="Ich bin da Einstellungen"/);
  assert.doesNotMatch(widget, /aria-label="Widget-Einstellungen öffnen"/);
});

test('A/B/C uses the same attendance and mood model; teacher mode never checks in by a child tap', () => {
  assert.match(widget, /\['all', 'A · Alle Kinder'/);
  assert.match(widget, /\['individual', 'B · Nacheinander'/);
  assert.match(widget, /\['teacher', 'C · Lehrkraft erfasst'/);
  assert.match(widget, /settings: \{ \.\.\.\(widget\?\.settings \|\| \{\}\), checkInMode: mode \}/);
  const childTap = widget.slice(widget.indexOf('const handleStudentCardTap'), widget.indexOf('// Kind wählt einen der 5 Smileys'));
  assert.match(childTap, /checkInMode === 'teacher'/);
  assert.match(childTap, /currentStatus\.status !== 'present'/);
  assert.match(childTap, /setActiveMoodStudent/);
  assert.match(childTap, /return;\s*}\s*if \(checkInMode === 'individual'/);
  assert.match(childTap, /setSelectedStudentId\(studentId\)/);
  assert.match(childTap, /checkInStudent\(app, studentId, todayStr\)/);
  assert.match(widget, /renderStudentCard\(students\.find\(child => child\.id === selectedStudentId\)!\)/);
  assert.match(widget, /disabled=\{status === 'absent' \|\| \(checkInMode === 'teacher' && status !== 'present'\)\}/);
  assert.match(widget, /teacherSetStudentPresent\(prev, studentId, todayStr\)/);
  assert.match(widget, /recordStudentMood\(prev, studentId, value, todayStr\)/);
});

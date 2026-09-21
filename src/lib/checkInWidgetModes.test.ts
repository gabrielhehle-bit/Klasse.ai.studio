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

test('Widget settings belong in Widget hinzufügen, not the floating header or child widget', () => {
  assert.match(surface, /<span>Widget hinzufügen<\/span>/);
  assert.match(surface, /aria-label="Widget-Einstellungen im Menü Widget hinzufügen"/);
  assert.match(surface, /aria-label="Widget für Einstellungen"/);
  assert.match(surface, /onChange=\{\(\) => saveSetting\("checkInMode", mode\)\}/);
  assert.match(surface, /onChange=\{\(\) => saveSetting\("studentScope", scope\)\}/);
  assert.match(surface, /settings: \{ \.\.\.\(configured\.settings \|\| \{\}\), \[key\]: value \}/);
  const caseText = surface.slice(surface.indexOf('case "kidattendance":'), surface.indexOf('case "groups":'));
  assert.doesNotMatch(caseText, /showSettings=|onCloseSettings=/);
  assert.match(wrapper, /<KidAttendanceWidget \{\.\.\.props\} \/>/);
  assert.doesNotMatch(widget, /renderCheckInSettings|showSettings/);
  assert.doesNotMatch(frame, /Widget hinzufügen/); // no duplicate menu inside a widget
});

test('A/B/C uses the same attendance and mood model; teacher mode never checks in by a child tap', () => {
  assert.match(surface, /\["all", "A · Alle Kinder \(Standard\)"/);
  assert.match(surface, /\["individual", "B · Nacheinander"/);
  assert.match(surface, /\["teacher", "C · Lehrkraft erfasst"/);
  assert.match(surface, /saveSetting\("checkInMode", mode\)/);
  const childTap = widget.slice(widget.indexOf('const handleStudentCardTap'), widget.indexOf('// Kind wählt einen der 5 Smileys'));
  assert.match(childTap, /checkInMode === 'teacher'/);
  assert.match(childTap, /currentStatus\.status !== 'present'/);
  assert.match(childTap, /setActiveMoodStudent/);
  assert.match(childTap, /return;\s*}\s*if \(checkInMode === 'individual'/);
  assert.match(childTap, /setSelectedStudentId\(studentId\)/);
  assert.match(childTap, /checkInStudent\(app, studentId, todayStr\)/);
  assert.match(widget, /renderStudentCard\(students\.find\(child => child\.id === selectedStudentId\)!\)/);
  assert.match(widget, /disabled=\{status === 'absent' \|\| \(checkInMode === 'teacher' && \(status !== 'present' \|\| !moodEnabled\)\)\}/);
  assert.match(widget, /teacherSetStudentPresent\(prev, studentId, todayStr\)/);
  assert.match(widget, /recordStudentMood\(prev, studentId, value, todayStr\)/);
});

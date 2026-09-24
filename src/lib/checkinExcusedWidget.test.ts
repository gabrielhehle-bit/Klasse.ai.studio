import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialAppState } from './appState';
import {
  getStudentAbsenceCode, getStudentAttendanceStatus, teacherSetStudentAbsent,
  teacherSetStudentPresent, teacherResetStudentToOpen, computeKidAttendanceSummary,
} from './kidAttendanceAlgorithm';

const DATE = '2026-09-24';
const pupil = { id: 'student-1', vorname: 'Kind', nachname: 'A' };
const state = { ...initialAppState, activeClassId: 'my-class', schueler: [pupil],
  anwesenheit: { 'student-1': { '2026-09-23': { '1': 'a' } } },
} as any;

test('teacher can select Entschuldigt, switch from Fehlt, and see the saved excused code after reload', () => {
  const unexcused = teacherSetStudentAbsent(state, pupil.id, DATE, ['1', '2'], 'u');
  assert.equal(getStudentAbsenceCode(pupil.id, unexcused, DATE), 'u');
  const excused = teacherSetStudentAbsent(unexcused, pupil.id, DATE, ['1', '2'], 'e');
  const restored = JSON.parse(JSON.stringify(excused));
  assert.equal(getStudentAbsenceCode(pupil.id, restored, DATE), 'e');
  assert.equal(getStudentAttendanceStatus(pupil.id, restored, DATE).status, 'absent');
  assert.deepEqual(restored.anwesenheit[pupil.id][DATE], { '1': 'e', '2': 'e' });
  assert.deepEqual(restored.anwesenheit[pupil.id]['2026-09-23'], { '1': 'a' });
  assert.equal(computeKidAttendanceSummary([pupil as any], restored, DATE).absent, 1);
});

test('changing an excused entry to Da or Offen only updates the specified day', () => {
  const excused = teacherSetStudentAbsent(state, pupil.id, DATE, ['1', '2'], 'e');
  const present = teacherSetStudentPresent(excused, pupil.id, DATE, ['1', '2']);
  assert.equal(getStudentAbsenceCode(pupil.id, present, DATE), null);
  assert.equal(getStudentAttendanceStatus(pupil.id, present, DATE).status, 'present');
  const reset = teacherResetStudentToOpen(excused, pupil.id, DATE);
  assert.equal(getStudentAttendanceStatus(pupil.id, reset, DATE).status, 'open');
  assert.deepEqual(reset.anwesenheit[pupil.id]['2026-09-23'], { '1': 'a' });
  const mixed = { ...state, anwesenheit: { [pupil.id]: { [DATE]: { '1': 'e', '2': 'u' } } } } as any;
  assert.equal(getStudentAbsenceCode(pupil.id, mixed, DATE), 'u');
  assert.equal(getStudentAbsenceCode(pupil.id, state, DATE), null);
});

test('both responsive teacher modal and finalize dialog offer a visible, labelled Entschuldigt action', () => {
  const ui = readFileSync('src/components/cockpit/widgets/KidAttendanceWidget.tsx', 'utf8');
  assert.equal((ui.match(/createPortal\(renderTeacherModal\(\), document\.body\)/g) || []).length, 2);
  assert.match(ui, /role="dialog" aria-modal="true" aria-label="Lehrer-Anwesenheitskorrektur"/);
  assert.match(ui, /grid w-full grid-cols-3 gap-2/);
  assert.match(ui, /aria-label="Anwesenheit bearbeiten: Da, Fehlt oder Entschuldigt"/);
  const compact = ui.slice(ui.indexOf('if (showCompactSummary)'), ui.indexOf('// AUSREICHEND GROSSE ANSICHT'));
  assert.match(compact, /setIsTeacherModalOpen\(true\)/);
  assert.match(compact, /Da · Fehlt · Entschuldigt/);
  assert.match(ui, /aria-pressed=\{status === 'absent' && absenceCode === 'e'\}/);
  assert.match(ui, /getStudentAbsenceCode\(student\.id, app, todayStr\)/);
  assert.match(ui, /absenceCode === 'e' \? '✓ Entschuldigt'/);
  assert.equal((ui.match(/handleTeacherSetAbsent\(student\.id, 'e'\)/g) || []).length, 2);
  assert.match(ui, /Offenen Check-in für/);
  assert.match(ui, /grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-3/);
  assert.match(ui, /prev\.activeClassId === app\.activeClassId && prev\.schueler\?\.some/);
  const pupilCards = ui.slice(ui.indexOf('const renderStudentCard ='), ui.indexOf('// KLEINE WIDGET-FLÄCHE:'));
  assert.doesNotMatch(pupilCards, /getStudentAbsenceCode|Entschuldigt/);
});

test('the three principal teacher choices stay in one visible row, while pupil cards never reveal absence reasons', () => {
  const ui = readFileSync('src/components/cockpit/widgets/KidAttendanceWidget.tsx', 'utf8');
  const teacherButtons = ui.slice(ui.indexOf('{/* Lehrer-Korrekturknöpfe */}'), ui.indexOf('{/* Lehrkraft Befindens-Verwaltung'));
  const firstThree = teacherButtons.slice(0, teacherButtons.indexOf('onClick={() => handleTeacherResetToOpen'));
  assert.match(firstThree, /grid w-full grid-cols-3 gap-2/);
  assert.match(firstThree, /handleTeacherSetPresent\(student.id\)/);
  assert.match(firstThree, /handleTeacherSetAbsent\(student.id, 'u'\)/);
  assert.match(firstThree, /handleTeacherSetAbsent\(student.id, 'e'\)/);
  assert.match(teacherButtons, /aria-pressed=\{status === 'absent' && absenceCode === 'e'\}/);
  const pupilCards = ui.slice(ui.indexOf('const renderStudentCard ='), ui.indexOf('// KLEINE WIDGET-FLÄCHE:'));
  assert.doesNotMatch(pupilCards, /getStudentAbsenceCode|Entschuldigt/);
  assert.match(pupilCards, /statusLabel = 'Abwesend'/);
});

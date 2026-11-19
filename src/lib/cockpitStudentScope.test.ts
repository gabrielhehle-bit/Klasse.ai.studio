import test from 'node:test';
import assert from 'node:assert/strict';
import type { AppState, Student } from '../types';
import { getCockpitStudentPool, normalizeCockpitStudentScope } from './cockpitStudentScope';
import { checkInStudent, teacherSetStudentAbsent, teacherResetStudentToOpen } from './kidAttendanceAlgorithm';
import { getGroupWidgetPreferences } from './groupWidgetPreferences';

const date = '2026-11-19';
const roster = ['da', 'offen', 'abwesend'].map(id => ({ id, vorname: id } as Student));
const app = { schueler: roster, anwesenheit: {
  da: { [date]: { 1: 'a' } },
  offen: { '2026-11-18': { 1: 'a' } },
  abwesend: { [date]: { 1: 'e' } },
} } as unknown as AppState;

test('Check-in und Teilnehmerauswahl unterscheiden da, offen und abwesend', () => {
  const excludingAbsences = getCockpitStudentPool(roster, app, 'present', date);
  assert.deepEqual(excludingAbsences, { students: roster.slice(0, 2), present: 1, open: 1 });
  assert.deepEqual(getCockpitStudentPool(roster, app, 'checked-in', date), {
    students: roster.slice(0, 1), present: 1, open: 1,
  });
  assert.deepEqual(getCockpitStudentPool(roster, app, 'all', date).students, roster);
  assert.deepEqual(getCockpitStudentPool([], app, 'checked-in', date).students, []);
});

test('Anmeldung und Korrektur zählen sofort, ohne den bisherigen Stand zu überschreiben', () => {
  const checkedIn = checkInStudent(app, 'offen', date, ['1']).updatedAppState;
  assert.deepEqual(getCockpitStudentPool(roster, checkedIn, 'checked-in', date).students, roster.slice(0, 2));
  const corrected = teacherSetStudentAbsent(checkedIn, 'da', date, ['1']);
  assert.deepEqual(getCockpitStudentPool(roster, corrected, 'present', date).students, roster.slice(1, 2));
  const reset = teacherResetStudentToOpen(corrected, 'offen', date);
  assert.deepEqual(getCockpitStudentPool(roster, reset, 'checked-in', date), { students: [], present: 0, open: 1 });
  assert.deepEqual(getCockpitStudentPool(roster, app, 'checked-in', date).students, roster.slice(0, 1));
});

test('Vorhandene Einstellungen behalten die bisherige Auswahl', () => {
  assert.equal(normalizeCockpitStudentScope(null), 'present');
  assert.equal(getGroupWidgetPreferences({ studentScope: 'present' }).studentScope, 'present');
  assert.equal(getGroupWidgetPreferences({ studentScope: 'all' }).studentScope, 'all');
  assert.equal(getGroupWidgetPreferences({ studentScope: 'checked-in' }).studentScope, 'checked-in');
});

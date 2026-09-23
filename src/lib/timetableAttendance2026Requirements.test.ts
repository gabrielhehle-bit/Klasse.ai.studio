import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialAppState, syncActiveClass, switchClassState, normalizeAppState } from './appState';
import { getAttendanceDayStats } from './attendanceData';
import { completeMissingAttendance } from './classroomEdits';

test('tentative presence is a per-class setting and does not erase absences across class switches', () => {
  const a = { id: 'a', name: '1a', stufe: 1, schuljahr: '2026/27', klassenvorstand: true, schueler: [{ id: 'synthetic-a' }], settings: { defaultAttendancePresent: false }, anwesenheit: { 'synthetic-a': { '2026-09-23': { 1: 'e' } } } };
  const b = { id: 'b', name: '1b', stufe: 1, schuljahr: '2026/27', klassenvorstand: true, schueler: [{ id: 'synthetic-b' }], settings: { defaultAttendancePresent: true } };
  const initial = normalizeAppState({
    ...initialAppState,
    activeClassId: a.id,
    klassenbezeichnung: a.name,
    schuljahr: a.schuljahr,
    stufe: a.stufe,
    schueler: a.schueler,
    anwesenheit: a.anwesenheit,
    classes: [a, b],
    settings: { ...initialAppState.settings, defaultAttendancePresent: false },
  } as any);
  const second = switchClassState(syncActiveClass(initial), 'b');
  assert.equal(second.settings.defaultAttendancePresent, true);
  const restored = normalizeAppState(JSON.parse(JSON.stringify(syncActiveClass(second))));
  const first = switchClassState(restored, 'a');
  assert.equal(first.settings.defaultAttendancePresent, false);
  assert.equal(first.anwesenheit['synthetic-a']['2026-09-23'][1], 'e');
});

test('teacher timetable stays in the profile across class switches, independent from class plans', () => {
  const original = normalizeAppState({
    ...initialAppState,
    activeClassId: 'a', klassenbezeichnung: '1a', schuljahr: '2026/27', stufe: 1,
    classes: [
      { id: 'a', name: '1a', stufe: 1, schuljahr: '2026/27', klassenvorstand: true, schueler: [], stammplan: { Mittwoch: { 1: 'Deutsch' } } },
      { id: 'b', name: '1b', stufe: 1, schuljahr: '2026/27', klassenvorstand: true, schueler: [], stammplan: { Mittwoch: { 1: 'Mathematik' } } },
    ],
    lehrerProfil: { stundenplanByYear: { '2026/27': [{ tag: 'Mittwoch', stunde: 1, fach: 'Musik', klasse: '1a', raum: '' }] } },
  } as any);
  const b = switchClassState(syncActiveClass(original), 'b');
  assert.equal(b.stammplan.Mittwoch[1], 'Mathematik');
  assert.equal(b.lehrerProfil?.stundenplanByYear?.['2026/27']?.[0].fach, 'Musik');
  const a = switchClassState(b, 'a');
  assert.equal(a.stammplan.Mittwoch[1], 'Deutsch');
});

test('default attendance never creates a record until daily confirmation, existing absences survive completion', () => {
  const day = '2026-09-23';
  const attendance = { a: { [day]: { 1: 'e' } } };
  const before = getAttendanceDayStats([{ id: 'a' }, { id: 'b' }], attendance, {}, day, [1, 2]);
  assert.equal(before.absent, 1);
  assert.equal(before.untracked, 2);
  const confirmed = completeMissingAttendance(attendance, ['a', 'b'], day, [1, 2]);
  assert.equal(confirmed.a[day][1], 'e');
  assert.equal(confirmed.a[day][2], 'a');
  assert.equal(confirmed.b[day][1], 'a');
  assert.equal(getAttendanceDayStats([{ id: 'a' }, { id: 'b' }], confirmed, {}, day, [1, 2]).untracked, 0);
});

test('profile and class timetable are distinct visible entry points; hourly absence UI remains accessible', () => {
  const sidebar = readFileSync('src/components/Sidebar.tsx', 'utf8');
  const app = readFileSync('src/App.tsx', 'utf8');
  const profile = readFileSync('src/components/LehrerProfilView.tsx', 'utf8');
  const attendance = readFileSync('src/components/Attendance.tsx', 'utf8');
  assert.match(sidebar, /id: 'profil', label: 'Mein Profil & Stundenplan'/);
  assert.match(sidebar, /id: 'klassenstundenplan', label: 'Klassenstundenplan'/);
  assert.match(app, /case 'klassenstundenplan': return <ClassTimetable \/>/);
  assert.match(profile, /activeTab === 'timetable' && <PersonalTimetable \/>/);
  assert.match(attendance, /setViewMode\(viewMode === "compact" \? "hourly" : "compact"\)/);
  assert.match(attendance, /tentativePresent && dayStats\.untracked > 0/);
});

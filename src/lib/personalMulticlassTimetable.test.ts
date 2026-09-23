import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialAppState, switchClassState, syncActiveClass } from './appState';
import { accountSyncState, mergeAccountSyncState } from './accountSyncService';
import {
  importedTeacherLessons, linkedClassChange, applyTeacherChangeToClass,
  personalDateKey, personalWeekStart, personalWeekDayDate, personalLessonsForDate,
} from './personalTimetable';

const demoClassA = {
  id: 'teacher-a', name: '1a', stufe: 1, klassenvorstand: true, schueler: [],
  stammplan: { Mittwoch: { 1: 'Mathematik', 3: 'Sport' } },
  wochenplanung: { 39: { Mittwoch: { 1: { fach: 'Mathematik', thema: 'Wiederholung' } } } },
} as any;
const demoClassB = {
  id: 'teacher-b', name: '4b', stufe: 4, klassenvorstand: false, schueler: [],
  stammplan: { Donnerstag: { 2: 'Deutsch' } },
  wochenplanung: { 39: { Donnerstag: { 2: { fach: 'Deutsch', thema: 'Lesen' } } } },
} as any;
const createState = () => syncActiveClass({
  ...initialAppState,
  activeClassId: demoClassA.id,
  classes: [demoClassA, demoClassB],
  klassenbezeichnung: demoClassA.name, stufe: 1, schuljahr: '2026/27',
  stammplan: demoClassA.stammplan, wochenplanung: demoClassA.wochenplanung,
} as any);

test('teacher can import free weekly lessons from several classes while preserving class planning', () => {
  const state = createState();
  const first = importedTeacherLessons(state, demoClassA.id, []);
  assert.equal(first.available, true);
  assert.equal(first.added.length, 2);
  assert.deepEqual(first.added.map(item => item.fach), ['Mathematik', 'Sport']);
  assert.equal(first.added[0].quelle?.classId, demoClassA.id);
  const other = importedTeacherLessons(state, demoClassB.id, first.added);
  assert.equal(other.added.length, 1);
  assert.equal(other.added[0].klasse, '4b');
  const again = importedTeacherLessons(state, demoClassA.id, [...first.added, ...other.added]);
  assert.equal(again.added.length, 0);
  assert.equal(again.skipped, 2);
  assert.equal(state.wochenplanung[39].Mittwoch[1].thema, 'Wiederholung');
  assert.equal(state.classes.find(item => item.id === demoClassB.id)?.wochenplanung?.[39]?.Donnerstag?.[2]?.thema, 'Lesen');
});

test('personal changes do not alter the class plan unless a separate safe class update is requested', () => {
  const state = createState();
  const lesson = importedTeacherLessons(state, demoClassA.id, []).added[0];
  const changed = { ...lesson, fach: 'Deutsch' };
  assert.equal(state.stammplan.Mittwoch[1], 'Mathematik');
  assert.deepEqual(linkedClassChange(state, lesson), { changed: false, currentFach: 'Mathematik', missing: false });
  const applied = applyTeacherChangeToClass(state, lesson, changed);
  assert.equal(applied.status, 'ok');
  assert.equal(applied.state.stammplan.Mittwoch[1], 'Deutsch');
  assert.equal(applied.state.classes.find(room => room.id === demoClassA.id)?.stammplan.Mittwoch[1], 'Deutsch');
  assert.equal(applied.state.wochenplanung[39].Mittwoch[1].thema, 'Wiederholung');
  assert.equal(applied.state.classes.find(room => room.id === demoClassB.id)?.stammplan.Donnerstag[2], 'Deutsch');
  assert.equal(state.stammplan.Mittwoch[1], 'Mathematik', 'original class state never mutated');
  assert.deepEqual(linkedClassChange(applied.state, lesson), { changed: true, currentFach: 'Deutsch', missing: false });
  assert.equal(applyTeacherChangeToClass(applied.state, lesson, changed).status, 'changed');
  assert.equal(applyTeacherChangeToClass(state, lesson, { ...lesson, stunde: 3 }).status, 'occupied');
});

test('updating a linked lesson in a different class does not write into the currently active class', () => {
  const state = createState();
  const lesson = importedTeacherLessons(state, demoClassB.id, []).added[0];
  const applied = applyTeacherChangeToClass(state, lesson, { ...lesson, fach: 'Englisch' });
  assert.equal(applied.status, 'ok');
  assert.equal(applied.state.stammplan.Mittwoch[1], 'Mathematik');
  assert.equal(applied.state.classes.find(room => room.id === demoClassB.id)?.stammplan.Donnerstag[2], 'Englisch');
  assert.equal(applied.state.classes.find(room => room.id === demoClassB.id)?.wochenplanung?.[39]?.Donnerstag?.[2]?.thema, 'Lesen');
});

test('viewer classes cannot be changed or imported from using teacher profile', () => {
  const state = createState();
  state.classes[1].teamTeaching = { sharedClassId: 'shared', role: 'viewer', revision: 1 };
  const result = importedTeacherLessons(state, demoClassB.id, []);
  assert.equal(result.available, false);
  const source = { tag: 'Donnerstag', stunde: 2, fach: 'Deutsch', klasse: '4b', raum: '',
    kind: 'unterricht' as const, quelle: { classId: demoClassB.id, tag: 'Donnerstag', stunde: 2, fach: 'Deutsch' } };
  assert.equal(applyTeacherChangeToClass(state, source, { ...source, fach: 'Sport' }).status, 'viewer');
});

test('one-off changed, cancelled and added events apply only to their date', () => {
  const recurring = { id: 'fixed-1', tag: 'Mittwoch', stunde: 1, fach: 'Mathematik',
    klasse: '1a', raum: '', kind: 'unterricht' as const };
  const add = { id: 'meeting-1', datum: '2026-09-23', type: 'add' as const,
    lesson: { id: 'meeting', tag: 'Mittwoch', stunde: 0, fach: 'Konferenz',
      klasse: '', raum: 'Teamraum', kind: 'besprechung' as const, start: '14:00', ende: '14:45' } };
  const cancel = { id: 'cancel-1', datum: '2026-09-23', type: 'cancel' as const,
    lessonId: recurring.id };
  const special = personalLessonsForDate([recurring], [add, cancel], '2026-09-23', 'Mittwoch');
  assert.equal(special.length, 2);
  assert.equal(special.find(item => item.baseId === recurring.id)?.cancelled, true);
  assert.equal(special.find(item => item.lesson.fach === 'Konferenz')?.exception, 'add');
  const regular = personalLessonsForDate([recurring], [add, cancel], '2026-09-30', 'Mittwoch');
  assert.equal(regular.length, 1);
  assert.equal(regular[0].cancelled, false);
  assert.equal(regular[0].lesson.fach, 'Mathematik');
  const changed = personalLessonsForDate([recurring], [{
    id: 'change-1', datum: '2026-09-23', type: 'change', lessonId: recurring.id,
    lesson: { ...recurring, fach: 'Vertretung' },
  }], '2026-09-23', 'Mittwoch');
  assert.equal(changed[0].lesson.fach, 'Vertretung');
  assert.equal(personalLessonsForDate([recurring], [], '2026-09-30', 'Mittwoch')[0].lesson.fach, 'Mathematik');
});

test('week navigation preserves local calendar dates including month boundary', () => {
  const monday = personalWeekStart(new Date(2026, 8, 23));
  assert.equal(personalDateKey(monday), '2026-09-21');
  assert.equal(personalWeekDayDate(monday, 4), '2026-09-25');
  assert.equal(personalWeekDayDate(personalWeekStart(new Date(2026, 9, 1)), 4), '2026-10-02');
});

test('personal schedule is root-level account data and survives class switching and encrypted sync boundaries', () => {
  const state = createState();
  const lesson = importedTeacherLessons(state, demoClassB.id, []).added[0];
  const withPersonal = { ...state, lehrerProfil: {
    ...(state.lehrerProfil || {}), stundenplanByYear: { '2026/27': [lesson] },
    stundenplanAusnahmenByYear: { '2026/27': [{
      id: 'one-day', datum: '2026-09-24', type: 'add' as const,
      lesson: { tag: 'Donnerstag', stunde: 0, fach: 'Konferenz', klasse: '', raum: '', kind: 'besprechung' as const },
    }] },
  } } as any;
  const persisted = syncActiveClass(withPersonal);
  assert.equal((persisted.classes[0] as any).lehrerProfil, undefined);
  const switched = switchClassState(persisted, demoClassB.id);
  assert.equal(switched.lehrerProfil?.stundenplanByYear?.['2026/27']?.[0].quelle?.classId, demoClassB.id);
  const payload = accountSyncState(switched);
  const restored = mergeAccountSyncState(payload, initialAppState);
  assert.equal(restored.lehrerProfil?.stundenplanAusnahmenByYear?.['2026/27']?.[0].datum, '2026-09-24');
  assert.equal(restored.classes.find(room => room.id === demoClassA.id)?.wochenplanung?.[39]?.Mittwoch?.[1]?.thema, 'Wiederholung');
});

test('personal timetable UI asks before changing a linked class, and opens class planning without duplicating lesson content', () => {
  const view = readFileSync('src/components/PersonalTimetable.tsx', 'utf8');
  assert.match(view, /window\.confirm/);
  assert.match(view, /applyTeacherChangeToClass/);
  assert.match(view, /Nur dieser Tag/);
  assert.match(view, /Ganze freie Woche übernehmen/);
  assert.match(view, /Wochenplanung der Klasse öffnen/);
  assert.match(view, /setPage\('wochenplanung'\)/);
  assert.match(view, /stundenplanAusnahmenByYear/);
  assert.doesNotMatch(view, /wochenplanung:\s*\{/);
});

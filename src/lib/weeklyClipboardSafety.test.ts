import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pasteCopiedLessonIntoEmptyWeek, transferQuickPlannedLesson } from './quickPlanLessonTransfer';

test('Zwischenablage fügt in eine freie Stunde verlustfrei ein, ohne den Ursprung zu ändern', () => {
  const original = {
    id: 'lesson-old', fach: 'Deutsch', thema: 'Laut S', housework: 'S. 12',
    erledigt: true, completed: true, imKinderWochenplan: true,
    wochenplanMaterial: 'Arbeitsheft', materialIds: ['m1'],
    halves: { enabled: true, first: { thema: 'Lesen' } },
  };
  const week = {
    Montag: { 0: original, zeitunabhaengig: [{ titel: 'Elternabend' }] },
    Mittwoch: { 2: { fach: 'Mathematik', thema: 'Zahlen' } },
  };
  const snapshot = structuredClone(week);
  const result = pasteCopiedLessonIntoEmptyWeek({
    week, lesson: original, target: { dayIdx: 2, hourIdx: 3 },
    copyId: 'lesson-new', updatedAt: '2026-11-13T10:00:00Z',
  });
  assert.equal(result.status, 'copied');
  const copy = result.week.Mittwoch[3];
  assert.equal(copy.id, 'lesson-new');
  assert.equal(copy.fach, 'Deutsch');
  assert.equal(copy.thema, 'Laut S');
  assert.equal(copy.housework, 'S. 12');
  assert.equal(copy.imKinderWochenplan, true);
  assert.equal(copy.wochenplanMaterial, 'Arbeitsheft');
  assert.deepEqual(copy.materialIds, ['m1']);
  assert.notEqual(copy.materialIds, original.materialIds);
  assert.notEqual(copy.halves, original.halves);
  assert.equal(copy.erledigt, false);
  assert.equal(copy.completed, false);
  assert.equal(copy.updatedAt, '2026-11-13T10:00:00Z');
  assert.equal(result.week.Montag[0], original);
  assert.equal(result.week.Montag.zeitunabhaengig, week.Montag.zeitunabhaengig);
  assert.equal(result.week.Mittwoch[2], week.Mittwoch[2]);
  assert.deepEqual(week, snapshot);
});

test('Leere Daten, belegte Ziele und bereits angelegte Platzhalter werden nie überschrieben', () => {
  const lesson = { fach: 'Deutsch', thema: 'Silben' };
  const target = { dayIdx: 0, hourIdx: 3 };
  for (const occupied of [{ fach: 'Musik' }, { thema: 'Offene Eingabe' }, {}, { materialIds: ['x'] }]) {
    const week = { Montag: { 3: occupied } };
    const result = pasteCopiedLessonIntoEmptyWeek({ week, lesson, target });
    assert.equal(result.status, 'occupied-target');
    assert.equal(result.week, week);
    assert.equal(week.Montag[3], occupied);
  }
  const week = { Montag: { 0: lesson } };
  assert.equal(pasteCopiedLessonIntoEmptyWeek({ week, lesson: null, target }).status, 'empty-source');
  assert.equal(pasteCopiedLessonIntoEmptyWeek({ week, lesson, target: { dayIdx: -1, hourIdx: 0 } }).status, 'invalid-slot');
  assert.equal(pasteCopiedLessonIntoEmptyWeek({ week, lesson, target: { dayIdx: 0, hourIdx: 10 } }).status, 'invalid-slot');
});

test('Alte numerische und benannte Tagesdatensätze bleiben erhalten; neue Einträge sind sichtbar', () => {
  const lesson = { fach: 'Deutsch', thema: 'Leseübung' };
  const week = {
    0: { 0: { fach: 'Musik', thema: 'Alt' } },
    Montag: { 1: { fach: 'Mathematik', thema: 'Aktuell' } },
  };
  const result = pasteCopiedLessonIntoEmptyWeek({
    week, lesson, target: { dayIdx: 0, hourIdx: 2 },
  });
  assert.equal(result.status, 'copied');
  assert.equal(result.week.Montag[2].thema, 'Leseübung');
  assert.equal(result.week[0][2], undefined);
  assert.equal(result.week.Montag[1], week.Montag[1]);
  assert.equal(result.week[0], week[0]);
  assert.equal(pasteCopiedLessonIntoEmptyWeek({
    week, lesson, target: { dayIdx: 0, hourIdx: 0 },
  }).status, 'occupied-target');
});

test('Doppelstunden und Tagesblöcke schützen auch scheinbar freie Folgeplätze', () => {
  const lesson = { fach: 'Deutsch', thema: 'Projekt', duration: 2 };
  const week = { Dienstag: { 0: { fach: 'Musik', duration: 3 }, 5: { fach: 'Religion' } } };
  assert.equal(pasteCopiedLessonIntoEmptyWeek({
    week, lesson, target: { dayIdx: 1, hourIdx: 2 },
  }).status, 'occupied-target');
  assert.equal(pasteCopiedLessonIntoEmptyWeek({
    week, lesson, target: { dayIdx: 1, hourIdx: 4 },
  }).status, 'occupied-target');
  assert.equal(pasteCopiedLessonIntoEmptyWeek({
    week, lesson, target: { dayIdx: 1, hourIdx: 9 },
  }).status, 'invalid-slot');
  const okay = pasteCopiedLessonIntoEmptyWeek({ week, lesson, target: { dayIdx: 1, hourIdx: 6 } });
  assert.equal(okay.status, 'copied');
  assert.equal(week.Dienstag[6], undefined);
});

test('Duplikation in die Folgestunde nutzt dieselbe Sicherheitsprüfung', () => {
  const week = { Donnerstag: {
    0: { fach: 'Deutsch', thema: 'Lesen' },
    1: { fach: 'Mathematik', thema: 'Plus' },
    2: { fach: 'Musik', thema: 'Singen', duration: 2 },
  } };
  const source = { dayIdx: 3, hourIdx: 0 };
  assert.equal(transferQuickPlannedLesson({
    week, source, target: { dayIdx: 3, hourIdx: 1 }, mode: 'copy',
  }).status, 'occupied-target');
  assert.equal(transferQuickPlannedLesson({
    week, source, target: { dayIdx: 3, hourIdx: 3 }, mode: 'copy',
  }).status, 'occupied-target');
});

test('Wochenplan-UI benutzt geprüfte Copy-Funktionen, keine direkte Zielzuweisung', () => {
  const weekly = readFileSync('src/components/WeeklyPlan.tsx', 'utf8');
  const paste = weekly.slice(weekly.indexOf('const pasteLessonBlock'), weekly.indexOf('const duplicateLessonBlock'));
  const duplicate = weekly.slice(weekly.indexOf('const duplicateLessonBlock'), weekly.indexOf('useLayoutEffect', weekly.indexOf('const duplicateLessonBlock')));
  assert.match(paste, /pasteCopiedLessonIntoEmptyWeek\(/);
  assert.match(duplicate, /transferQuickPlannedLesson\(/);
  assert.match(paste, /reconcileCopiedLessonYearlyStatus\(/);
  assert.match(duplicate, /reconcileCopiedLessonYearlyStatus\(/);
  assert.doesNotMatch(paste, /currentWeekObj\[tag\]\[idx\]\s*=/);
  assert.doesNotMatch(duplicate, /currentWeekObj\[tag\]\[nextIdx\]\s*=/);
  assert.match(weekly, /zIdx \+ 1 < MAX_LESSON_SLOTS/);
});

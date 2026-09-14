import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSchoolYearWeekList,
  configuredLessonTime,
  getPreviousCalendarWeekKw,
  weeklyLessonDurationSlots,
  collectIncompleteWeeklyLessonSlots,
} from './weeklyPlanData';

test('Wochenplanung: Vorwoche funktioniert über den Jahreswechsel', () => {
  assert.equal(getPreviousCalendarWeekKw(1, '2026/27'), 53);
  assert.equal(getPreviousCalendarWeekKw(2, '2026/27'), 1);
  assert.equal(getPreviousCalendarWeekKw(38, '2026/27'), 37);
});

test('Wochenplanung: Wochenliste startet bundeslandabhängig am Schulbeginn', () => {
  const vienna = buildSchoolYearWeekList('2026/27', 'W');
  const vorarlberg = buildSchoolYearWeekList('2026/27', 'VBG');

  assert.equal(vienna[0].kw, 37);
  assert.equal(vorarlberg[0].kw, 38);
  assert.equal(vienna[0].sw, 1);
  assert.equal(vorarlberg[0].sw, 1);
});

test('Wochenplanung: Stunde 9 und 10 bekommen keine erfundene Standardzeit', () => {
  const fallback = { 1: '08:00–08:50', 8: '15:10–16:00' };
  assert.equal(configuredLessonTime(undefined, fallback, 9), '');
  assert.equal(configuredLessonTime(undefined, fallback, 10), '');
  assert.equal(configuredLessonTime({ 9: '16:05–16:50' }, fallback, 9), '16:05–16:50');
});

test('Wochenplanung: explizit leere konfigurierte Uhrzeit bleibt leer', () => {
  const fallback = { 1: '08:00–08:50' };
  assert.equal(configuredLessonTime({ 1: '' }, fallback, 1), '');
});


test('Wochenplanung: Mehrstundenblöcke reichen nie über Slot 10 hinaus', () => {
  assert.equal(weeklyLessonDurationSlots('all', 0), 10);
  assert.equal(weeklyLessonDurationSlots('all', 7), 3);
  assert.equal(weeklyLessonDurationSlots(6, 7), 3);
  assert.equal(weeklyLessonDurationSlots(2, 8), 2);
  assert.equal(weeklyLessonDurationSlots(4, 9), 1);
});


test('Wochenplanung: Wochenabschluss erkennt erledigt korrekt und zeigt Stunden 1-basiert', () => {
  const slots = collectIncompleteWeeklyLessonSlots({
    Montag: {
      0: { fach: 'Deutsch', thema: 'Schon erledigt', erledigt: true },
      1: { fach: 'Mathematik', thema: 'Noch offen', erledigt: false },
      8: { fach: 'Sachunterricht', thema: 'Neunte Stunde offen' },
      9: { fach: 'Musik', thema: 'Legacy erledigt', completed: true },
      zeitunabhaengig: [{ thema: 'Termin' }],
    },
  });

  assert.deepEqual(slots, [
    { tag: 'Montag', idx: 2, fach: 'Mathematik', thema: 'Noch offen' },
    { tag: 'Montag', idx: 9, fach: 'Sachunterricht', thema: 'Neunte Stunde offen' },
  ]);
});

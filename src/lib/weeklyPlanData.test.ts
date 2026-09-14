import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSchoolYearWeekList,
  configuredLessonTime,
  getPreviousCalendarWeekKw,
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

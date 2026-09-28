import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_WEEKDAYS_WIDGET_SETTINGS,
  MONTH_NAMES,
  WEEKDAY_NAMES,
  createCalendarPracticeRound,
  getCalendarIndexForDate,
  getCalendarItems,
  normalizeWeekdaysWidgetSettings,
  wrapCalendarIndex,
} from './weekdaysWidgetModel';

test('Wochentage-Trainer normalisiert Einstellungen sicher', () => {
  assert.deepEqual(normalizeWeekdaysWidgetSettings(null), DEFAULT_WEEKDAYS_WIDGET_SETTINGS);
  assert.deepEqual(normalizeWeekdaysWidgetSettings({
    view: 'months',
    mode: 'practice',
    showActualDate: false,
  }), {
    view: 'months',
    mode: 'practice',
    showActualDate: false,
  });
});

test('Wochentage und Monate sind vollständig und in österreichischer Reihenfolge', () => {
  assert.deepEqual(getCalendarItems('weekdays'), WEEKDAY_NAMES);
  assert.deepEqual(getCalendarItems('months'), MONTH_NAMES);
  assert.equal(WEEKDAY_NAMES[0], 'Montag');
  assert.equal(WEEKDAY_NAMES[6], 'Sonntag');
  assert.equal(MONTH_NAMES.length, 12);
});

test('echtes Datum wird auf Montag=0 und Jänner=0 abgebildet', () => {
  // Monday, 28 September 2026.
  const monday = new Date(2026, 8, 28, 10, 0, 0);
  assert.equal(getCalendarIndexForDate('weekdays', monday), 0);
  assert.equal(getCalendarIndexForDate('months', monday), 8);
});

test('Kalenderindex läuft an Wochen- und Jahresgrenzen korrekt weiter', () => {
  assert.equal(wrapCalendarIndex(-1, 7), 6);
  assert.equal(wrapCalendarIndex(7, 7), 0);
  assert.equal(wrapCalendarIndex(-1, 12), 11);
  assert.equal(wrapCalendarIndex(12, 12), 0);
});

test('Übungsfragen prüfen vor/nach ohne Punkte- oder Serienlogik', () => {
  const after = createCalendarPracticeRound('weekdays', (() => {
    const values = [0, 0.75];
    return () => values.shift() ?? 0;
  })());
  assert.equal(after.prompt, 'Welcher Tag kommt nach Montag?');
  assert.equal(after.answerIndex, 1);

  const before = createCalendarPracticeRound('months', (() => {
    const values = [0, 0.25];
    return () => values.shift() ?? 0;
  })());
  assert.equal(before.prompt, 'Welcher Monat kommt vor Januar?');
  assert.equal(before.answerIndex, 11);
});

test('aufeinanderfolgende Übungsrunden vermeiden identische Aufgaben', () => {
  const first = createCalendarPracticeRound('weekdays', () => 0);
  const second = createCalendarPracticeRound('weekdays', () => 0, first.key);
  assert.notEqual(second.key, first.key);
});

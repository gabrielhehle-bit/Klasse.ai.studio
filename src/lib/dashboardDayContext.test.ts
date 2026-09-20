import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getDashboardDisplayDate, getDashboardFreeDayMessage } from './dashboardDayContext';

const on = (year: number, month: number, day: number, hour = 9) => new Date(year, month - 1, day, hour, 0, 0);
const sameDate = (date: Date) => [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-');

test('Sunday 20.09.2026: dashboard must show real Sunday instead of next Monday in automatic mode', () => {
  const sunday = on(2026, 9, 20);
  assert.equal(sunday.getDay(), 0);
  for (const hour of [0, 8, 16, 23]) {
    const result = getDashboardDisplayDate(on(2026, 9, 20, hour), 'automatik', 16);
    assert.equal(sameDate(result.date), '2026-9-20');
    assert.equal(result.preview, null);
  }
  assert.equal(getDashboardFreeDayMessage(sunday, 'VBG')?.kind, 'weekend');
  assert.match(getDashboardFreeDayMessage(sunday, 'VBG')?.title || '', /Schönes Wochenende/);
  assert.match(getDashboardFreeDayMessage(sunday, 'VBG')?.message || '', /Sonntag/);
});

test('Saturday, DST transition and Monday resolve to local calendar day without ISO/UTC shift', () => {
  assert.equal(sameDate(getDashboardDisplayDate(on(2026, 9, 19, 23), 'automatik', 16).date), '2026-9-19');
  assert.equal(sameDate(getDashboardDisplayDate(on(2026, 3, 29, 23), 'automatik', 16).date), '2026-3-29');
  assert.equal(sameDate(getDashboardDisplayDate(on(2026, 9, 21, 9), 'automatik', 16).date), '2026-9-21');
  assert.equal(getDashboardFreeDayMessage(on(2026, 9, 21), 'VBG'), null);
  assert.equal(sameDate(getDashboardDisplayDate(on(2026, 9, 18, 17), 'automatik', 16).date), '2026-9-21');
});

test('Explicit tomorrow and manual calendar navigation are preserved without Sunday autoplay', () => {
  assert.equal(sameDate(getDashboardDisplayDate(on(2026, 9, 20), 'morgen', 16).date), '2026-9-21');
  assert.equal(sameDate(getDashboardDisplayDate(on(2026, 9, 20), 'heute', 16).date), '2026-9-20');
  const manual = getDashboardDisplayDate(on(2026, 9, 20), 'automatik', 16, 1);
  assert.equal(sameDate(manual.date), '2026-9-21');
  assert.equal(manual.preview, 'Manuell');
  assert.equal(sameDate(getDashboardDisplayDate(on(2026, 12, 28, 17), 'automatik', 16, 0, true).date), '2026-12-28');
});

test('Named school breaks use existing province calendar data, not a generic weekend or guessed winter', () => {
  const cases: Array<[Date, string]> = [
    [on(2026, 10, 28), 'Herbstferien'],
    [on(2026, 12, 28), 'Weihnachtsferien'],
    [on(2027, 2, 16), 'Semesterferien'],
    [on(2027, 3, 25), 'Osterferien'],
    [on(2027, 7, 12), 'Sommerferien'],
    [on(2026, 9, 12), 'Sommerferien'],
  ];
  for (const [day, name] of cases) {
    const free = getDashboardFreeDayMessage(day, 'VBG');
    assert.equal(free?.kind, 'vacation', `${day.toDateString()} must be a named vacation`);
    assert.match(free?.title || '', new RegExp(name));
  }
  assert.equal(getDashboardFreeDayMessage(on(2026, 9, 20), 'VBG')?.kind, 'weekend');
  assert.equal(getDashboardFreeDayMessage(on(2026, 10, 26), 'VBG')?.kind, 'holiday');
});

test('School-specific overrides and disabled holidays are respected', () => {
  assert.equal(getDashboardFreeDayMessage(on(2026, 10, 28), 'VBG', [], 'school'), null);
  assert.equal(getDashboardFreeDayMessage(on(2026, 9, 21), 'VBG', [], 'free')?.kind, 'school-free');
  assert.equal(getDashboardFreeDayMessage(on(2026, 10, 28), 'VBG', ['herbst_2026'])?.kind, undefined);
  assert.equal(getDashboardFreeDayMessage(on(2026, 10, 26), 'VBG', ['nationalfeiertag']), null);
  assert.equal(getDashboardFreeDayMessage(on(2026, 9, 20), 'VBG', [], 'school'), null);
});

test('Main and simple dashboard show a free-day message without hiding tasks or school plans', () => {
  const dashboard = readFileSync('src/components/Dashboard.tsx', 'utf8');
  const full = readFileSync('src/components/DashboardTodayOverview.tsx', 'utf8');
  const simple = readFileSync('src/components/DashboardSimpleOverview.tsx', 'utf8');
  assert.match(dashboard, /getDashboardDisplayDate\(currentTime, vorschauModus, vorschauStunde, manualDateOffset, Boolean\(freeToday\)\)/);
  assert.match(dashboard, /freeDayGreeting=\{dashboardFreeDay\}/);
  assert.match(full, /freeDayGreeting && \(/);
  assert.match(simple, /p\.freeDayGreeting && \(/);
  assert.match(simple, /p\.actionItems/);
  assert.match(simple, /p\.freeDayGreeting\s*\? 'wochenplanung'/);
  assert.match(simple, /Planung ansehen/);
  assert.match(simple, /p\.freeDayGreeting \? \(/);
  assert.match(simple, /Heute ist kein regulärer Unterricht vorgesehen/);
  assert.match(simple, /p\.todayLessonsList/);
  assert.doesNotMatch(dashboard.slice(dashboard.indexOf('const { date: anzeigeDatum'), dashboard.indexOf('const heute = currentTime')), /day === 0[^;]*Montag/);
});

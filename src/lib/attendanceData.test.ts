import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAttendanceTrendData,
  findAdjacentSchoolDate,
  getAttendanceDayStats,
  getAttendanceSemester,
  getLocalAttendanceDateKey,
  getStudentAbsenceDates,
  getStudentAttendanceStats,
  isDateInSchoolYear,
  markAttendanceExcused,
  markAttendancePresent,
  mergeFehlstundenIntoDay,
  parseLocalDateKey,
} from './attendanceData';

test('attendance date keys use the local calendar day', () => {
  const date = new Date(2026, 8, 14, 23, 30);
  assert.equal(getLocalAttendanceDateKey(date), '2026-09-14');
  assert.equal(parseLocalDateKey('2026-09-14')?.getDate(), 14);
  assert.equal(parseLocalDateKey('2026-02-31'), null);
});

test('day stats never invent presence when no hours are configured', () => {
  const stats = getAttendanceDayStats(
    [{ id: 'a' }, { id: 'b' }],
    {},
    {},
    '2026-09-14',
    []
  );
  assert.equal(stats.present, 0);
  assert.equal(stats.untracked, 2);
});

test('day stats keep known absence visible while still flagging incomplete hours', () => {
  const stats = getAttendanceDayStats(
    [{ id: 'a' }],
    { a: { '2026-09-14': { 1: 'e' } } },
    {},
    '2026-09-14',
    [1, 2]
  );
  assert.equal(stats.absent, 1);
  assert.equal(stats.excused, 1);
  assert.equal(stats.untracked, 1);
});

test('school-year filtering excludes attendance from prior years', () => {
  assert.equal(isDateInSchoolYear('2026-09-01', '2026/27'), true);
  assert.equal(isDateInSchoolYear('2027-08-31', '2026/27'), true);
  assert.equal(isDateInSchoolYear('2026-06-30', '2026/27'), false);
});

test('semester split follows the configured federal-state semester holiday', () => {
  assert.equal(getAttendanceSemester('2027-02-12', '2026/27', 'VBG'), 1);
  assert.equal(getAttendanceSemester('2027-02-22', '2026/27', 'VBG'), 2);
  assert.equal(getAttendanceSemester('2027-01-29', '2026/27', 'W'), 1);
  assert.equal(getAttendanceSemester('2027-02-08', '2026/27', 'W'), 2);
});

test('student stats include detail-only absences and only the active school year', () => {
  const stats = getStudentAttendanceStats(
    {
      '2026-09-14': { 1: 'e', 2: 'e' },
      '2025-09-15': { 1: 'u' },
    },
    {
      '2027-03-01': { fehlstunden: 3, notiz: 'Unentschuldigt' },
    },
    '2026/27',
    'VBG'
  );

  assert.equal(stats.s1.e, 2);
  assert.equal(stats.s2.u, 3);
  assert.equal(stats.total.total, 5);
});

test('absence dates include detail-only records and exclude old school years', () => {
  const dates = getStudentAbsenceDates(
    {
      '2026-09-14': { 1: 'e' },
      '2025-09-15': { 1: 'e' },
    },
    {
      '2027-03-01': { fehlstunden: 2 },
    },
    '2026/27'
  );
  assert.deepEqual(dates, ['2027-03-01', '2026-09-14']);
});

test('weekly trends use ISO week order across New Year and ignore old school years', () => {
  const trends = buildAttendanceTrendData(
    {
      a: {
        '2026-12-21': { 1: 'e' },
        '2027-01-11': { 1: 'u' },
        '2025-12-22': { 1: 'u' },
      },
    },
    {},
    '2026/27'
  );
  assert.deepEqual(trends.weeklyData.map(item => item.name), ['KW 52 · 26', 'KW 2 · 27']);
});

test('school-day navigation can skip weekends and holidays supplied by the caller', () => {
  const next = findAdjacentSchoolDate(
    '2026-12-23',
    1,
    (_date, key) => !['2026-12-24', '2026-12-25', '2026-12-26', '2026-12-27'].includes(key)
  );
  assert.equal(next, '2026-12-28');
});

test('editing Fehlstunden preserves existing absent periods when the count is unchanged', () => {
  const day = mergeFehlstundenIntoDay(
    { 1: 'a', 2: 'a', 3: 'e', 4: 'a', 5: 'u' },
    [1, 2, 3, 4, 5],
    2,
    'u'
  );
  assert.deepEqual(day, { 1: 'a', 2: 'a', 3: 'e', 4: 'a', 5: 'u' });
});

test('marking present clears absence-only metadata and marking excused removes stale unexcused note', () => {
  const present = markAttendancePresent(
    { 1: 'u', 2: 'u' },
    { fehlstunden: 2, notiz: 'Unentschuldigt', verspaetung: 5 },
    [1, 2]
  );
  assert.deepEqual(present.day, { 1: 'a', 2: 'a' });
  assert.equal(present.detail.fehlstunden, undefined);
  assert.equal(present.detail.notiz, undefined);
  assert.equal(present.detail.verspaetung, 5);

  const excused = markAttendanceExcused(
    { 1: 'u', 2: 'a' },
    { fehlstunden: 1, notiz: 'Unentschuldigt' }
  );
  assert.deepEqual(excused.day, { 1: 'e', 2: 'a' });
  assert.equal(excused.detail.notiz, undefined);
});

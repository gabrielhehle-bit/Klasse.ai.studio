import test from 'node:test';
import assert from 'node:assert/strict';
import { getAttendanceReportingRange } from './attendancePeriod';
import { buildAttendanceTrendData, getStudentAttendanceStats } from './attendanceData';

test('attendance reporting periods use the selected local day and school year', () => {
  const range = (period: Parameters<typeof getAttendanceReportingRange>[0]) => getAttendanceReportingRange(period, '2026/27', 'VBG', '2026-10-08');
  assert.deepEqual(range('today'), { start: '2026-10-08', end: '2026-10-08' });
  assert.deepEqual(range('week'), { start: '2026-10-05', end: '2026-10-11' });
  assert.deepEqual(range('month'), { start: '2026-10-01', end: '2026-10-31' });
  assert.deepEqual(range('year'), { start: '2026-09-01', end: '2027-08-31' });
  assert.deepEqual(getAttendanceReportingRange('week', '2026/27', 'VBG', '2026-09-01'), { start: '2026-09-01', end: '2026-09-06' });
});

test('custom ranges are inclusive, clipped to the active year and reject invalid dates', () => {
  assert.deepEqual(getAttendanceReportingRange('custom', '2026/27', 'VBG', '2026-10-08', '2026-08-01', '2026-10-08'), { start: '2026-09-01', end: '2026-10-08' });
  for (const [from, to] of [['', ''], ['2026-10-09', '2026-10-08'], ['2026-02-31', '2026-10-08'], ['2025-01-01', '2025-02-01']]) {
    assert.equal(getAttendanceReportingRange('custom', '2026/27', 'VBG', '2026-10-08', from, to), null);
  }
  assert.equal(getAttendanceReportingRange('today', '2026/27', 'VBG', '2026-02-31'), null);
});

test('semester range follows the configured federal-state calendar', () => {
  const first = getAttendanceReportingRange('semester', '2026/27', 'VBG', '2027-02-12');
  const second = getAttendanceReportingRange('semester', '2026/27', 'VBG', '2027-02-22');
  assert.equal(first?.start, '2026-09-01');
  assert.equal(second?.end, '2027-08-31');
  assert.ok(first!.end < second!.start);
});

test('period table and trends count identical hours including detail-only dates without mutating records', () => {
  const attendance = { s: { '2026-10-04': { 1: 'u' }, '2026-10-05': { 1: 'e', 2: 'e' }, '2026-10-11': { 1: 'u' }, '2026-10-12': { 1: 'u' }, '2025-10-08': { 1: 'u' } } };
  const details = { s: { '2026-10-08': { fehlstunden: 3, notiz: 'Krank' } } };
  const copy = JSON.stringify({ attendance, details });
  const range = { start: '2026-10-05', end: '2026-10-11' };
  assert.deepEqual(getStudentAttendanceStats(attendance.s, details.s, '2026/27', 'VBG', range).total, { e: 5, u: 1, total: 6 });
  const trends = buildAttendanceTrendData(attendance, details, '2026/27', range);
  // Existing weekday trends intentionally omit weekend records.
  assert.equal(trends.weeklyData.reduce((sum, row) => sum + row.Entschuldigt + row.Unentschuldigt, 0), 5);
  assert.equal(getStudentAttendanceStats(attendance.s, details.s, '2026/27', 'VBG', null).total.total, 0);
  assert.equal(buildAttendanceTrendData(attendance, details, '2026/27', null).weeklyData.length, 0);
  assert.equal(JSON.stringify({ attendance, details }), copy);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { isAttendanceCompleteForDay, isAttendanceRequiredForDay } from './dashboardAttendance';

test('dashboard requires attendance only on configured school days', () => {
  assert.equal(isAttendanceRequiredForDay({
    studentCount: 20,
    activeHours: [1, 2, 3],
    isWeekend: false,
    holidayName: null,
  }), true);

  assert.equal(isAttendanceRequiredForDay({
    studentCount: 20,
    activeHours: [1, 2, 3],
    isWeekend: false,
    holidayName: 'Herbstferien',
  }), false);

  assert.equal(isAttendanceRequiredForDay({
    studentCount: 20,
    activeHours: [1, 2, 3],
    isWeekend: true,
    holidayName: null,
  }), false);

  assert.equal(isAttendanceRequiredForDay({
    studentCount: 20,
    activeHours: [],
    isWeekend: false,
    holidayName: null,
  }), false);

  assert.equal(isAttendanceRequiredForDay({
    studentCount: 20,
    activeHours: [1, 2],
    isWeekend: true,
    holidayName: 'Feiertag',
    calendarOverride: 'school',
  }), true);
});

test('dashboard only marks attendance recorded when every active hour exists for every student', () => {
  const students = [{ id: 'a' }, { id: 'b' }];
  const attendance = {
    a: { '2026-09-14': { 1: 'a', 2: 'e' } },
    b: { '2026-09-14': { 1: 'a', 2: 'a' } },
  };

  assert.equal(isAttendanceCompleteForDay(students, attendance, '2026-09-14', [1, 2]), true);
  assert.equal(isAttendanceCompleteForDay(students, attendance, '2026-09-14', [1, 2, 3]), false);
});

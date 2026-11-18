import test from 'node:test';
import assert from 'node:assert/strict';
import { countStudentsWithAttendanceForDay, countStudentsWithOpenAttendanceForDay, isAttendanceCompleteForDay, isAttendanceRequiredForDay } from './dashboardAttendance';

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

test('class overview counts student-first attendance for the selected day and class', () => {
  const students = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const attendance = {
    a: { '2026-10-01': { 1: 'a' }, '2026-10-02': { 1: 'f' } },
    b: { '2026-10-01': { 2: 'e' } },
    c: { '2026-10-01': {} },
    otherClass: { '2026-10-01': { 1: 'a' } },
  };
  assert.equal(countStudentsWithAttendanceForDay(students, attendance, '2026-10-01'), 2);
  assert.equal(countStudentsWithAttendanceForDay(students, attendance, '2026-10-02'), 1);
  assert.equal(countStudentsWithAttendanceForDay(students, undefined, '2026-10-01'), 0);
  assert.equal(isAttendanceCompleteForDay(students, attendance, '2026-10-01', [1, 2]), false);
});


test('today counts an open child once even if several attendance entries are missing', () => {
  const students = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const date = '2026-11-18';
  const attendance = {
    a: { [date]: { 1: 'a', 2: 'a', 3: 'e' } },
    b: { [date]: { 1: 'a' } },
    c: { '2026-11-17': { 1: 'a', 2: 'a', 3: 'a' } },
    otherClass: { [date]: { 1: 'a' } },
  };
  assert.equal(countStudentsWithOpenAttendanceForDay(students, attendance, date, [1, 2, 3]), 2);
  assert.equal(countStudentsWithOpenAttendanceForDay(students, attendance, date, []), 0);
});

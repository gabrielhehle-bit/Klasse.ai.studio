import test from 'node:test';
import assert from 'node:assert/strict';
import { getLocalDateKey, getSeatingPlanAbsentStudents, isStudentAbsentOnDate } from './seatingPlanData';

test('seating-plan date key uses the local calendar date', () => {
  const date = new Date(2026, 8, 14, 23, 45, 0);
  assert.equal(getLocalDateKey(date), '2026-09-14');
});

test('seat-plan absence detects excused, unexcused and detail-only absences', () => {
  const app = {
    anwesenheit: {
      a: { '2026-09-14': { 1: 'e' } },
      b: { '2026-09-14': { 1: 'u' } },
      c: { '2026-09-14': { 1: 'a' } },
    },
    anwesenheitDetail: {
      d: { '2026-09-14': { fehlstunden: 2, notiz: 'Arzt' } },
    },
  };

  assert.equal(isStudentAbsentOnDate(app, 'a', '2026-09-14'), true);
  assert.equal(isStudentAbsentOnDate(app, 'b', '2026-09-14'), true);
  assert.equal(isStudentAbsentOnDate(app, 'c', '2026-09-14'), false);
  assert.equal(isStudentAbsentOnDate(app, 'd', '2026-09-14'), true);

  assert.deepEqual(
    getSeatingPlanAbsentStudents(app, ['a', 'b', 'c', 'd'], new Date(2026, 8, 14, 8, 0, 0)),
    { a: true, b: true, c: false, d: true }
  );
});

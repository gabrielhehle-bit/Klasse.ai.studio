import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getPresentStudents } from '../components/cockpit/studentSelectionUtils';
import { computeKidAttendanceSummary } from './kidAttendanceAlgorithm';
import type { Student, AppState } from '../types';

test('Cockpit: ohne geladene Klassenliste niemals Demokinder in Gruppen oder Anwesenheit', () => {
  const empty = { schueler: [], anwesenheit: {} } as unknown as AppState;
  assert.deepEqual(getPresentStudents([], empty), []);
  assert.deepEqual(getPresentStudents(undefined, empty), []);
  assert.deepEqual(getPresentStudents([], undefined), []);
  const summary = computeKidAttendanceSummary(getPresentStudents(empty.schueler, empty) as Student[], empty, '2026-09-19');
  assert.equal(summary.total, 0);
  assert.equal(summary.present, 0);
});

test('Cockpit: Gruppen beziehen ausschließlich die aktiven echten Kinder', () => {
  const students = [
    { id: 'actual-1', vorname: 'Ada', nachname: 'Beispiel' },
    { id: 'actual-2', vorname: 'Bo', nachname: 'Beispiel', abwesend: true },
  ] as Student[];
  const app = { schueler: students, anwesenheit: {} } as unknown as AppState;
  assert.deepEqual(getPresentStudents(students, app).map(student => student.id), ['actual-1']);
});

test('Cockpit: Check-in-Komponente enthält keinen produktiven Mock-Fallback', () => {
  const source = readFileSync('src/components/cockpit/widgets/KidAttendanceWidget.tsx', 'utf8');
  assert.doesNotMatch(source, /DEFAULT_MOCK_STUDENTS/);
  assert.match(source, /app\.schueler\s*\?\?\s*\[\]/);
  assert.match(source, /Bitte zuerst eine Klasse auswählen/);
});

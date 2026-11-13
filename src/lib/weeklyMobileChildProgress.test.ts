import test from 'node:test';
import assert from 'node:assert/strict';
import { weekTaskKey } from './classroomWeeklyPlan';
import { summarizeChildTaskProgress } from './weeklyMobileChildProgress';

const key = weekTaskKey('2026/27', 46, 'Donnerstag', 2);
const otherKey = weekTaskKey('2026/27', 46, 'Freitag', 2);
const at = '2026-11-13T10:00:00Z';

test('Kinderfortschritt: fertig, offen und noch benötigte Hilfe getrennt zählen', () => {
  const students = [
    { wochenplanFortschritt: { [key]: { done: true, updatedAt: at } } },
    { wochenplanFortschritt: { [key]: { done: false, helpRequested: true, updatedAt: at } } },
    { wochenplanFortschritt: { [key]: { done: false, updatedAt: at } } },
    {},
  ];
  const before = structuredClone(students);
  assert.deepEqual(summarizeChildTaskProgress(students, key), {
    total: 4, done: 1, helpNeeded: 1, percentage: 25,
  });
  assert.deepEqual(students, before);
});

test('Kinderfortschritt: früherer Hilferuf eines fertigen Kindes zählt nicht als offene Hilfe', () => {
  assert.deepEqual(summarizeChildTaskProgress([
    { wochenplanFortschritt: { [key]: { done: true, helpRequested: true, updatedAt: at } } },
  ], key), { total: 1, done: 1, helpNeeded: 0, percentage: 100 });
});

test('Kinderfortschritt: Rückmeldungen anderer Stunden und Wochen zählen nicht', () => {
  assert.deepEqual(summarizeChildTaskProgress([
    { wochenplanFortschritt: { [otherKey]: { done: true, updatedAt: at } } },
    { wochenplanFortschritt: { [key]: { done: false, helpRequested: true, updatedAt: at } } },
  ], key), { total: 2, done: 0, helpNeeded: 1, percentage: 0 });
});

test('Kinderfortschritt: Leere Klasse und leerer Aufgabenschlüssel liefern keine erfundenen Erfolge', () => {
  assert.deepEqual(summarizeChildTaskProgress([], key), {
    total: 0, done: 0, helpNeeded: 0, percentage: 0,
  });
  assert.deepEqual(summarizeChildTaskProgress([{ wochenplanFortschritt: {
    [key]: { done: true, updatedAt: at },
  } }], ''), { total: 1, done: 0, helpNeeded: 0, percentage: 0 });
});

test('Kinderfortschritt: nur übergebene Klassenkinder berücksichtigen', () => {
  const visibleClass = [
    { wochenplanFortschritt: { [key]: { done: true, updatedAt: at } } },
    {},
  ];
  assert.deepEqual(summarizeChildTaskProgress(visibleClass, key), {
    total: 2, done: 1, helpNeeded: 0, percentage: 50,
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { weekTaskKey } from './classroomWeeklyPlan';
import { getPendingChildHelpRequests, summarizeChildTaskProgress } from './weeklyMobileChildProgress';

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

test('Hilferufe: nur die aktuell wartenden Kinder derselben Aufgabe nennen', () => {
  const pupils = [
    { id: 'a', vorname: 'Hilfekind', nachname: 'Beispiel',
      wochenplanFortschritt: { [key]: { done: false, helpRequested: true, updatedAt: at } } },
    { id: 'b', vorname: 'Fertig', nachname: 'Beispiel',
      wochenplanFortschritt: { [key]: { done: true, helpRequested: true, updatedAt: at } } },
    { id: 'c', vorname: 'Ohne', nachname: 'Hilferuf',
      wochenplanFortschritt: { [key]: { done: false, helpRequested: false, updatedAt: at } } },
    { id: 'd', vorname: 'Andere', nachname: 'Aufgabe',
      wochenplanFortschritt: { [otherKey]: { done: false, helpRequested: true, updatedAt: at } } },
  ];
  const original = structuredClone(pupils);
  assert.deepEqual(getPendingChildHelpRequests(pupils, key), [
    { studentId: 'a', displayName: 'Hilfekind Beispiel' },
  ]);
  assert.deepEqual(summarizeChildTaskProgress(pupils, key), {
    total: 4, done: 1, helpNeeded: 1, percentage: 25,
  });
  assert.deepEqual(pupils, original);
});

test('Hilferufe: ohne Aufgaben-ID und ohne Rückmeldungen niemals Namen zeigen', () => {
  const pupils = [{ id: 'p1', vorname: 'Lina', nachname: 'Muster',
    wochenplanFortschritt: { [key]: { done: false, helpRequested: true, updatedAt: at } } }];
  assert.deepEqual(getPendingChildHelpRequests(pupils, ''), []);
  assert.deepEqual(getPendingChildHelpRequests([], key), []);
  assert.deepEqual(getPendingChildHelpRequests([{ id: 'p2', name: 'Alex' }], key), []);
});

test('Hilferufe: Namensanzeige hat einen sicheren Fallback bei unvollständigen Altbeständen', () => {
  const pupils = [{ id: 'legacy', name: 'Eintrag Alt',
    wochenplanFortschritt: { [key]: { done: false, helpRequested: true, updatedAt: at } } }];
  assert.deepEqual(getPendingChildHelpRequests(pupils, key), [
    { studentId: 'legacy', displayName: 'Eintrag Alt' },
  ]);
});

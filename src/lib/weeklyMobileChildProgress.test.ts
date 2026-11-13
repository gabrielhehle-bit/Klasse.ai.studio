import test from 'node:test';
import assert from 'node:assert/strict';
import { weekTaskKey } from './classroomWeeklyPlan';
import { getPendingChildHelpRequests, summarizeChildTaskProgress, summarizeDailyPendingHelp } from './weeklyMobileChildProgress';

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

test('Tagesübersicht: mehrere Hilferufe derselben Kinder über Stunden korrekt zählen', () => {
  const first = weekTaskKey('2026/27', 46, 'Donnerstag', 0);
  const later = weekTaskKey('2026/27', 46, 'Donnerstag', 3);
  const pupils = [
    { id: 'a', vorname: 'Ada', nachname: 'Beispiel', wochenplanFortschritt: {
      [first]: { done: false, helpRequested: true, updatedAt: at },
      [later]: { done: false, helpRequested: true, updatedAt: at },
    } },
    { id: 'b', vorname: 'Ben', nachname: 'Beispiel', wochenplanFortschritt: {
      [first]: { done: true, helpRequested: true, updatedAt: at },
      [later]: { done: false, helpRequested: true, updatedAt: at },
    } },
  ];
  const plan = {
    0: { fach: 'Deutsch', thema: 'Silben', duration: 3, imKinderWochenplan: true },
    3: { fach: 'Mathematik', thema: 'Zahlen', imKinderWochenplan: true },
    4: { fach: 'Sport', thema: 'Bewegung', imKinderWochenplan: false },
    5: { fach: 'Deutsch', thema: '', imKinderWochenplan: true },
  };
  const before = structuredClone({ plan, pupils });
  assert.deepEqual(summarizeDailyPendingHelp(plan, pupils, '2026/27', 46, 'Donnerstag'), {
    requests: 3, children: 2, lessons: 2, slots: [
      { hourIndex: 0, subject: 'Deutsch', topic: 'Silben', requests: 1 },
      { hourIndex: 3, subject: 'Mathematik', topic: 'Zahlen', requests: 2 },
    ],
  });
  assert.deepEqual({ plan, pupils }, before);
});

test('Tagesübersicht: fremde Kalenderwoche, Wochentag oder unveröffentlichte Stunden sind nicht sichtbar', () => {
  const pupils = [{ id: 'a', name: 'Test', wochenplanFortschritt: {
    [key]: { done: false, helpRequested: true, updatedAt: at },
  } }];
  const published = { 2: { fach: 'Deutsch', thema: 'Lesen', imKinderWochenplan: true } };
  const unpublished = { 2: { fach: 'Deutsch', thema: 'Lesen', imKinderWochenplan: false } };
  const empty = { requests: 0, children: 0, lessons: 0, slots: [] };
  assert.deepEqual(summarizeDailyPendingHelp(published, pupils, '2026/27', 46, 'Freitag'), empty);
  assert.deepEqual(summarizeDailyPendingHelp(published, pupils, '2026/27', 45, 'Donnerstag'), empty);
  assert.deepEqual(summarizeDailyPendingHelp(unpublished, pupils, '2026/27', 46, 'Donnerstag'), empty);
  assert.deepEqual(summarizeDailyPendingHelp(undefined, pupils, '2026/27', 46, 'Donnerstag'), empty);
  assert.deepEqual(summarizeDailyPendingHelp(published, [], '2026/27', 46, 'Donnerstag'), empty);
  assert.deepEqual(summarizeDailyPendingHelp(published, pupils, '2026/27', 0, 'Donnerstag'), empty);
});

test('Tagesübersicht: bereits erledigte historische Hilferufe und nicht belegte Doppelstunden ignorieren', () => {
  const head = weekTaskKey('2026/27', 46, 'Donnerstag', 0);
  const covered = weekTaskKey('2026/27', 46, 'Donnerstag', 1);
  const pupils = [{ id: 'a', wochenplanFortschritt: {
    [head]: { done: true, helpRequested: true, updatedAt: at },
    [covered]: { done: false, helpRequested: true, updatedAt: at },
  } }];
  const plan = { 0: { fach: 'Deutsch', thema: 'Lesen', duration: 2, imKinderWochenplan: true } };
  assert.deepEqual(summarizeDailyPendingHelp(plan, pupils, '2026/27', 46, 'Donnerstag'), {
    requests: 0, children: 0, lessons: 0, slots: [],
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { filterChronicleEntries } from './behaviorChronicle';

const entries: any[] = [
  {
    id: 'journal',
    datum: '2026-09-14T08:00:00.000Z',
    kategorie: 'Journal',
    inhalt: 'Ausflug besprochen',
  },
  {
    id: 'behavior',
    datum: '2026-09-14T09:00:00.000Z',
    kategorie: 'Verhalten',
    inhalt: 'Sehr konzentriert gearbeitet',
    schuelerId: 's1',
  },
  {
    id: 'success',
    datum: '2026-09-14T10:00:00.000Z',
    kategorie: 'Erfolg',
    inhalt: 'Lesefortschritt sichtbar',
    schuelerId: 's2',
  },
];

const students = [
  { id: 's1', vorname: 'Anna', nachname: 'Muster' },
  { id: 's2', vorname: 'Ben', nachname: 'Beispiel' },
];

test('student filter uses the linked child, not only the Verhalten category', () => {
  assert.deepEqual(
    filterChronicleEntries(entries, 'student', '', students).map(entry => entry.id),
    ['behavior', 'success']
  );
});

test('chronicle search includes linked student names', () => {
  assert.deepEqual(
    filterChronicleEntries(entries, 'all', 'Beispiel', students).map(entry => entry.id),
    ['success']
  );
  assert.deepEqual(
    filterChronicleEntries(entries, 'student', 'Anna', students).map(entry => entry.id),
    ['behavior']
  );
});

test('Allgemein filter includes class-level notes regardless of category', () => {
  assert.deepEqual(
    filterChronicleEntries(entries, 'journal', '', students).map(entry => entry.id),
    ['journal']
  );
  assert.deepEqual(filterChronicleEntries([
    ...entries,
    { id: 'general-note', datum: '2026-09-14', kategorie: 'Notiz', inhalt: 'Material bestellen' }
  ], 'journal', '', students).map(entry => entry.id), ['journal', 'general-note']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { logObservation } from './utils';

test('Fachbezogene Notiz bleibt einem Kind und seinem Bereich zugeordnet', () => {
  let state: any = { notes: [], journal: [], schueler: [{ id: 'test-kind-1' }] };
  const setApp = (update: (before: any) => any) => { state = update(state); };
  logObservation(setApp, 'test-kind-1', 'Übt das Lesen', 'Notiz', 'Notizen-Hauptbereich', undefined, {
    fach: 'Deutsch', teilbereich: 'Lesen',
  });
  assert.equal(state.notes.length, 1);
  assert.equal(state.notes[0].schuelerId, 'test-kind-1');
  assert.equal(state.notes[0].fach, 'Deutsch');
  assert.equal(state.notes[0].teilbereich, 'Lesen');
  assert.equal(state.journal[0].id, state.notes[0].id);

  logObservation(setApp, undefined, 'Allgemeine Klassennotiz', 'Journal',
    'Notizen-Hauptbereich', undefined, { fach: 'Deutsch', teilbereich: 'Schreiben' });
  assert.equal(state.notes[1].fach, undefined,
    'Eine allgemeine Notiz darf kein vorher gewähltes Kinder-Fach erben.');
  assert.equal(state.notes[1].teilbereich, undefined);
});

test('Wochenplanung startet aktuell, ohne Unterrichtsplan oder Noten zu überschreiben', () => {
  const source = readFileSync('src/components/WeeklyPlan.tsx', 'utf8');
  assert.match(source, /const actualKW = getKW\(actualToday\)/);
  assert.match(source, /setApp\(previous => previous\.currentKW === actualKW/);
  assert.match(source, /\{ \.\.\.previous, currentKW: actualKW \}/);
  assert.match(source, /\}, \[\]\);/);
});

test('Eigene Lernziele werden je Kind verschlüsselt gespeichert und beim Bearbeiten nicht neu identifiziert', () => {
  const source = readFileSync('src/components/StudentLernziele.tsx', 'utf8');
  assert.match(source, /pupil\.id !== schuelerId/);
  assert.match(source, /manuelleLernziele/);
  assert.match(source, /existing\?\.id \|\|/);
  assert.match(source, /current\.map\(item => item\.id === existing\.id \? goal : item\)/);
  assert.match(source, /Eigenes Lernziel bearbeiten/);
});

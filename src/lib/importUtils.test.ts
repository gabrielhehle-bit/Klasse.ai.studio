import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSokratesCSV } from './importUtils';

test('Sokrates CSV keeps missing gender and first language empty', () => {
  const result = parseSokratesCSV('Vorname;Nachname;Geburtsdatum\nMia;Muster;03.04.2018');
  assert.equal(result.students.length, 1);
  assert.equal(result.students[0].geschlecht, '');
  assert.equal(result.students[0].erstsprache, '');
  assert.equal(result.students[0].geburtstag, '2018-04-03');
});

test('Sokrates CSV normalizes known gender values without guessing unknown values', () => {
  const result = parseSokratesCSV(
    'Vorname;Nachname;Geschlecht;Erstsprache\nMax;Muster;männlich;Deutsch\nEva;Muster;female;Türkisch\nAlex;Muster;unbekannt;'
  );
  assert.deepEqual(
    result.students.map(student => student.geschlecht),
    ['m', 'w', ''],
  );
  assert.deepEqual(
    result.students.map(student => student.erstsprache),
    ['Deutsch', 'Türkisch', ''],
  );
});

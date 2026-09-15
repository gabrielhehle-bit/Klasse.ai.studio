import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseKlassenliste } from './klassenlistenImport';

test('class-list import validates birthdays and does not invent missing gender', () => {
  const result = parseKlassenliste([
    'Nachname;Vorname;Geburtsdatum;Geschlecht',
    'Muster;Max;15.09.17;m',
    'Müller;Anna;31.02.2018;'
  ].join('\n'));

  assert.equal(result.schueler.length, 2);
  assert.equal(result.schueler[0].geburtstag, '2017-09-15');
  assert.equal(result.schueler[0].geschlecht, 'm');
  assert.equal(result.schueler[1].geburtstag, undefined);
  assert.equal(result.schueler[1].geschlecht, '');
});

test('all app import handoffs normalize gender before storing students', () => {
  const listImport = readFileSync(new URL('../components/KlassenlistenImport.tsx', import.meta.url), 'utf8');
  const sokrates = readFileSync(new URL('./sokratesParser.ts', import.meta.url), 'utf8');
  assert.match(listImport, /geschlecht:\s*normalizeStudentGender\(s\.geschlecht\)/);
  assert.match(sokrates, /geschlecht:\s*normalizeStudentGender\(s\.geschlecht\)/);
  assert.doesNotMatch(listImport, /geschlecht:\s*s\.geschlecht\s*\|\|\s*['"]w['"]/);
  assert.doesNotMatch(sokrates, /geschlecht:\s*s\.geschlecht\s*\|\|\s*['"]w['"]/);
});

test('student editor supports divers and printed list uses current Klassio branding', () => {
  const studentList = readFileSync(new URL('../components/StudentList.tsx', import.meta.url), 'utf8');
  assert.match(studentList, /<option value="divers">divers<\/option>/);
  assert.match(studentList, /Gedruckt mit Klassio/);
  assert.doesNotMatch(studentList, /SchoolBase Pro/);
});

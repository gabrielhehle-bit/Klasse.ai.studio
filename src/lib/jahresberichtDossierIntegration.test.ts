import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const report = readFileSync('src/components/Jahresbericht.tsx', 'utf8');
const dossier = readFileSync('src/components/dossier/DossierBerichte.tsx', 'utf8');
const classroom = readFileSync('src/components/KlasseHub.tsx', 'utf8');
const performances = readFileSync('src/components/LeistungenHub.tsx', 'utf8');
const sidebar = readFileSync('src/components/Sidebar.tsx', 'utf8');
const types = readFileSync('src/types.ts', 'utf8');
const model = readFileSync('src/lib/appState.ts', 'utf8');

test('reports are edited for one child in dossier and class organization is separate', () => {
  assert.match(dossier, /Jahresbericht key=\{student.id\} studentId=\{student.id\}/);
  assert.match(report, /const isDossierView = Boolean\(studentId\)/);
  assert.match(report, /!isDossierView && <div className="flex-1 min-h-\[300px\]/);
  assert.match(classroom, /id: 'jahresbericht',[\s\S]*title: 'Jahresabschluss'/);
  assert.match(sidebar, /id: 'jahresbericht', label: 'Jahresabschluss'/);
  assert.doesNotMatch(performances, /id: 'jahresbericht'/);
});

test('only opted-in data is sent; two semesters and all note sources are available', () => {
  assert.match(report, /\(\['1', '2'\] as const\)\.flatMap/);
  assert.match(report, /getStudentNotes\(app, id\)/);
  assert.match(report, /includeObservations\s*\? studentObs\.filter/);
  assert.match(report, /selectedObservationIds\.includes\(observationKey\(entry\)\)/);
  assert.match(report, /includeKel \? getLatestKelForStudent/);
  assert.match(report, /includeFoerder \? s\.foerderprofil\?\.foerderziele/);
  assert.match(report, /const hasExplicitEvidence =/);
  assert.match(report, /window\.confirm\('Nur die ausgewählten schulischen Daten/);
  assert.doesNotMatch(report, /triggerAllGenerations/);
});

test('edited or regenerated reports preserve previous school-year revisions; class count is year-scoped', () => {
  assert.match(types, /verlauf\?: \{/);
  assert.match(report, /verlauf: \[/);
  assert.match(report, /prev\.jahresberichte\[studentId\]\.inhalt/);
  assert.match(report, /reportForTerm\(studentId\)/);
  assert.match(report, /students\.filter\(s => Boolean\(reportForTerm\(s\.id\)\)\)/);
  assert.match(report, /reportForTerm\(id\)\?\.reviewStatus === 'freigegeben'/);
  assert.match(report, /reviewStatus: 'offen'/);
  assert.match(model, /jahresberichte: state\.jahresberichte/);
});

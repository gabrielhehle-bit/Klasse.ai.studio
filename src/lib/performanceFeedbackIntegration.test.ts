import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name: string) => readFileSync(name, 'utf8');
const editor = read('src/components/VerbalAssessment.tsx');
const dossier = read('src/components/StudentDossier.tsx');
const gradebook = read('src/components/Gradebook.tsx');
const app = read('src/App.tsx');
const hub = read('src/components/LeistungenHub.tsx');

test('feedback is one editor available in gradebook and preselected student dossier', () => {
  assert.match(gradebook, /<VerbalAssessment mode="feedback" initialSubject=\{activeFach\}/);
  assert.match(gradebook, /> Leistungsfeedback/);
  assert.match(dossier, /id: 'leistungsfeedback', label: 'Leistungsfeedback erstellen'/);
  assert.match(dossier, /<VerbalAssessment mode="feedback" initialStudentId=\{student\.id\}/);
  assert.match(editor, /disabled=\{Boolean\(initialStudentId\)\}/);
  assert.match(editor, /setSelectedStudentId\(initialStudentId \|\| ''\)/);
});

test('formal verbal assessment remains its own entry, not a renamed feedback duplicate', () => {
  assert.match(app, /case 'verbal': return <VerbalAssessment mode="formal" \/>/);
  assert.match(hub, /id: 'verbal'/);
  assert.match(editor, /isFormal \? 'Verbale Beurteilung' : 'Leistungsfeedback'/);
  assert.match(editor, /Keine Note vorschlagen/);
});

test('only explicitly selected subjects and manually reviewed notes enter AI prompt', () => {
  assert.match(editor, /selectedSubjects\.map\(fach =>/);
  assert.match(editor, /n\.schuelerId === selectedStudentId/);
  assert.match(editor, /copyObservationIntoEditor\(note\)/);
  assert.match(editor, /reviewedObservations/);
  assert.match(editor, /focus\.trim\(\) \|\| '- Keine Beobachtungen angegeben\.'/);
  assert.match(editor, /KIND-ALIAS: Kind A/);
  assert.doesNotMatch(editor, /student\.vorname.*prompt|student\.nachname.*prompt/);
  assert.match(editor, /requestRef\.current !== requestId/);
});

test('saving reviewed feedback is intentional and bound to the selected child', () => {
  assert.match(editor, /if \(!result\.trim\(\) \|\| !student \|\| student\.id !== resultStudentId \|\| resultClassId !== app\.activeClassId \|\| savedInDossier\) return/);
  assert.match(editor, /logObservation\(setApp, student\.id, result\.trim\(\), 'Notiz'/);
  assert.match(editor, /Im Schülerdossier speichern/);
  assert.match(editor, /setSavedInDossier\(true\)/);
  assert.match(editor, /setResultClassId\(classIdAtStart\)/);
  assert.doesNotMatch(editor, /setApp\([^)]*noten\s*:/);
});

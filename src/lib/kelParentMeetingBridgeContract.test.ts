import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const print = readFileSync('src/components/PrintCenter.tsx', 'utf8');
const report = readFileSync('src/components/KELParentReport.tsx', 'utf8');
const kel = readFileSync('src/components/KELGespraeche.tsx', 'utf8');
const dossier = readFileSync('src/components/StudentDossier.tsx', 'utf8');

test('all three KEL entry points use the same parent-sheet template and current child', () => {
  assert.match(dossier, /activePrintTemplate: 'kel_elternblatt', activePrintStudentId: student.id/);
  assert.match(kel, /activePrintTemplate: 'kel_elternblatt',\s*activePrintStudentId: student.id/);
  assert.match(kel, /Elternblatt mit Diagrammen/);
  assert.match(print, /case 'kel_elternblatt':/);
  assert.match(print, /<KELParentReport studentId=\{targetSt.id\} options=\{elternblattOptions\}/);
});

test('saved meeting goals and agreements enter the parent report only after a button click', () => {
  assert.match(print, /data-kel-meeting-import-controls/);
  assert.match(print, /listKelParentMeetingSources\(\s*app\.kelGespraeche, elternblattSelectedStudentId, app\.schuljahr/);
  assert.match(print, /value=\{elternblattSavedMeetingId\}/);
  assert.match(print, /disabled=\{!selectedElternblattMeeting\}/);
  assert.match(print, /onClick=\{\(\) => \{\s*const source = selectedElternblattMeeting/);
  assert.match(print, /const draft = draftKelParentMeetingText\(source\)/);
  assert.match(print, /setElternblattGoalsText\(draft\.goalsText\)/);
  assert.match(print, /setElternblattAgreementsText\(draft\.agreementsText\)/);
  assert.match(print, /setElternblattMeetingSourceDate\(draft\.sourceDate\)/);
  assert.match(print, /window\.confirm\('Vorhandene Texte bei Zielen und Vereinbarungen/);
  assert.doesNotMatch(report, /setApp\(/);
});

test('selected protocol and its provenance are discarded on switching child, class or template', () => {
  const resets = print.match(/setElternblattSavedMeetingId\(''\);\s*setElternblattMeetingSourceDate\(''\);/g) || [];
  assert.ok(resets.length >= 4, 'all four existing per-pupil session reset paths are protected');
  assert.match(print, /setElternblattSelectedStudentId\(event\.target\.value\);[\s\S]*?setElternblattSavedMeetingId\(''\)/);
  assert.match(print, /setElternblattSelectedStudentId\(app\.activePrintStudentId\);[\s\S]*?setElternblattSavedMeetingId\(''\)/);
  assert.match(report, /options\.meetingSourceDate &&/);
  assert.match(report, /Vorlage für Ziele und Vereinbarungen aus dem gespeicherten KEL-Protokoll vom/);
});

test('internal dossier notes remain explicitly opt-in, never included via protocol import', () => {
  assert.match(print, /Ausgewählte Dossiernotizen für Eltern freigeben/);
  assert.match(print, /const \[elternblattShowNotes, setElternblattShowNotes\] = useState\(false\)/);
  assert.match(print, /Nur die Ziele des Kindes und die Vereinbarungen werden nach deinem Klick übernommen/);
  assert.match(print, /Interne Notizen, Bewertungen und Elterneindrücke bleiben ausgeschlossen/);
  assert.match(report, /options\.sharedNoteIds\.includes\(note\.id\)/);
});

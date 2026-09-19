import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/components/KELPresentation.tsx', 'utf8');

test('KEL core presentation starts with conversation flow instead of ranking data', () => {
  assert.match(source, /Schön, dass wir heute gemeinsam hinschauen/);
  assert.match(source, /Ein Gespräch, keine Datenshow/);
  assert.match(source, /Heute geht es nicht darum, dich mit anderen zu vergleichen/);
  assert.doesNotMatch(source, /overallClassSchnitt|classAvgAttendance|Klasse Ø|Klassen-Ø/);
  assert.doesNotMatch(source, /gesamtSchnitt/);
});

test('parent-facing KEL deck only uses explicitly selected portfolio entries and documented voices', () => {
  assert.match(source, /filter\(\(entry: any\) => entry\.isInKEL\)/);
  assert.match(source, /selbsteinschaetzungKind/);
  assert.match(source, /elternEindruck/);
  assert.match(source, /einschaetzungLehrperson/);
  assert.doesNotMatch(source, /student\.notiz/);
  assert.doesNotMatch(source, /getStudentNotes/);
  assert.doesNotMatch(source, /klassenkasse|financeSummary|totalKasse/);
});

test('attendance and diagnostics are opt-in instead of default presentation slides', () => {
  assert.match(source, /attendance: false/);
  assert.match(source, /diagnostics: false/);
  assert.match(source, /standardmäßig ausgeblendet/);
  assert.match(source, /Interne Notizen, Klassenvergleiche, Klassenkasse/);
});

test('learning slide respects assessment mode and does not invent a cross-subject average', () => {
  assert.match(source, /getAssessmentMode\(app, fach\)/);
  assert.match(source, /mode === 'grades'/);
  assert.match(source, /berechneter Prozentstand/);
  assert.doesNotMatch(source, /reduce\(.*avg|Durchschnittsnote|Gesamtnote/);
});

test('meeting agreement is only persisted by an explicit save action', () => {
  assert.match(source, /const saveAgreement = \(\) =>/);
  assert.match(source, /Vereinbarung speichern/);
  assert.doesNotMatch(source, /onChange=.*setApp/);
});

test('PowerPoint export follows the same safe slide list as on-screen presentation', () => {
  assert.match(source, /for \(const slideData of slides\)/);
  assert.match(source, /slideData\.type === 'voices'/);
  assert.match(source, /slideData\.type === 'portfolio'/);
  assert.match(source, /slideData\.type === 'closing'/);
  assert.doesNotMatch(source, /ChartType\.bar|ChartType\.pie|ChartType\.radar/);
});

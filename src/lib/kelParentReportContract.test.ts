import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dossier = readFileSync('src/components/StudentDossier.tsx', 'utf8');
const printCenter = readFileSync('src/components/PrintCenter.tsx', 'utf8');
const report = readFileSync('src/components/KELParentReport.tsx', 'utf8');

test('the student dossier opens the shared parent sheet using the current child only', () => {
  assert.match(dossier, /activePrintTemplate: 'kel_elternblatt', activePrintStudentId: student.id/);
  assert.match(dossier, /KEL-Elternblatt drucken/);
  assert.match(printCenter, /case 'kel_elternblatt':/);
  assert.match(printCenter, /<KELParentReport studentId=\{targetSt.id\} options=\{elternblattOptions\}/);
  assert.match(printCenter, /setElternblattSelectedStudentId\(app.activePrintStudentId\)/);
});

test('private observation notes stay closed by default and require explicit per-note selection', () => {
  assert.match(printCenter, /const \[elternblattShowNotes, setElternblattShowNotes\] = useState\(false\)/);
  assert.match(printCenter, /const \[elternblattSharedNoteIds, setElternblattSharedNoteIds\] = useState<string\[\]>\(\[\]\)/);
  assert.match(printCenter, /setElternblattSelectedStudentId\(event.target.value\); setElternblattSharedNoteIds\(\[\]\)/);
  assert.match(printCenter, /Ausgewählte Dossiernotizen für Eltern freigeben/);
  assert.match(printCenter, /checked=\{elternblattSharedNoteIds.includes\(note.id\)\}/);
  assert.match(report, /options.showNotes\s*\?\s*notes.filter\(/);
  assert.match(report, /options.sharedNoteIds.includes\(note.id\)/);
  assert.doesNotMatch(report, /setApp\(/);
});

test('charts rely on real stored child data, not fabricated assessment scores', () => {
  assert.match(report, /getDossierOverviewStats\(app, studentId, options.period\)/);
  assert.match(report, /getStudentSubjectParticipationSummary\(app, studentId, subject, '1'\)/);
  assert.match(report, /getStudentAssessmentDomainPerformance\(app, studentId, subject, '1'\)/);
  assert.match(report, /moodSamples > 0 \? moodSum \/ moodSamples : null/);
  assert.match(report, /row.assessments/);
  assert.match(report, /Keine dokumentierten Verhaltensereignisse/);
  assert.match(report, /Keine auswertbaren Lernbereiche|Noch keine auswertbaren Lernbereiche/);
});

test('A4 sheet is a dedicated Print Center template without an additional school header', () => {
  assert.match(printCenter, /id: 'kel_elternblatt'.*KEL-Elternblatt/);
  assert.match(printCenter, /activeTemplate !== 'kel_elternblatt' && activeTemplate !== 'klassenbuch'/);
  assert.match(report, /data-kel-parent-report/);
  assert.match(report, /Lern- &amp; Entwicklungsübersicht/);
  assert.match(report, /Gesprächsnotizen &amp; Vereinbarungen/);
  assert.match(report, /Unterschriften|Erziehungsberechtigte/);
});

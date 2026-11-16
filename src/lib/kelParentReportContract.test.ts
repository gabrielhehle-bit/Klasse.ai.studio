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
  assert.match(printCenter, /<KELParentReport studentId=\{selectedParentStudent.id\} options=\{elternblattOptions\}/);
  assert.match(printCenter, /setElternblattSelectedStudentId\(app.activePrintStudentId\)/);
});

test('private observation notes stay closed by default and require explicit per-note selection', () => {
  assert.match(printCenter, /const \[elternblattShowNotes, setElternblattShowNotes\] = useState\(false\)/);
  assert.match(printCenter, /const \[elternblattSharedNoteIds, setElternblattSharedNoteIds\] = useState<string\[\]>\(\[\]\)/);
  assert.match(printCenter, /setElternblattSelectedStudentId\(event.target.value\);\s*setElternblattShowNotes\(false\);\s*setElternblattSharedNoteIds\(\[\]\)/);
  assert.match(printCenter, /Ausgewählte Dossiernotizen für Eltern freigeben/);
  assert.match(printCenter, /checked=\{elternblattSharedNoteIds.includes\(note.id\)\}/);
  assert.match(report, /options.showNotes\s*\?\s*notes.filter\(/);
  assert.match(report, /options.sharedNoteIds.includes\(note.id\)/);
  assert.doesNotMatch(report, /setApp\(/);
});

test('charts rely on real stored child data, not fabricated assessment scores', () => {
  assert.match(report, /getDossierOverviewStats\(app, studentId, options.period\)/);
  assert.match(report, /getStudentSubjectYearParticipationSummary\(app, studentId, subject\)/);
  assert.match(report, /getStudentAssessmentDomainPerformance\(app, studentId, subject, 'both'\)/);
  assert.match(report, /summarizeKelMood\(app\.schuelerStimmung\?\.\[studentId\], stats\.start, stats\.today\)/);
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

test('KEL parent-facing feedback is typed explicitly and never saved as a child record', () => {
  for (const field of ['elternblattStrengthsText', 'elternblattGoalsText', 'elternblattAgreementsText']) {
    assert.match(printCenter, new RegExp('const \\[' + field + ', set'));
    assert.match(printCenter, new RegExp('value=\\{' + field + '\\}'));
  }
  assert.match(printCenter, /data-kel-parent-editor-controls/);
  assert.match(printCenter, /strengthsText: elternblattStrengthsText/);
  assert.match(printCenter, /goalsText: elternblattGoalsText/);
  assert.match(printCenter, /agreementsText: elternblattAgreementsText/);
  assert.match(report, /strengthLines\.map/);
  assert.match(report, /goalLines\.map/);
  assert.match(report, /agreementLines\.map/);
  assert.doesNotMatch(report, /setApp\(/);
  assert.match(printCenter, /setElternblattStrengthsText\(''\);\s*setElternblattGoalsText\(''\);\s*setElternblattAgreementsText\(''\)/);
});

test('saved KEL goal observations require a separate per-entry opt-in in the shared parent sheet', () => {
  assert.match(printCenter, /data-kel-parent-goal-progress-controls/);
  assert.match(printCenter, /const \[elternblattShowGoalProgress, setElternblattShowGoalProgress\] = useState\(false\)/);
  assert.match(printCenter, /const \[elternblattSharedProgressKeys, setElternblattSharedProgressKeys\] = useState<string\[\]>\(\[\]\)/);
  assert.match(printCenter, /data-kel-parent-goal-progress-enable/);
  assert.match(printCenter, /data-kel-parent-goal-progress-checkbox/);
  assert.match(printCenter, /setElternblattSharedProgressKeys\(\[\]\)/);
  assert.match(printCenter, /progressMeetingId: selectedElternblattMeeting\?\.id \|\| ''/);
  assert.match(report, /options\.showGoalProgress\s*\? selectKelParentGoalProgress\(/);
  assert.match(report, /data-kel-parent-goal-progress-print/);
  assert.match(report, /data-kel-parent-goal-progress-item/);
  assert.match(report, /selectedGoalProgress\.length > 0/);
  assert.doesNotMatch(report, /setApp\(/);
});

test('switching child, protocol or print template resets consent and prevents stale progress', () => {
  assert.match(printCenter, /setElternblattSelectedStudentId\(event\.target\.value\);\s*setElternblattShowNotes\(false\);\s*setElternblattSharedNoteIds\(\[\]\);\s*setElternblattShowGoalProgress\(false\);\s*setElternblattSharedProgressKeys\(\[\]\)/);
  assert.match(printCenter, /setElternblattSavedMeetingId\(event\.target\.value\);\s*setElternblattShowGoalProgress\(false\);\s*setElternblattSharedProgressKeys\(\[\]\)/);
  assert.match(printCenter, /if \(activeTemplate === 'kel_elternblatt'\)/);
  assert.match(printCenter, /setElternblattSharedNoteIds\(\[\]\);\s*setElternblattShowGoalProgress\(false\);\s*setElternblattSharedProgressKeys\(\[\]\)/);
  assert.match(printCenter, /if \(!event\.target\.checked\) setElternblattSharedProgressKeys\(\[\]\)/);
});

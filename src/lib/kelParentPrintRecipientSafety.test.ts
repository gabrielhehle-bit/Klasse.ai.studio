import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const print = readFileSync('src/components/PrintCenter.tsx', 'utf8');
const report = readFileSync('src/components/KELParentReport.tsx', 'utf8');

test('the parent sheet never silently switches to the first child', () => {
  assert.match(print, /const \[elternblattSelectedStudentId, setElternblattSelectedStudentId\] = useState<string>\(''\)/);
  assert.match(print, /const selectedParentStudent = students\.find\(student => student\.id === elternblattSelectedStudentId\)/);
  assert.doesNotMatch(print, /students\.find\(st => st\.id === elternblattSelectedStudentId\) \|\| students\[0\]/);
  assert.match(print, /return selectedParentStudent\s*\? <KELParentReport studentId=\{selectedParentStudent\.id\}/);
  assert.match(print, /data-testid="kel-parent-no-student"/);
  assert.match(print, /<option value="">Bitte Kind auswählen<\/option>/);
});

test('printing parent sheet stays blocked without a current-class child even if button is invoked programmatically', () => {
  assert.match(print, /if \(activeTemplate === 'kel_elternblatt' && !selectedParentStudent\) return;/);
  assert.match(print, /data-testid="print-center-primary-print"/);
  assert.match(print, /disabled=\{students\.length === 0 \|\| \(activeTemplate === 'materialabholung' && !pickupCanPrint\) \|\| \(activeTemplate === 'kel_elternblatt' && !selectedParentStudent\)\}/);
  assert.match(print, /Bitte zuerst das Kind auswählen\. Erst dann ist Drucken oder PDF möglich/);
});

test('class switch requires confirmation of student and clears sensitive per-child choices', () => {
  assert.match(print, /setElternblattSelectedStudentId\(app\.activePrintStudentId && students\.some\(st => st\.id === app\.activePrintStudentId\) \? app\.activePrintStudentId : ''\)/);
  assert.match(print, /\}, \[app\?\.activeClassId\]\);/);
  assert.match(print, /setElternblattSelectedStudentId\(event\.target\.value\);\s*setElternblattShowNotes\(false\);\s*setElternblattSharedNoteIds\(\[\]\)/);
  assert.match(print, /setElternblattShowGoalProgress\(false\);\s*setElternblattSharedProgressKeys\(\[\]\)/);
  assert.match(print, /const belongsToActiveClass = students\.some\(/);
  assert.match(print, /setElternblattSelectedStudentId\(app\.activePrintStudentId\)/);
});

test('preview preflight shows exact recipient, consent counts and signatures without exposing note text', () => {
  assert.match(print, /data-testid="kel-parent-print-preflight"/);
  assert.match(print, /Elternblatt für \{selectedParentStudent\.vorname\} \{selectedParentStudent\.nachname\}/);
  assert.match(print, /approvedParentNoteCount/);
  assert.match(print, /approvedParentGoalCount/);
  assert.match(print, /elternblattNotes\.filter\(\(note: any\) => elternblattSharedNoteIds\.includes\(note\.id\)\)/);
  assert.match(print, /elternblattProgressChoices\.filter\(item => elternblattSharedProgressKeys\.includes\(item\.key\)\)/);
  assert.match(print, /Bitte alle angezeigten Aussagen in der Vorschau vor der Weitergabe prüfen/);
  assert.match(print, /Elternblatt drucken \/ PDF/);
  assert.match(report, /data-kel-signature-space/);
  assert.match(report, /min-h-\[34mm\]/);
  assert.match(report, /options\.showSignatures/);
});

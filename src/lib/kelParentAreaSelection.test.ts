import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { selectKelParentLearningAreas } from './kelParentAreaSelection';

const documented = [
  { area: 'Lesen', percent: 75, assessments: 3 },
  { area: 'Schreiben', percent: 40, assessments: 2 },
  { area: 'Rechtschreiben', percent: 60, assessments: 1 },
  { area: 'Sprechen', percent: 90, assessments: 4 },
  { area: 'Zuhören', percent: 80, assessments: 2 },
];

test('default parent sheet keeps original compact top-four learning areas', () => {
  assert.deepEqual(selectKelParentLearningAreas(documented).map(row => row.area),
    ['Lesen', 'Schreiben', 'Rechtschreiben', 'Sprechen']);
  assert.equal(documented.length, 5);
});

test('teacher selection shows only real, documented and allowed areas with unchanged scores', () => {
  const current = structuredClone(documented);
  const selected = selectKelParentLearningAreas(documented, ['Zuhören', 'Lesen', 'Nicht vorhanden']);
  assert.deepEqual(selected, [documented[0], documented[4]]);
  assert.deepEqual(documented, current);
  assert.equal(selected[0].percent, 75);
  assert.equal(selected[1].assessments, 2);
});

test('explicitly deselecting all areas does not fabricate any output or restore defaults', () => {
  assert.deepEqual(selectKelParentLearningAreas(documented, []), []);
  assert.deepEqual(selectKelParentLearningAreas([], undefined), []);
  assert.deepEqual(selectKelParentLearningAreas(documented, ['Kein Nachweis']), []);
});

test('more than four explicitly selected areas print without silent truncation or duplicates', () => {
  const result = selectKelParentLearningAreas(documented, [
    'Lesen', 'Schreiben', 'Rechtschreiben', 'Sprechen', 'Zuhören', 'Lesen',
  ]);
  assert.equal(result.length, 5);
  assert.deepEqual(result.map(row => row.area), ['Lesen', 'Schreiben', 'Rechtschreiben', 'Sprechen', 'Zuhören']);
});

const print = readFileSync('src/components/PrintCenter.tsx', 'utf8');
const report = readFileSync('src/components/KELParentReport.tsx', 'utf8');

test('Print Center exposes explicit per-subject options scoped to the selected pupil', () => {
  assert.match(print, /data-kel-parent-area-picker/);
  assert.match(print, /data-kel-parent-area-subject=\{fach\}/);
  assert.match(print, /getStudentAssessmentDomainPerformance\(app, elternblattSelectedStudentId, fach, 'both'\)/);
  assert.match(print, /subjectAreas: elternblattSubjectAreas/);
  assert.match(print, /setElternblattSubjectAreas\(previous =>/);
  assert.doesNotMatch(print, /disabled=\{!checked && selected.length >= 4\}/);
  assert.match(print, /Die Auswahl gilt nur für diesen Ausdruck/);
  assert.match(report, /subject\.rows\.map\(/);
  assert.doesNotMatch(report, /subject\.rows\.slice\(0, 4\)/);
  assert.match(report, /selectKelParentLearningAreas\(documented, selected\)/);
});

test('per-child KEL selections reset when another child or print template opens', () => {
  assert.match(print, /setElternblattSelectedStudentId\(event.target.value\);[\s\S]*?setElternblattSubjectAreas\(\{\}\)/);
  assert.match(print, /if \(activeTemplate === 'kel_elternblatt'\)[\s\S]*?setElternblattSubjectAreas\(\{\}\)/);
  assert.match(report, /intentionallyHiddenAreas/);
  assert.match(report, /Für diesen Ausdruck wurden keine dokumentierten Lernbereiche ausgewählt/);
  assert.match(report, /<Section title="Lernen" detail="Ganzes Schuljahr" allowPageBreak>/);
});

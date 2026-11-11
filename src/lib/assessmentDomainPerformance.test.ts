import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getStudentAssessmentDomainPerformance } from './assessmentDomainPerformance';
import { updateSubjectColumn } from './classroomEdits';
import { getKelGradebookAssessments, pickKelAssessments } from './kelGradebookSelection';

function fixture(): any {
  return {
    schueler: [{ id: 'a' }, { id: 'b' }],
    faecher: ['Deutsch', 'Mathematik'],
    notenMeta: {
      Deutsch: {
        assessmentMode: 'grades',
        colAreas: { lzk: { 0: 'Lesen', 1: 'Rechtschreibung', 2: 'Lesen' },
          obj: { 0: 'Lesen' }, wp: { 0: 'Rechtschreibung' } },
        colLabels: { lzk: { 0: 'Lesen', 1: 'Diktat', 2: 'Lesefluss' },
          obj: { 0: 'Lese-HÜ' } },
        itemModes: { lzk: { 1: 'points', 2: 'points' }, obj: { 0: 'percent' } },
        maxPoints: { lzk: { 1: 20, 2: 10 } },
      },
    },
    noten: {
      a: { Deutsch: {
        '1': { sa: [], lzk: [2, 0, 10], wp: ['e'], aufgaben: [100],
          lzkParticipation: { 2: false }, hue: 3, hueErfasst: true },
        '2': { sa: [], lzk: [1, 18, 8], wp: [], aufgaben: [], hue: 1 },
      } },
      b: { Deutsch: { '1': { lzk: [5, 20, 0], aufgaben: [0] } } },
    },
  };
}

test('subject domains normalize mixed grade/points/percent and preserve zero, statuses and non-participation', () => {
  const app = fixture();
  const snapshot = structuredClone(app);
  const rows = getStudentAssessmentDomainPerformance(app, 'a', 'Deutsch', '1');
  assert.deepEqual(rows.map(row => [row.area, row.assessments, row.percent]), [
    ['Lesen', 2, 90],
    ['Rechtschreibung', 1, 0],
  ]);
  assert.deepEqual(rows[0].byCategory, { sa: 0, lzk: 1, wp: 0, obj: 1 });
  assert.equal(rows[0].modeCounts.grades, 1);
  assert.equal(rows[0].modeCounts.percent, 1);
  assert.deepEqual(app, snapshot, 'read-only dossier/KEL insights must not change stored marks');
  const second = getStudentAssessmentDomainPerformance(app, 'a', 'Deutsch', '2');
  assert.equal(second.find(row => row.area === 'Lesen')?.percent, 90);
  assert.equal(second.find(row => row.area === 'Rechtschreibung')?.percent, 90);
  const both = getStudentAssessmentDomainPerformance(app, 'a', 'Deutsch', 'both');
  assert.equal(both.find(row => row.area === 'Lesen')?.assessments, 4);
  assert.equal(getStudentAssessmentDomainPerformance(app, 'b', 'Mathematik', '1').length, 0);
});

test('new subarea labels can be assigned to weekly plans or graded homework without affecting scores', () => {
  const app = fixture(), marks = structuredClone(app.noten);
  const updated = updateSubjectColumn(app.notenMeta, 'Deutsch', 'obj', 0,
    'Lesetraining', '2026-11-11', undefined, 'Lesen', 'percent');
  assert.equal(updated.Deutsch.colAreas.obj[0], 'Lesen');
  const weekly = updateSubjectColumn(updated, 'Deutsch', 'wp', 2,
    'Größen', '', undefined, 'Rechtschreibung', 'grades');
  assert.equal(weekly.Deutsch.colAreas.wp[2], 'Rechtschreibung');
  assert.deepEqual(app.noten, marks);
});

test('KEL grade selection respects each assessment unit and reauthorizes after area changes', () => {
  const app = fixture();
  const items = getKelGradebookAssessments(app, 'a', '1', ['Deutsch']);
  const entry = items.find(item => item.titel === 'Diktat');
  assert.equal(entry?.ergebnis, '0 von 20 Punkten');
  assert.equal(entry?.area, 'Rechtschreibung');
  assert.deepEqual(pickKelAssessments(items, []), []);
  const chosen = pickKelAssessments(items, [entry!.id]);
  assert.equal(chosen.length, 1);
  app.notenMeta.Deutsch.colAreas.lzk[1] = 'Rechnen';
  assert.deepEqual(pickKelAssessments(getKelGradebookAssessments(app, 'a', '1', ['Deutsch']), [entry!.id]), []);
});

test('dossier and KEL use the same domain data but KEL only shows opted-in subjects', () => {
  const dossier = readFileSync('src/components/dossier/DossierLeistungen.tsx', 'utf8');
  const presentation = readFileSync('src/components/KELPresentation.tsx', 'utf8');
  const modal = readFileSync('src/components/gradebook/AssessmentItemModal.tsx', 'utf8');
  assert.match(dossier, /AssessmentDomainDonuts studentId=\{student.id\} subject=\{s.fach\}/);
  assert.match(presentation, /data-kel-selected-assessment-domains/);
  assert.match(presentation, /chosenLearningSubjects\.map\(item => \(/);
  assert.match(presentation, /compact hideWhenEmpty/);
  assert.match(modal, /Teilbereich in \{subject\}/);
  assert.match(modal, /Zahlen und Operationen/);
  assert.match(modal, /Rechtschreibung/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const kel = readFileSync('src/components/KELGespraeche.tsx','utf8');
const dossier = readFileSync('src/components/StudentDossier.tsx','utf8');
const presentation = readFileSync('src/components/KELPresentation.tsx','utf8');
const subject = readFileSync('src/components/KELSubjectPage.tsx','utf8');
const donuts = readFileSync('src/components/dossier/AssessmentDomainDonuts.tsx','utf8');
const types = readFileSync('src/types.ts','utf8');

test('KEL opens exactly the same dossier component and KEL reflection as the class pupil dossier', () => {
  assert.match(kel, /import StudentDossier from '\.\/StudentDossier'/);
  assert.match(kel, /data-kel-shared-dossier/);
  assert.match(kel, /useState<'protokolle' \| 'analyse'>\('analyse'\)/);
  assert.match(kel, /setSelectedStudentId\(m\.schuelerId\); setKelTab\('analyse'\)/);
  assert.match(kel, /<StudentDossier[\s\S]*schuelerId=\{selectedStudentId\}/);
  assert.match(kel, /initialTab="kel_reflexion"/);
  assert.match(dossier, /initialTab\?: DossierTab/);
  assert.match(dossier, /useState<DossierTab>\(initialTab \|\|/);
  assert.match(dossier, /<KELPresentation/);
  assert.match(kel, /Ein gemeinsamer Datenstand/);
});

test('KEL has a distinct slide for every chosen subject, including those without marks', () => {
  assert.match(presentation, /\| 'subject'/);
  assert.match(presentation, /subjectPages: true/);
  assert.match(presentation, /for \(const subject of chosenLearningSubjects\)/);
  assert.match(presentation, /type: 'subject', subject: subject\.fach/);
  assert.match(presentation, /<KELSubjectPage/);
  assert.doesNotMatch(presentation, /if \(!hasData\) return \[\]/);
  assert.doesNotMatch(presentation, /\}\)\.slice\(0, 8\);/);
});

test('KEL subject charts use the exact dossier learning-domain source, with explicit per-area selection', () => {
  assert.match(subject, /getStudentAssessmentDomainPerformance\(app, studentId, fach, semester\)/);
  assert.match(subject, /<AssessmentDomainDonuts/);
  assert.match(subject, /data-kel-subject-bars/);
  assert.match(subject, /data-kel-subject-empty/);
  assert.match(subject, /selectedAreas\.includes\(row\.area\)/);
  assert.match(donuts, /selectedAreas\?: string\[\]/);
  assert.match(donuts, /filteredAreas = selectedAreas \?/);
  assert.match(subject, /keine Werte ergänzt oder geschätzt/);
  assert.doesNotMatch(subject, /classAvg|Klasse Ø/);
});

test('Teacher can set independent chart types, learning areas, order and explicit discussion notes', () => {
  assert.match(presentation, /data-kel-subject-settings/);
  assert.match(presentation, /data-kel-subject-settings-fach/);
  assert.match(presentation, /changeSubjectOrder\(item\.fach, -1\)/);
  assert.match(presentation, /changeSubjectOrder\(item\.fach, 1\)/);
  assert.match(presentation, /toggleSubjectArea\(item\.fach/);
  assert.match(presentation, /Kreisdiagramme/);
  assert.match(presentation, /Balkendiagramm/);
  assert.match(presentation, /setSubjectNotes\(/);
  assert.match(presentation, /setSubjectNoteVisible\(/);
  assert.match(presentation, /Interne Schülernotizen werden nicht automatisch übernommen/);
});

test('KEL configuration stays scoped to child, class, year, semester and KEL meeting', () => {
  assert.match(presentation, /const planKey = JSON\.stringify\(\[app\.schuljahr \|\| '', sem, latestKel\?\.id \|\| 'vorbereitung'\]\)/);
  assert.match(presentation, /savedPlan\?\.classId === app\.activeClassId/);
  assert.match(presentation, /savedPlan\?\.studentId === student\.id/);
  assert.match(presentation, /const scopeMatches = scopeRef\.current === selectionScope/);
  assert.match(presentation, /subjectNotes: Object\.fromEntries\(chosenLearningSubjects/);
  assert.match(presentation, /subjectNoteVisible: Object\.fromEntries\(/);
  assert.match(presentation, /subjectAreaSelection: Object\.fromEntries\(/);
  assert.match(presentation, /subjectChartTypes: Object\.fromEntries\(/);
  assert.match(types, /subjectNotes\?: Record<string, string>/);
  assert.match(types, /subjectAreaSelection\?: Record<string, string\[\]>/);
});

test('PowerPoint uses the same selected subject slides and only explicitly released notes', () => {
  assert.match(presentation, /for \(const slideData of slides\)/);
  assert.match(presentation, /slideData\.type === 'subject'/);
  assert.match(presentation, /getStudentAssessmentDomainPerformance\(app, student\.id, subject\.fach/);
  assert.match(presentation, /subjectAreaSelection\[subject\.fach\]/);
  assert.match(presentation, /subjectNoteVisible\[subject\.fach\]/);
  assert.match(presentation, /pptx\.ChartType\.bar/);
  assert.match(subject, /showNote && Boolean\(note\?\.trim\(\)\)/);
  assert.doesNotMatch(subject, /getStudentNotes/);
});

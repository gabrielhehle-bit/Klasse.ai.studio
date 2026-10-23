import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gradebook = readFileSync('src/components/Gradebook.tsx', 'utf8');
const weights = readFileSync('src/components/WeightSettings.tsx', 'utf8');
const gradeUtils = readFileSync('src/lib/GradeUtils.ts', 'utf8');
const dossierLeistungen = readFileSync('src/components/dossier/DossierLeistungen.tsx', 'utf8');

test('gradebook offers one subject picker and uses one school-year period', () => {
  assert.equal((gradebook.match(/<select id="gradebook-active-subject"/g) || []).length, 1);
  assert.equal((gradebook.match(/value=\{activeFach\}/g) || []).length, 1);
  assert.match(gradebook, /const sem: '1' \| '2' = '1';/);
  assert.match(gradebook, /Ganzes Schuljahr/);
  assert.doesNotMatch(gradebook, /<select id="gradebook-semester"/);
  assert.match(gradebook, /gradebookDataStatus\.studentsWithEntries/);
  assert.match(gradebook, /setShowAddAssessmentModal\(true\)/);
});

test('simple view is an actual visual toggle and does not alter grade calculations', () => {
  assert.match(gradebook, /setSimpleDashboardMode\(prev => !prev\)/);
  assert.match(gradebook, /!simpleDashboardMode && <span/);
  assert.match(gradebook, /!simpleDashboardMode && <>/);
  assert.match(gradebook, /onClick=\{\(\) => setShowStats\(!showStats\)\}/);
  assert.match(gradebook, /<GradeCalculatorModal/);
  assert.match(gradebook, /berechne\(app, s\.id, activeFach, sem\)/);
  assert.match(gradeUtils, /export function getGewichtung/);
  assert.match(gradeUtils, /export function berechne/);
});

test('weight settings focus selected subject but continue to validate and save all fields', () => {
  assert.match(gradebook, /initialFach=\{activeFach\}/);
  assert.match(weights, /initialFach\?: string/);
  assert.match(weights, /showAllFaecher \? activeFaecher : activeFaecher\.filter/);
  assert.match(weights, /Alle Fächer vergleichen/);
  assert.match(weights, /const invalidFaecher = activeFaecher\.filter\(f => calculateSum\(f\) !== 100\)/);
  assert.match(weights, /notenGewichtung: localWeights/);
  assert.match(weights, /weight-participation-settings/);
  assert.match(weights, /weight-homework-settings/);
  assert.match(gradebook, /Hausübungsbewertung aktiv, jedoch mit 0 % eigenem Anteil/);
});

test('points mode can show or hide the calculated percent consistently across gradebook and dossier', () => {
  assert.match(gradeUtils, /export function getShowPointsPercent/);
  assert.match(weights, /Prozentwerte bei Punkten anzeigen/);
  assert.match(weights, /showPointsPercent: event\.target\.checked/);
  assert.match(gradebook, /const showPointsPercent = getShowPointsPercent\(app, activeFach\)/);
  assert.match(gradebook, /showPointsPercent && assessmentMode === 'points' && itemPct !== null/);
  assert.match(dossierLeistungen, /const showPointsPercent = getShowPointsPercent\(app, s\.fach\)/);
  assert.match(dossierLeistungen, /const maxScore = getMaxPoints\(app, fach, cat\.key, idx\)/);
  assert.match(dossierLeistungen, /showPointsPercent && mode === 'points' && item\.percent !== undefined/);
  assert.match(dossierLeistungen, /getShowPointsPercent\(app, s\.fach\).*s\.latestItem\.percent\.toLocaleString\('de-AT', \{ maximumFractionDigits: 1 \}\)/s);
});

test('subject switch clears previous assessment focus and missing filter without touching saved grades', () => {
  const subjectPicker = gradebook.split('<select id="gradebook-active-subject"')[1]?.split('className="min-h-11')[0];
  assert.ok(subjectPicker, 'subject selector is present');
  assert.match(subjectPicker, /setActiveFach\(fach\)/);
  assert.match(subjectPicker, /setIsolatedCol\(null\)/);
  assert.match(subjectPicker, /setAssessmentFilter\('all'\)/);
  assert.match(subjectPicker, /setFilterMissing\(false\)/);
  assert.doesNotMatch(subjectPicker, /setApp\(/);
});


test('class average visibility switch stays touch-sized and announces its state', () => {
  const start = gradebook.indexOf('aria-label="Klassenschnitt anzeigen"');
  const end = gradebook.indexOf('</button>', start);
  assert.ok(start > 0 && end > start);
  const control = gradebook.slice(gradebook.lastIndexOf('<button', start), end);
  assert.match(control, /role="switch"/);
  assert.match(control, /aria-checked=\{showClassAverage\}/);
  assert.match(control, /min-h-11 min-w-11/);
  assert.match(control, /focus-visible:outline-offset-2/);
  assert.match(control, /onClick=\{\(\) => setShowClassAverage\(!showClassAverage\)\}/);
  assert.match(control, /aria-hidden="true"/);
  assert.doesNotMatch(control, /setApp\(/);
});

test('gradebook assessment header keeps title and settings as separate touch-sized actions', () => {
  const start = gradebook.indexOf('const renderColHeader = ');
  const end = gradebook.indexOf('if (showDetailedAnalysis)', start);
  assert.ok(start > 0 && end > start);
  const header = gradebook.slice(start, end);
  assert.match(header, /className="flex w-full items-center gap-1"/);
  assert.match(header, /min-h-11 min-w-0 flex-1/);
  assert.ok(header.includes('aria-label={`${customLabel || defaultName} ${i + 1}: Spaltenoptionen (Bezeichnung, Datum, Höchstpunkte)`}'));
  assert.match(header, /min-h-11 min-w-11 shrink-0/);
  assert.match(header, /e\.stopPropagation\(\)/);
  assert.match(header, /setEditingAssessmentModal\(\{ typ, idx: i, isNew: false \}\)/);
  assert.doesNotMatch(header, /absolute -top-1 -right-1/);
  assert.doesNotMatch(header, /setApp\(/);
});

test('assessment form uses the school-year period and a category-specific save action', () => {
  const modal = readFileSync('src/components/gradebook/AssessmentItemModal.tsx', 'utf8');
  assert.match(gradebook, /const sem: '1' \| '2' = '1';/);
  assert.match(gradebook, /<AssessmentItemModal/);
  assert.match(gradebook, /semester=\{sem\}/);
  assert.match(modal, /semester === '1' \? 'Ganzes Schuljahr'/);
  assert.doesNotMatch(modal, />\{semester\}\. Semester</);
  assert.match(modal, /isNew \? `\$\{currentTypeInfo\.singular\} anlegen` : 'Änderungen speichern'/);
  assert.match(modal, /const finalLabel = label\.trim\(\) \|\| currentTypeInfo\.defaultName/);
  assert.match(modal, /onSave\(finalLabel, date, finalMaxP, typ === 'lzk' \? area\.trim\(\) : undefined\)/);
});

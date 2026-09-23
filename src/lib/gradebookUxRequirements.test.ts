import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gradebook = readFileSync('src/components/Gradebook.tsx', 'utf8');
const weights = readFileSync('src/components/WeightSettings.tsx', 'utf8');
const gradeUtils = readFileSync('src/lib/GradeUtils.ts', 'utf8');

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
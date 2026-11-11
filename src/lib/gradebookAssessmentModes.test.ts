import test from 'node:test';
import assert from 'node:assert/strict';
import { berechne, getAssessmentItemMode, getMixedAssessmentGrade, getNormalizedAssessmentPercent, parseAssessmentInput } from './GradeUtils';
import { getLzkAreaRows } from './assessmentAreas';
import { updateSubjectColumn, getSubjectColumnRemovalBlockReason } from './classroomEdits';
import { readFileSync } from 'node:fs';

function appFixture(): any {
  return {
    faecher: ['Deutsch'], fachConfig: { Deutsch: { unterrichtet: true } },
    schueler: [{ id: 'a', vorname: 'Test', nachname: 'Kind' }],
    noten: { a: { Deutsch: { '1': { sa: [], lzk: [2, 10], wp: [], aufgaben: [], hue: 0, hueAnm: [] } } } },
    notenMeta: { Deutsch: { assessmentMode: 'grades', colCounts: { lzk: 2, wp: 0, obj: 0 },
      maxPoints: { lzk: { 1: 20 } }, colAreas: { lzk: { 0: 'Lesen', 1: 'Lesen' } } } },
    notenGewichtung: { Deutsch: { sa: 0, lzk: 100, wp: 0, obj: 0, mi: 0, hue: 0 } },
    settings: {}, mitarbeit: {},
  };
}

test('old gradebook has no per-item mode metadata and retains its original calculation', () => {
  const app = appFixture();
  assert.equal(getAssessmentItemMode(app, 'Deutsch', 'lzk', 0), 'grades');
  assert.equal(getAssessmentItemMode(app, 'Deutsch', 'lzk', 1), 'grades');
  const snapshot = structuredClone(app.noten);
  // A legacy out-of-scale grade does not become "10 points" automatically.
  assert.equal(berechne(app, 'a', 'Deutsch', '1'), 2);
  assert.deepEqual(app.noten, snapshot);
});

test('new points assessment mixed with a legacy grade uses explicit conversion but preserves raw scores', () => {
  const app = appFixture();
  const snapshot = structuredClone(app.noten);
  app.notenMeta = updateSubjectColumn(app.notenMeta, 'Deutsch', 'lzk', 1, 'Mathequiz', '', 20, 'Lesen', 'points');
  assert.equal(getAssessmentItemMode(app, 'Deutsch', 'lzk', 0), 'grades');
  assert.equal(getAssessmentItemMode(app, 'Deutsch', 'lzk', 1), 'points');
  assert.equal(parseAssessmentInput('0', getAssessmentItemMode(app, 'Deutsch', 'lzk', 1), 20).value, 0);
  assert.equal(getNormalizedAssessmentPercent(10, 'points', 20), 50);
  assert.equal(getMixedAssessmentGrade(10, 'points', 20), 3.5);
  assert.equal(berechne(app, 'a', 'Deutsch', '1'), 2.75);
  const rows = getLzkAreaRows(app, 'a');
  assert.equal(rows[1].display, '10/20 P · 50 %');
  assert.equal(rows[1].value, 3.5);
  assert.deepEqual(app.noten, snapshot);
});

test('a percent subject can mix an individual traditional grade and a points item', () => {
  const app = appFixture();
  app.notenMeta.Deutsch.assessmentMode = 'percent';
  app.notenMeta.Deutsch.itemModes = { lzk: { 0: 'grades', 1: 'points' } };
  assert.equal(berechne(app, 'a', 'Deutsch', '1'), 65);
  assert.equal(getNormalizedAssessmentPercent(2, 'grades', 20), 80);
  app.noten.a.Deutsch['1'].lzk[1] = 0;
  assert.equal(berechne(app, 'a', 'Deutsch', '1'), 40, 'zero points remain a real assessment');
});

test('new column mode metadata is protected and never mutates grades or other subjects', () => {
  const app = appFixture();
  const grades = structuredClone(app.noten);
  const before = structuredClone(app.notenMeta);
  const next = updateSubjectColumn(app.notenMeta, 'Deutsch', 'lzk', 1, 'Quiz', '2026-11-11', 20, 'Lesen', 'points');
  assert.deepEqual(app.notenMeta, before);
  assert.deepEqual(app.noten, grades);
  assert.equal(next.Deutsch.itemModes.lzk[1], 'points');
  assert.equal(getSubjectColumnRemovalBlockReason({}, next, 'Deutsch', 'lzk', 1), 'metadata');
});

test('UI preserves recorded-grade mode and switches each assessment input independently', () => {
  const gradebook = readFileSync('src/components/Gradebook.tsx', 'utf8');
  const modal = readFileSync('src/components/gradebook/AssessmentItemModal.tsx', 'utf8');
  assert.match(gradebook, /getAssessmentItemMode\(app, activeFach, typ, idx\)/);
  assert.match(gradebook, /previousMode !== nextMode && savedCells.some/);
  assert.match(gradebook, /getAssessmentItemMode\(prev, targetFach, typ, idx\)/);
  assert.match(gradebook, /mode=\{itemMode\} maxPoints=\{maxP\}/);
  assert.match(modal, /Eingabeart dieser Bewertung/);
  assert.match(modal, /setEntryMode\(option.key\)/);
});

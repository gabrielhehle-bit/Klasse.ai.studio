import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculateItemPercent, berechne } from './GradeUtils';
import { getSubjectColumnRemovalBlockReason, removeSubjectColumn, updateSubjectColumn } from './classroomEdits';

const gradebook = readFileSync('src/components/Gradebook.tsx', 'utf8');
const weighting = readFileSync('src/components/WeightSettings.tsx', 'utf8');
const editor = readFileSync('src/components/gradebook/AssessmentItemModal.tsx', 'utf8');

test('column deletion cannot truncate existing marks, including historic points and zero', () => {
  const noten: any = { pupil: { Mathematik: {
    '1': { lzk: [null, 0, 15], wp: [9], aufgaben: [], hue: 0 },
    '2': { lzk: [null, 0, 18], wp: [], aufgaben: [], hue: 0 },
  } } };
  const meta: any = { Mathematik: { colCounts: { lzk: 3 } } };
  const before = structuredClone({ noten, meta });
  assert.equal(getSubjectColumnRemovalBlockReason(noten, meta, 'Mathematik', 'lzk', 2), 'grades');
  assert.deepEqual(removeSubjectColumn(noten, meta, 'Mathematik', 'lzk', 2), { noten, notenMeta: meta });
  assert.deepEqual({ noten, meta }, before);
});

test('changing weight and points metadata must not rewrite historic grade arrays', () => {
  const marks: any = { p: { Deutsch: { '1': { lzk: [0, 18], wp: [8] } } } };
  const copy = structuredClone(marks);
  const meta: any = { Deutsch: { maxPoints: { lzk: { 1: 20 } } } };
  const nextMeta = updateSubjectColumn(meta, 'Deutsch', 'lzk', 1, 'Silben', '2026-11-11', 30);
  assert.equal(nextMeta.Deutsch.maxPoints.lzk[1], 30);
  assert.deepEqual(marks, copy, 'editing metadata must not rewrite recorded point values');
  assert.equal(calculateItemPercent(18, 'points', 20), 90);
  assert.equal(calculateItemPercent(18, 'points', 30), 60);
});

test('gradebook warns and blocks unsafe point ceilings rather than silently reinterpreting values', () => {
  assert.match(gradebook, /savedPoints.some\(value => value > maxPointsVal\)/);
  assert.match(gradebook, /Bestehende Punktwerte bleiben erhalten/);
  assert.match(gradebook, /gespeichert.*Maximalpunkten ändern sich die Prozentwerte/s);
  assert.match(gradebook, /if \(savedPoints.length > 0 && !window.confirm/);
  assert.match(editor, /if \(saved !== false\) onClose\(\)/);
});

test('existing grades lock mode switches and only changed weight subjects are saved', () => {
  assert.match(weighting, /if \(hasSubjectAssessmentEntries\(app, fach\)\)/);
  assert.match(weighting, /setDirtySubjects/);
  assert.match(weighting, /Object.fromEntries\(dirtySubjects.map\(fach => \[fach, localWeights\[fach\]\]\)\)/);
  assert.match(weighting, /\.\.\.\(prev.notenGewichtung \|\| \{\}\)/);
  assert.match(gradebook, /getSubjectColumnRemovalBlockReason/);
  assert.match(gradebook, /disabled=\{Boolean\(pendingDeleteBlockReason\)\}/);
  assert.match(gradebook, /data-gradebook-grading-summary/);
  assert.match(gradebook, /Gewichtung &amp; Punkte einstellen/);
  assert.match(gradebook, /berechne\(app, s.id, activeFach, sem\)/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import type { AppState } from '../types';
import { annualAssessments } from './annualAssessmentData';

test('Jahresansicht darf historische Daten weder aus 1 noch aus 2 verlieren', () => {
  const app = {
    noten: {
      synthetic_student: {
        Deutsch: {
          '1': { sa: [1, null, 2], lzk: [], wp: [], aufgaben: [] },
          '2': { sa: [3], lzk: [4], wp: [], aufgaben: [] },
        },
      },
    },
    notenMeta: {
      Deutsch: {
        colLabels: { sa: ['Schularbeit'], lzk: ['Lernzielkontrolle'] },
        colDates: { sa: ['2026-09-10'] },
      },
    },
  } as unknown as AppState;

  const before = JSON.stringify(app);
  const items = annualAssessments(app, 'synthetic_student', 'Deutsch');

  assert.equal(items.length, 4);
  assert.deepEqual(items.filter(item => item.category === 'sa').map(item => item.value), [1, 2, 3]);
  assert.ok(items.some(item => item.sourceBucket === '1' && item.sourceIndex === 2 && item.value === 2));
  assert.ok(items.some(item => item.sourceBucket === '2' && item.sourceIndex === 0 && item.value === 3));
  assert.ok(items.some(item => item.category === 'lzk' && item.sourceBucket === '2' && item.value === 4));
  assert.equal(JSON.stringify(app), before, 'Annual view must never mutate stored legacy grades.');
});

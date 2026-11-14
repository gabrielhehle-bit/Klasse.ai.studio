import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeAssessmentColumnCoverage } from './gradebookColumnCoverage';

test('Spaltenfortschritt: Null Punkte und jede eingetragene Note zählen als erfasst', () => {
  const rows = [
    { value: 0 }, { value: 1 }, { value: 5 }, { value: 12.5 },
    { value: '3+' }, { value: '2' }, { value: '' },
  ];
  assert.deepEqual(summarizeAssessmentColumnCoverage(rows), {
    entered: 6, expected: 7, exempt: 0, missing: 1,
  });
});

test('Spaltenfortschritt: historische Fehlstatus sind noch nicht erfasst', () => {
  const rows = [
    { value: null }, { value: undefined }, { value: '' },
    { value: ' ' }, { value: 'e' }, { value: 'f' },
    { value: 'x' }, { value: '-' }, { value: 0 },
  ];
  assert.deepEqual(summarizeAssessmentColumnCoverage(rows), {
    entered: 1, expected: 9, exempt: 0, missing: 8,
  });
});

test('Spaltenfortschritt: explizite Nichtteilnahme ist nicht nachzutragen', () => {
  const rows = [
    { value: null, exempt: true },
    { value: 0, exempt: false },
    { value: 'x', exempt: false },
    { value: 5, exempt: true },
    { value: 3 },
  ];
  assert.deepEqual(summarizeAssessmentColumnCoverage(rows), {
    entered: 2, expected: 3, exempt: 2, missing: 1,
  });
  assert.deepEqual(summarizeAssessmentColumnCoverage([{ value: null, exempt: true }]), {
    entered: 0, expected: 0, exempt: 1, missing: 0,
  });
});

test('Spaltenfortschritt: leere Klasse hat keinen erfundenen Bewertungsstand', () => {
  assert.deepEqual(summarizeAssessmentColumnCoverage([]), {
    entered: 0, expected: 0, exempt: 0, missing: 0,
  });
});

test('Spaltenfortschritt: eingelagerte Noten und Status werden nicht mutiert', () => {
  const rows = Object.freeze([
    Object.freeze({ value: 0 }),
    Object.freeze({ value: 'x' }),
    Object.freeze({ value: null, exempt: true }),
  ]);
  const before = JSON.stringify(rows);
  assert.deepEqual(summarizeAssessmentColumnCoverage(rows), {
    entered: 1, expected: 2, exempt: 1, missing: 1,
  });
  assert.equal(JSON.stringify(rows), before);
});

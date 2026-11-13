import test from 'node:test';
import assert from 'node:assert/strict';
import { visibleAssessmentIndices, hasMissingVisibleAssessment } from './gradebookVisibleColumns';
import { isAssessmentValueMissing } from './GradeUtils';

test('compact view hides unconfigured placeholders without renumbering recorded columns', () => {
  const values = [null, 0, '', 5];
  assert.deepEqual(visibleAssessmentIndices({ count: 4, expanded: false, records: [{ values }] }), [1, 3]);
  assert.deepEqual(values, [null, 0, '', 5]);
});

test('metadata and nonparticipation keep an otherwise empty assessment visible', () => {
  assert.deepEqual(visibleAssessmentIndices({ count: 5, expanded: false,
    labels: { 0: 'Silben' }, dates: { 1: '2026-10-13' }, areas: { 2: 'Lesen' }, maxPoints: { 3: 10 },
    records: [{ participation: { 4: false } }],
  }), [0, 1, 2, 3, 4]);
});

test('expanded view restores all placeholders and compact empty view has no assessments', () => {
  assert.deepEqual(visibleAssessmentIndices({ count: 4, expanded: true, records: [] }), [0, 1, 2, 3]);
  assert.deepEqual(visibleAssessmentIndices({ count: 4, expanded: false, records: [] }), []);
});

test('focusing one assessment keeps its original index and excludes other categories', () => {
  const options = { count: 4, expanded: false, records: [{ values: [4, null, 0, 2] }] };
  assert.deepEqual(visibleAssessmentIndices({ ...options, focusedIndex: 2 }), [2]);
  assert.deepEqual(visibleAssessmentIndices({ ...options, focusedIndex: 2, visible: false }), []);
  assert.deepEqual(visibleAssessmentIndices(options), [0, 2, 3]);
});

test('other semester values and nonparticipation survive empty current-semester records', () => {
  assert.deepEqual(visibleAssessmentIndices({ count: 4, expanded: false,
    records: [{ values: [] }, { values: [null, null, 0], participation: { 3: false } }],
  }), [2, 3]);
});

test('nonparticipation before any score is entered is complete while other open scores remain missing', () => {
  assert.equal(hasMissingVisibleAssessment([], [3], { 3: false }), false);
  assert.equal(hasMissingVisibleAssessment([], [2, 3], { 3: false }), true);
  assert.equal(hasMissingVisibleAssessment([0], [0]), false);
  assert.equal(hasMissingVisibleAssessment([], []), false);
});

test('saved Deutsch assessments beyond stale or missing counts stay visible at their original slots', () => {
  assert.deepEqual(visibleAssessmentIndices({ count: 1, expanded: false,
    records: [{ values: [null, 1, null, 2] }], labels: { 6: 'Lesen' },
  }), [1, 3, 6]);
  assert.deepEqual(visibleAssessmentIndices({ expanded: false,
    records: [{ values: [null, 0, 3] }],
  }), [1, 2]);
});

test('an empty targeted category exposes entry slots and focusing preserves an outlying index', () => {
  assert.deepEqual(visibleAssessmentIndices({ count: 2, expanded: true, records: [] }), [0, 1]);
  assert.deepEqual(visibleAssessmentIndices({ count: 1, focusedIndex: 5, labels: { 5: 'Wochenplan' }, expanded: false, records: [] }), [5]);
});

test('switching filters and focused entry never mutates existing teacher grades or metadata', () => {
  const first = Object.freeze([1, null, 0, 'e', 2]);
  const second = Object.freeze([null, 3, null, 'f']);
  const labels = Object.freeze({ 0: 'Deutsch LZK', 4: 'Lesen' });
  const participation = Object.freeze({ 4: false });
  const snapshot = JSON.stringify({ first, second, labels, participation });
  const options = { count: 1, labels, records: [
    { values: first as unknown as unknown[], participation },
    { values: second as unknown as unknown[] },
  ] };
  for (const expanded of [false, true]) {
    assert.deepEqual(visibleAssessmentIndices({ ...options, expanded }), [0, 1, 2, 3, 4]);
    assert.deepEqual(visibleAssessmentIndices({ ...options, expanded, focusedIndex: 2 }), [2]);
    assert.deepEqual(visibleAssessmentIndices({ ...options, expanded, visible: false }), []);
  }
  assert.equal(JSON.stringify({ first, second, labels, participation }), snapshot);
});

test('Unvollständig-Filter stimmt für alle gespeicherten Statuswerte mit der Zell-Markierung überein', () => {
  const recorded = [undefined, null, '', ' ', 'e', 'f', 'x', '-', 0, 1, 2.5, 10, '3+'];
  for (const value of recorded) {
    assert.equal(
      hasMissingVisibleAssessment([value], [0]),
      isAssessmentValueMissing(value),
      `Status ${String(value)} muss in Filter und Markierung identisch behandelt werden`,
    );
  }
});

test('Historische x-Rückmeldungen werden gefunden, aber niemals umgeschrieben oder verschoben', () => {
  const values = Object.freeze([0, 'x', 3, null]);
  const before = [...values];
  const indices = visibleAssessmentIndices({
    count: 1, expanded: false, records: [{ values: values as unknown as unknown[] }],
  });
  assert.deepEqual(indices, [0, 1, 2]);
  assert.equal(hasMissingVisibleAssessment(values as unknown as unknown[], indices), true);
  assert.equal(hasMissingVisibleAssessment(values as unknown as unknown[], [0, 2]), false);
  assert.deepEqual(values, before);
});

test('Nichtteilnahme bleibt ausgenommen, auch bei einem markierten x, und null Punkte zählen als Bewertung', () => {
  assert.equal(hasMissingVisibleAssessment(['x'], [0], { 0: false }), false);
  assert.equal(hasMissingVisibleAssessment([0, 'x'], [0, 1], { 1: false }), false);
  assert.equal(hasMissingVisibleAssessment([0, 'x'], [0, 1], { 0: false }), true);
  assert.equal(hasMissingVisibleAssessment([0], [0]), false);
  assert.equal(hasMissingVisibleAssessment(['x'], []), false);
});

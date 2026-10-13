import test from 'node:test';
import assert from 'node:assert/strict';
import { visibleAssessmentIndices } from './gradebookVisibleColumns';

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

import test from 'node:test';
import assert from 'node:assert/strict';
import { formatLocalDateKey } from './utils';

test('formatLocalDateKey preserves the local calendar day', () => {
  const localMidnight = new Date(2026, 8, 14, 0, 0, 0);
  assert.equal(formatLocalDateKey(localMidnight), '2026-09-14');
});

test('formatLocalDateKey rejects invalid dates', () => {
  assert.equal(formatLocalDateKey(new Date(Number.NaN)), '');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { toLocalDateKey } from './localDate';

test('toLocalDateKey uses the browser/local calendar day instead of UTC serialization', () => {
  const localDate = new Date(2026, 8, 14, 0, 30, 0);
  assert.equal(toLocalDateKey(localDate), '2026-09-14');
});

test('toLocalDateKey pads single-digit months and days', () => {
  const localDate = new Date(2026, 0, 5, 12, 0, 0);
  assert.equal(toLocalDateKey(localDate), '2026-01-05');
});

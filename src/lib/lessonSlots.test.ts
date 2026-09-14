import test from 'node:test';
import assert from 'node:assert/strict';
import { LESSON_SLOT_NUMBERS, MAX_LESSON_SLOTS, STUNDEN_INFO } from '../constants';

test('Klassio exposes ten configurable lesson slots without inventing late-day times', () => {
  assert.equal(MAX_LESSON_SLOTS, 10);
  assert.deepEqual(LESSON_SLOT_NUMBERS, [1,2,3,4,5,6,7,8,9,10]);
  assert.equal(STUNDEN_INFO[8], '15:10–16:00');
  assert.equal(STUNDEN_INFO[9], undefined);
  assert.equal(STUNDEN_INFO[10], undefined);
});

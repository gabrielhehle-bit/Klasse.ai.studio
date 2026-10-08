import test from 'node:test';
import assert from 'node:assert/strict';
import { adjustClassTimerMinute, MAX_CLASS_TIMER_SECONDS } from './classTimerInput';

test('minute addition respects twelve hours for ready, paused and running timers', () => {
  for (const running of [false, true]) {
    assert.equal(adjustClassTimerMinute(MAX_CLASS_TIMER_SECONDS, 1, running), MAX_CLASS_TIMER_SECONDS);
    assert.equal(adjustClassTimerMinute(MAX_CLASS_TIMER_SECONDS - 20, 1, running), MAX_CLASS_TIMER_SECONDS);
    assert.equal(adjustClassTimerMinute(300, 1, running), 360);
  }
});
test('ready and paused timers keep a usable duration when subtracting a minute', () => {
  for (const seconds of [1, 30, 60]) assert.equal(adjustClassTimerMinute(seconds, -1), seconds);
  assert.equal(adjustClassTimerMinute(61, -1), 1);
  assert.equal(adjustClassTimerMinute(300, -1), 240);
});
test('subtracting from a running timer can still expire it', () => {
  assert.equal(adjustClassTimerMinute(30, -1, true), 0);
  assert.equal(adjustClassTimerMinute(75, -1, true), 15);
});

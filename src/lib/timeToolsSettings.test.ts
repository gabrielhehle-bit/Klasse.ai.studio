import assert from 'node:assert/strict';
import test from 'node:test';
import { getTimeToolSettings, normalizeTimeToolMode, updateTimeToolSettings } from './timeToolsSettings';

test('time tools preserve old countdown preferences without migrating saved widgets', () => {
  const legacy = { preferredDuration: 30, isMuted: true, visualMode: 'progress', unknownPreference: 7 };
  assert.equal(normalizeTimeToolMode(undefined), 'timer');
  assert.equal(normalizeTimeToolMode('obsolete'), 'timer');
  assert.deepEqual(getTimeToolSettings(legacy, 'timer'), legacy);
  assert.deepEqual(getTimeToolSettings(legacy, 'stopwatch'), {});
  assert.deepEqual(getTimeToolSettings({ timeClock: [] }, 'clock'), {});
});

test('rapid edits and mode switches keep each time tool state isolated', () => {
  const original = { preferredDuration: 30, isMuted: true, timeToolMode: 'stopwatch' };
  let next = updateTimeToolSettings(original, 'stopwatch', {
    status: 'running', startTimestamp: 1000, accumulatedElapsed: 250, laps: [120], showDecimals: true,
  });
  next = updateTimeToolSettings(next, 'clock', { mode: 'analog', showSeconds: false });
  next = updateTimeToolSettings(next, 'timer', { preferredDuration: 60, isMuted: false });
  next = updateTimeToolSettings(next, 'stopwatch', { status: 'paused' });
  assert.deepEqual(getTimeToolSettings(next, 'timer'), { preferredDuration: 60, isMuted: false });
  assert.deepEqual(getTimeToolSettings(next, 'clock'), { mode: 'analog', showSeconds: false });
  assert.deepEqual(getTimeToolSettings(next, 'stopwatch'), {
    status: 'paused', startTimestamp: 1000, accumulatedElapsed: 250, laps: [120], showDecimals: true,
  });
  assert.equal(next.timeToolMode, 'stopwatch');
  assert.deepEqual(original, { preferredDuration: 30, isMuted: true, timeToolMode: 'stopwatch' });
  // A legacy countdown callback cannot overwrite the studio's mode or other tools.
  assert.deepEqual(updateTimeToolSettings(next, 'timer', { ...getTimeToolSettings(next, 'timer'),
    timeToolMode: 'timer', timeStopwatch: {}, timeClock: {} }), next);
  assert.deepEqual(JSON.parse(JSON.stringify(next)), next);
});

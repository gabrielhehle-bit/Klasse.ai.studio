import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeClockLearningSettings, normalizeClockLearningTool, spokenClockTime } from './clockLearningSettings';
import { getRegularCockpitGroups } from './cockpitRegularCatalog';

test('Uhrlernen retains independent original snapshots and word clock settings without changing input', () => {
  const original = { arbitrary: 42, wordclockPracticeHour: 23, wordclockPracticeMinute: 55,
    __widgetLifecycleState: { clockpuzzle: { mode: 'set', targetClock: { h: 8, m: 15 } }, clocksync: { task: 3, hour: 9, minute: 15 } } };
  const before = structuredClone(original);
  const switched = mergeClockLearningSettings(original, { clockLearningTool: 'spoken' });
  const updated = mergeClockLearningSettings(switched, { __widgetLifecycleState: { clocksync: { task: 4, hour: 10, minute: 10 } } });
  assert.deepEqual(updated.__widgetLifecycleState.clockpuzzle, original.__widgetLifecycleState.clockpuzzle);
  assert.equal(updated.wordclockPracticeHour, 23);
  assert.equal(updated.wordclockPracticeMinute, 55);
  assert.equal(updated.arbitrary, 42);
  assert.equal(updated.clockLearningTool, 'spoken');
  assert.equal(updated.__widgetLifecycleState.clocksync.task, 4);
  assert.deepEqual(original, before);
});

test('Uhrlernen recovers safely from unsupported selected tools', () => {
  for (const value of ['trainer', undefined, null, {}, '', 'obsolete']) assert.equal(normalizeClockLearningTool(value), 'trainer');
  assert.equal(normalizeClockLearningTool('spoken'), 'spoken');
  assert.equal(normalizeClockLearningTool('words'), 'words');
});

test('spoken clocks handle half hours, midnight and approximate minute rounding accurately', () => {
  assert.equal(spokenClockTime(4, 30), 'Halb 5');
  assert.equal(spokenClockTime(23, 55), 'Fünf vor 12');
  assert.equal(spokenClockTime(0, 0), 'Punkt 12 Uhr');
  assert.equal(spokenClockTime(23, 58), 'Punkt 12 Uhr (ungefähr)');
  assert.equal(spokenClockTime(10, 17), 'Viertel nach 10 (ungefähr)');
  assert.equal(spokenClockTime(12, 45), 'Viertel vor 1');
});

test('all existing clock learning names lead to one regular entry', () => {
  for (const query of ['Uhren-Lern-Trainer', 'Uhrzeit-Macher', 'Deutsche Wort-Uhr']) {
    assert.deepEqual(getRegularCockpitGroups('core', query).map(group => group.id), ['clockpuzzle']);
  }
});

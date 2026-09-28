import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_WEEKDAYS_WIDGET_SETTINGS,
  MONTH_NAMES,
  WEEKDAY_NAMES,
  createWeekdaysPracticeRound,
  getCurrentSequenceIndex,
  getMonthIndex,
  getSequenceItems,
  getWeekdayIndex,
  nextSequenceIndex,
  normalizeWeekdaysWidgetSettings,
  practiceQuestion,
  previousSequenceIndex,
} from './weekdaysWidgetModel';

test('weekday settings normalize safely', () => {
  assert.deepEqual(normalizeWeekdaysWidgetSettings(null), DEFAULT_WEEKDAYS_WIDGET_SETTINGS);
  assert.deepEqual(normalizeWeekdaysWidgetSettings({
    content: 'months',
    mode: 'practice',
    showRelativeLabels: false,
  }), {
    content: 'months',
    mode: 'practice',
    showRelativeLabels: false,
  });
});

test('real weekday uses Monday as index zero instead of hardcoded Monday', () => {
  assert.equal(getWeekdayIndex(new Date(2026, 8, 28)), 0); // Monday
  assert.equal(getWeekdayIndex(new Date(2026, 8, 29)), 1); // Tuesday
  assert.equal(getWeekdayIndex(new Date(2026, 9, 4)), 6); // Sunday
});

test('months are a real supported learning sequence', () => {
  assert.equal(MONTH_NAMES.length, 12);
  assert.equal(MONTH_NAMES[0], 'Jänner');
  assert.equal(MONTH_NAMES[11], 'Dezember');
  assert.deepEqual(getSequenceItems('weekdays'), WEEKDAY_NAMES);
  assert.deepEqual(getSequenceItems('months'), MONTH_NAMES);
  assert.equal(getMonthIndex(new Date(2026, 8, 28)), 8);
  assert.equal(getCurrentSequenceIndex('months', new Date(2026, 8, 28)), 8);
});

test('sequence navigation wraps at week and year boundaries', () => {
  assert.equal(previousSequenceIndex(0, 7), 6);
  assert.equal(nextSequenceIndex(6, 7), 0);
  assert.equal(previousSequenceIndex(0, 12), 11);
  assert.equal(nextSequenceIndex(11, 12), 0);
});

test('practice round asks before or after and points to the correct neighbour', () => {
  const seq = [0.2, 0.9];
  let i = 0;
  const round = createWeekdaysPracticeRound(WEEKDAY_NAMES, () => seq[i++ % seq.length]);
  assert.ok(round);
  assert.equal(round!.relation, 'after');
  assert.equal(round!.answerIndex, nextSequenceIndex(round!.anchorIndex, WEEKDAY_NAMES.length));
  assert.match(practiceQuestion(round!, WEEKDAY_NAMES), /^Was kommt nach /);
});

test('practice round avoids repeating the exact same prompt when possible', () => {
  const previous = { anchorIndex: 0, answerIndex: 1, relation: 'after' as const };
  const sequence = [0, 0.9];
  let i = 0;
  const next = createWeekdaysPracticeRound(WEEKDAY_NAMES, () => sequence[i++ % sequence.length], previous);
  assert.ok(next);
  assert.notDeepEqual({ anchorIndex: next!.anchorIndex, relation: next!.relation }, { anchorIndex: 0, relation: 'after' });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateStarsReview, starsReviewRange, starsReviewSubjects, starsReviewLogLocalDate, DEFAULT_STARS_REVIEW_SETTINGS } from './starsReview';

const children = [{ id: 'a', vorname: 'Ada' }, { id: 'b', vorname: 'Berta' }, { id: 'c', vorname: 'Clara' }, { id: 'd', vorname: 'Dina' }];
const input = [
  { sid: 'a', points: 3, timestamp: '2026-09-21T09:00:00+02:00', fach: 'Deutsch' },
  { sid: 'a', points: -1, timestamp: '2026-09-22T09:00:00+02:00', fach: 'Deutsch' },
  { sid: 'a', points: 2, timestamp: '2026-09-24T09:00:00+02:00', fach: 'Mathematik' },
  { sid: 'b', points: 3, timestamp: '2026-09-25T09:00:00+02:00', fach: 'Deutsch' },
  { sid: 'c', points: 12, timestamp: '2026-09-20T09:00:00+02:00', fach: 'Deutsch' },
  { sid: 'd', points: 19, timestamp: '2026-09-28T09:00:00+02:00', fach: 'Deutsch' },
  { sid: 'other-class', points: 999, timestamp: '2026-09-22T09:00:00+02:00', fach: 'Deutsch' },
];
test('week uses local Monday-Sunday, including year rollover and Friday review', () => {
  const settings = { ...DEFAULT_STARS_REVIEW_SETTINGS, referenceDate: '2026-09-25' };
  assert.deepEqual(starsReviewRange(settings), { start: '2026-09-21', end: '2026-09-27' });
  assert.deepEqual(starsReviewRange({ ...settings, referenceDate: '2027-01-01' }), { start: '2026-12-28', end: '2027-01-03' });
  assert.deepEqual(starsReviewRange({ ...settings, period: 'month' }), { start: '2026-09-01', end: '2026-09-30' });
});
test('invalid and reversed date ranges never show student results', () => {
  const settings = { ...DEFAULT_STARS_REVIEW_SETTINGS, period: 'custom' as const, startDate: '2026-09-29', endDate: '2026-09-21' };
  assert.equal(starsReviewRange(settings), null);
  assert.deepEqual(aggregateStarsReview(children, input, settings), []);
  assert.equal(starsReviewRange({ ...settings, endDate: '2026-09-31' }), null);
});
test('weekly totals use signed stars, only active-class pupils, subjects and chosen limit', () => {
  const settings = { ...DEFAULT_STARS_REVIEW_SETTINGS, referenceDate: '2026-09-25', limit: 'all' as const };
  const rows = aggregateStarsReview(children, input, settings);
  assert.deepEqual(rows.map(x => [x.studentId, x.stars]), [['a', 4], ['b', 3], ['c', 0], ['d', 0]]);
  assert.deepEqual(aggregateStarsReview(children, input, { ...settings, subjects: ['Deutsch'], limit: 3 }).map(x => x.stars), [3, 2, 0]);
  assert.deepEqual(aggregateStarsReview(children, input, { ...settings, subjects: ['Musik'] }).map(x => x.stars), [0, 0, 0, 0]);
  assert.deepEqual(rows.map(x => x.rank), [1, 2, 3, 3]);
});
test('local dates protect end-of-day events and ignore invalid time and other classes', () => {
  assert.equal(starsReviewLogLocalDate('invalid'), null);
  const settings = { ...DEFAULT_STARS_REVIEW_SETTINGS, period: 'custom' as const, startDate: '2026-09-25', endDate: '2026-09-25', limit: 'all' as const };
  assert.equal(aggregateStarsReview(children, [{ sid: 'b', points: 1, timestamp: '2026-09-25T23:59:59+02:00', fach: 'Deutsch' }], settings)[0].stars, 1);
  assert.deepEqual(starsReviewSubjects(input, children, ['Musik']), ['Deutsch', 'Mathematik', 'Musik']);
});

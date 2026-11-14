import test from 'node:test';
import assert from 'node:assert/strict';
import { buildKelParentTrend } from './kelParentTrend';

test('six-week timeline keeps empty weeks as missing, never fills in positive feelings', () => {
  const moods: Record<string, unknown> = {
    '2026-10-05': 1,
    '2026-10-07': 3,
    '2026-10-12': 5,
    '2026-10-20': null,
    '2026-11-03': '2',
    '2026-11-06': 4.5,
    '2026-11-15': 4,
    '2026-09-01': 4,
  };
  const logs = [
    { datum: '2026-10-05' }, { datum: '2026-10-05' },
    { datum: '2026-10-14' }, { datum: '2026-11-03' },
    { datum: '2026-09-01' },
  ];
  const before = structuredClone({ moods, logs });
  const result = buildKelParentTrend('recent', '2026-10-05', '2026-11-14', moods, logs);
  assert.equal(result.buckets.length, 6);
  assert.deepEqual(result.buckets.map(b => b.moodCount), [2, 1, 0, 0, 1, 0]);
  assert.deepEqual(result.buckets.map(b => b.moodAverage), [2, 5, null, null, 2, null]);
  assert.deepEqual(result.buckets.map(b => b.behaviorCount), [1, 1, 0, 0, 1, 0]);
  assert.equal(result.moodPeriods, 3);
  assert.equal(result.behaviorPeriods, 3);
  assert.deepEqual({ moods, logs }, before);
});

test('school year timeline groups by calendar month through New Year and DST', () => {
  const result = buildKelParentTrend(
    'year', '2026-08-01', '2027-03-31',
    {'2026-08-01': 1, '2026-10-25': 2, '2027-03-28': 5, '2027-04-01': 5},
    [{datum:'2026-10-25'}, {datum:'2027-03-28'}, {datum:'2027-03-28'}],
  );
  assert.equal(result.buckets.length, 8);
  assert.equal(result.buckets[0].key, '2026-08');
  assert.equal(result.buckets.at(-1)?.key, '2027-03');
  assert.deepEqual(result.buckets.filter(b => b.moodCount).map(b => [b.key, b.moodAverage]),
    [['2026-08', 1], ['2026-10', 2], ['2027-03', 5]]);
  assert.equal(result.buckets.find(b=>b.key==='2026-11')?.moodAverage, null);
  assert.equal(result.buckets.find(b=>b.key==='2027-03')?.behaviorCount, 1);
});

test('missing records and invalid boundaries do not fabricate timeline values', () => {
  const empty = buildKelParentTrend('recent','2026-10-05','2026-10-11',{},[]);
  assert.equal(empty.buckets.length, 1);
  assert.equal(empty.buckets[0].moodAverage, null);
  assert.equal(empty.buckets[0].behaviorCount, 0);
  assert.equal(empty.moodPeriods, 0);
  assert.equal(empty.behaviorPeriods, 0);
  assert.deepEqual(buildKelParentTrend('year','2026-11-15','2026-11-10',
    {'2026-11-12':1},[{datum:'2026-11-12'}]).buckets, []);
});

test('recorded behavior categories are counted as observations, not given a qualitative severity score', () => {
  const trend = buildKelParentTrend('recent','2026-11-02','2026-11-15',{},
    [{datum:'2026-11-03',iconId:'great'}, {datum:'2026-11-10',iconId:'difficult'}]);
  assert.deepEqual(trend.buckets.map(b=>b.behaviorCount), [1,1]);
  assert.ok(trend.buckets.every(b=>b.moodAverage===null));
});

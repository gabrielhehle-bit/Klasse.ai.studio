import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import KELParentTrendChart from '../components/KELParentTrendChart';
import { buildKelParentTrend } from './kelParentTrend';
import { summarizeKelMood, summarizeKelBehavior } from './kelParentReportMetrics';

test('actual documented mood and behavior entries render their chart segments, not fictional zeros', () => {
  const moods = {
    '2026-10-15': 1,
    '2026-10-16': 2,
    '2026-11-01': 4,
    '2026-11-02': 3,
    '2026-12-01': 5, // outside the chosen period
  };
  const logs = [
    { datum: '2026-10-15', iconId: 'calm' },
    { datum: '2026-10-16', iconId: 'calm' },
    { datum: '2026-11-01', iconId: 'focus' },
    { datum: '2026-11-02', iconId: 'calm' },
    { datum: '2026-12-01', iconId: 'focus' },
  ];
  const stages = [
    { id: 'calm', label: 'Ruhige Mitarbeit', color: '#047857' },
    { id: 'focus', label: 'Konzentration', color: '#4f46e5' },
  ];
  const source = structuredClone({ moods, logs, stages });
  const trend = buildKelParentTrend('year', '2026-10-01', '2026-11-30', moods, logs, stages);
  const moodSummary = summarizeKelMood(moods, '2026-10-01', '2026-11-30');
  const behaviorSummary = summarizeKelBehavior(logs.slice(0, 4), stages);
  assert.equal(moodSummary.total, 4);
  assert.deepEqual(moodSummary.counts, [1, 1, 1, 1, 0]);
  assert.equal(behaviorSummary.total, 4);
  assert.equal(trend.moodPeriods, 2);
  assert.equal(trend.behaviorPeriods, 2);
  assert.equal(trend.buckets[0].moodAverage, 1.5);
  assert.equal(trend.buckets[1].moodAverage, 3.5);

  const moodMarkup = renderToStaticMarkup(React.createElement(KELParentTrendChart, {
    kind: 'mood', buckets: trend.buckets, period: 'year',
  }));
  const behaviorMarkup = renderToStaticMarkup(React.createElement(KELParentTrendChart, {
    kind: 'behavior', buckets: trend.buckets, period: 'year',
    behaviorRows: behaviorSummary.rows,
  }));
  assert.match(moodMarkup, /data-kel-mood-trend/);
  assert.match(moodMarkup, /<circle /);
  assert.match(moodMarkup, /<line /);
  assert.match(moodMarkup, /1 = sehr gut, 5 = schlecht/);
  assert.match(behaviorMarkup, /data-kel-behavior-trend/);
  assert.match(behaviorMarkup, /<rect /);
  assert.match(behaviorMarkup, /#047857/);
  assert.match(behaviorMarkup, /#4f46e5/);
  assert.match(behaviorMarkup, /Weniger Einträge bedeuten nicht automatisch besseres Verhalten/);
  assert.deepEqual({moods,logs,stages},source, 'chart rendering is read-only');
});

test('no trend is invented when data covers only one time period', () => {
  const trend = buildKelParentTrend('year','2026-10-01','2026-10-31',
    {'2026-10-10': 2}, [{datum:'2026-10-10',iconId:'calm'}], [{id:'calm'}]);
  assert.equal(renderToStaticMarkup(React.createElement(KELParentTrendChart, {
    kind:'mood',buckets:trend.buckets,period:'year',
  })), '');
  assert.equal(renderToStaticMarkup(React.createElement(KELParentTrendChart, {
    kind:'behavior',buckets:trend.buckets,period:'year',
    behaviorRows:[{id:'calm',label:'Ruhig',color:'#047857'}],
  })), '');
});

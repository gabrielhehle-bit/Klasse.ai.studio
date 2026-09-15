import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getClassPerformanceStats,
  getStudentPerformanceSummary,
  getSubjectPerformanceAverages,
  toNormalizedPerformancePercent,
} from './statisticsMetrics';

function baseApp() {
  return {
    schueler: [
      { id: 'a', vorname: 'A', nachname: 'A' },
      { id: 'b', vorname: 'B', nachname: 'B' },
    ],
    faecher: ['Deutsch', 'Mathematik'],
    fachConfig: {
      Deutsch: { unterrichtet: true },
      Mathematik: { unterrichtet: true },
    },
    notenMeta: {
      Deutsch: { assessmentMode: 'grades' },
      Mathematik: { assessmentMode: 'percent' },
    },
    notenGewichtung: {
      Deutsch: { sa: 100, lzk: 0, wp: 0, obj: 0, mi: 0, hue: 0 },
      Mathematik: { sa: 100, lzk: 0, wp: 0, obj: 0, mi: 0, hue: 0 },
    },
    noten: {
      a: {
        Deutsch: { '1': { sa: [2], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] } },
        Mathematik: { '1': { sa: [80], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] } },
      },
      b: {
        Deutsch: { '1': { sa: [4], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] } },
        Mathematik: { '1': { sa: [40], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] } },
      },
    },
    mitarbeit: {},
    mitarbeit_settings: { mode: 'manual', thresholds: { 1: 13, 2: 10, 3: 7, 4: 4, 5: 0 } },
  } as any;
}

test('grade and percent scales normalize onto the same 0..100 performance index', () => {
  assert.equal(toNormalizedPerformancePercent(1, 'grades'), 100);
  assert.equal(toNormalizedPerformancePercent(3, 'grades'), 60);
  assert.equal(toNormalizedPerformancePercent(5, 'grades'), 20);
  assert.equal(toNormalizedPerformancePercent(82.5, 'percent'), 82.5);
  assert.equal(toNormalizedPerformancePercent(82.5, 'points'), 82.5);
});

test('mixed class statistics never interpret percentages as grades 1..5', () => {
  const app = baseApp();
  const stats = getClassPerformanceStats(app, app.schueler, ['Deutsch', 'Mathematik']);
  assert.equal(stats.scale, 'mixed');
  assert.equal(stats.totalCount, 4);
  assert.equal(stats.rawAverage, null);
  assert.equal(stats.averageDescriptor, 'Leistungsindex (Skalen normalisiert)');
  assert.match(stats.averageLabel, /%$/);
  assert.deepEqual(stats.distribution.map(item => item.name), ['0–19%', '20–39%', '40–59%', '60–79%', '80–100%']);
});

test('single grade-mode subject keeps the Austrian 1..5 distribution', () => {
  const app = baseApp();
  const stats = getClassPerformanceStats(app, app.schueler, ['Deutsch']);
  assert.equal(stats.scale, 'grades');
  assert.equal(stats.averageLabel, '3,00');
  assert.deepEqual(stats.distribution.map(item => item.count), [0, 1, 0, 1, 0]);
  assert.equal(stats.attentionDescriptor, 'Note 5');
});

test('student summary exposes a normalized average for mixed assessment modes', () => {
  const app = baseApp();
  const result = getStudentPerformanceSummary(app, 'a', ['Deutsch', 'Mathematik']);
  assert.equal(result.entries.length, 2);
  assert.equal(result.gradeAverage, 2);
  assert.equal(result.normalizedAverage, 80);
});

test('subject averages preserve raw values and provide normalized comparison values', () => {
  const app = baseApp();
  const rows = getSubjectPerformanceAverages(app, app.schueler, ['Deutsch', 'Mathematik']);
  const deutsch = rows.find(row => row.subject === 'Deutsch');
  const math = rows.find(row => row.subject === 'Mathematik');
  assert.equal(deutsch?.rawAverage, 3);
  assert.equal(deutsch?.normalizedAverage, 60);
  assert.equal(math?.rawAverage, 60);
  assert.equal(math?.normalizedAverage, 60);
});

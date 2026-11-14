import test from 'node:test';
import assert from 'node:assert/strict';
import { initialAppState } from './appState';
import { getGradeOverviewOrigin, summarizeGradeOverview } from './gradeOverviewAudit';

const makeApp = () => ({
  ...initialAppState,
  faecher: ['Deutsch', 'Religion'],
  fachConfig: {
    ...initialAppState.fachConfig,
    Deutsch: { unterrichtet: true },
    Religion: { unterrichtet: false },
  },
  noten: {
    anna: {
      Deutsch: {
        '1': { sa: [], lzk: [2], wp: [], aufgaben: [], hue: 0, hueAnm: [], endnote: '1' },
      },
      Religion: { '1': { endnote: 'SPF' } },
    },
    bert: {
      Deutsch: {
        '1': { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [], endnote: '' },
      },
      Religion: { '1': { endnote: '' } },
    },
  },
  notenGewichtung: {
    Deutsch: { sa: 0, lzk: 100, wp: 0, hue: 0, obj: 0, mi: 0 },
  },
  notenMeta: { Deutsch: { assessmentMode: 'grades' } },
}) as any;

test('manual marks, including SPF and inactive subject grades, retain their provenance', () => {
  const app = makeApp();
  assert.equal(getGradeOverviewOrigin(app, 'anna', 'Deutsch', '1'), 'manual');
  assert.equal(getGradeOverviewOrigin(app, 'anna', 'Religion', '1'), 'manual');
  assert.equal(getGradeOverviewOrigin(app, 'bert', 'Religion', '1'), 'missing');
});

test('a calculated mark is identified without needing a manual endnote', () => {
  const app = makeApp();
  app.noten.anna.Deutsch['1'].endnote = '';
  assert.equal(getGradeOverviewOrigin(app, 'anna', 'Deutsch', '1'), 'calculated');
});

test('audit counts exactly student x subject cells, preserves inputs and ignores other classes', () => {
  const app = makeApp();
  const before = JSON.stringify(app);
  const audit = summarizeGradeOverview(app, ['anna', 'bert'], ['Deutsch', 'Religion'], '1');
  assert.deepEqual(audit, { manual: 2, calculated: 0, missing: 2, total: 4 });
  assert.equal(JSON.stringify(app), before, 'read-only audit must not mutate any grade or metadata');
  assert.deepEqual(summarizeGradeOverview(app, [], ['Deutsch'], '1'), { manual: 0, calculated: 0, missing: 0, total: 0 });
});

test('current-year manual origin takes precedence and a combined view respects both historical buckets', () => {
  const app = makeApp();
  app.noten.bert.Religion['2'] = { endnote: '2' };
  assert.equal(getGradeOverviewOrigin(app, 'bert', 'Religion', '1'), 'missing');
  assert.equal(getGradeOverviewOrigin(app, 'bert', 'Religion', 'combined'), 'manual');
});

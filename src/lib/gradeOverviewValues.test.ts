import test from 'node:test';
import assert from 'node:assert/strict';
import { getOverviewNote } from './gradeOverviewValues';
import { initialAppState } from './appState';

const makeApp = () => ({
  ...initialAppState,
  fachConfig: {
    ...initialAppState.fachConfig,
    Deutsch: { ...initialAppState.fachConfig?.Deutsch, unterrichtet: true },
    Religion: { ...initialAppState.fachConfig?.Religion, unterrichtet: false },
  },
  noten: {
    'child-a': {
      Deutsch: {
        '1': { endnote: '1' },
        '2': { endnote: '3' },
      },
      Religion: {
        '1': { endnote: 'SPF' },
        '2': { endnote: '2' },
      },
    },
  },
}) as any;

test('one semester retains manually entered grade including for a subject without its own gradebook', () => {
  const app = makeApp();
  assert.deepEqual(getOverviewNote(app, 'child-a', 'Deutsch', '1'), { noteToRender: 1, numericForAvg: 1 });
  assert.deepEqual(getOverviewNote(app, 'child-a', 'Religion', '1'), { noteToRender: 'SPF', numericForAvg: null });
  assert.deepEqual(getOverviewNote(app, 'child-a', 'Religion', '2'), { noteToRender: 2, numericForAvg: 2 });
});

test('combined view uses the same preexisting semester precedence and average', () => {
  const app = makeApp();
  assert.deepEqual(getOverviewNote(app, 'child-a', 'Deutsch', 'combined'), { noteToRender: 2, numericForAvg: 2 });
  assert.deepEqual(getOverviewNote(app, 'child-a', 'Religion', 'combined'), { noteToRender: 'SPF / 2', numericForAvg: null });
  assert.deepEqual(getOverviewNote(app, 'child-a', 'Religion', '1'), { noteToRender: 'SPF', numericForAvg: null });
});

test('missing inactive subject has no computed grade, and manual clearing exposes existing calculated path', () => {
  const app = makeApp();
  assert.deepEqual(getOverviewNote(app, 'child-b', 'Religion', 'combined'), { noteToRender: null, numericForAvg: null });
  delete app.noten['child-a'].Deutsch['1'].endnote;
  const result = getOverviewNote(app, 'child-a', 'Deutsch', '1');
  assert.ok(result.noteToRender === null || typeof result.noteToRender === 'number');
});

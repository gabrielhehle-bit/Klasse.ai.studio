import test from 'node:test';
import assert from 'node:assert/strict';
import type { AppState } from '../types';
import { berechne } from './GradeUtils';
import { explainGradebookWeightImpact } from './gradebookWeightImpact';

function fixture(): AppState {
  return {
    schulart: 'volksschule',
    faecher: ['Deutsch'],
    schueler: [{ id: 'pupil-1', vorname: 'Test', nachname: 'Kind' }],
    notenGewichtung: {
      Deutsch: { sa: 0, lzk: 80, wp: 0, hue: 0, obj: 0, mi: 20 },
    },
    notenMeta: { Deutsch: { assessmentMode: 'grades' } },
    noten: {
      'pupil-1': {
        Deutsch: {
          '1': { sa: [], lzk: [2], wp: [], aufgaben: [], hue: 0, hueAnm: [], miDirekt: 4 },
        },
      },
    },
    mitarbeit_settings: { mode: 'manual' },
  } as unknown as AppState;
}

test('weight impact exposes exactly the same grade as the unchanged production calculation', () => {
  const app = fixture();
  const before = JSON.stringify(app);
  const impact = explainGradebookWeightImpact(app, 'pupil-1', 'Deutsch', '1');

  assert.equal(impact.total, 2.4);
  assert.equal(impact.total, berechne(app, 'pupil-1', 'Deutsch', '1'));
  assert.equal(impact.configuredTotal, 100);
  assert.equal(impact.activeWeight, 100);
  assert.deepEqual(impact.rows.map(row => ({
    key: row.key, configured: row.configuredWeight, effective: row.effectiveWeight, value: row.categoryValue,
  })), [
    { key: 'lzk', configured: 80, effective: 80, value: 2 },
    { key: 'mi', configured: 20, effective: 20, value: 4 },
  ]);
  assert.equal(JSON.stringify(app), before, 'not a single saved mark or setting may change');
});

test('missing participation is excluded and the available assessment gets a temporary 100 percent', () => {
  const app = fixture();
  delete app.noten['pupil-1'].Deutsch['1'].miDirekt;
  const before = JSON.stringify(app);
  const impact = explainGradebookWeightImpact(app, 'pupil-1', 'Deutsch', '1');

  assert.equal(impact.total, 2);
  assert.equal(impact.activeWeight, 80);
  assert.equal(impact.rows.find(row => row.key === 'lzk')?.effectiveWeight, 100);
  assert.equal(impact.rows.find(row => row.key === 'mi')?.active, false);
  assert.equal(impact.rows.find(row => row.key === 'mi')?.effectiveWeight, 0);
  assert.equal(JSON.stringify(app), before);
});

test('zero points are a real 0 percent assessment, not a missing assessment', () => {
  const app = fixture();
  app.notenGewichtung.Deutsch = { sa: 0, lzk: 100, wp: 0, hue: 0, obj: 0, mi: 0 };
  app.notenMeta.Deutsch = { assessmentMode: 'points', maxPoints: { lzk: [20] } };
  app.noten['pupil-1'].Deutsch['1'].lzk = [0];

  const impact = explainGradebookWeightImpact(app, 'pupil-1', 'Deutsch', '1');
  assert.equal(impact.mode, 'points');
  assert.equal(impact.total, 0);
  assert.equal(impact.rows[0].active, true);
  assert.equal(impact.rows[0].categoryValue, 0);
  assert.equal(impact.rows[0].effectiveWeight, 100);
});

test('document-only homework is not falsely shown as contributing', () => {
  const app = fixture();
  app.notenGewichtung.Deutsch = { sa: 0, lzk: 50, wp: 0, hue: 50, obj: 0, mi: 0 };
  app.notenMeta.Deutsch.hueMode = 'document';
  const impact = explainGradebookWeightImpact(app, 'pupil-1', 'Deutsch', '1');
  assert.equal(impact.total, 2);
  assert.equal(impact.rows.find(row => row.key === 'hue')?.active, false);
  assert.equal(impact.rows.find(row => row.key === 'lzk')?.effectiveWeight, 100);
});

test('participation-only subjects do not present unrelated weights as grade components', () => {
  const app = fixture();
  app.faecher = ['Religion'];
  app.notenGewichtung = { Religion: { sa: 0, lzk: 50, wp: 0, hue: 0, obj: 0, mi: 50 } };
  app.noten['pupil-1'].Religion = {
    '1': { sa: [], lzk: [1], wp: [], aufgaben: [], hue: 0, hueAnm: [], miDirekt: 3 },
  };
  const impact = explainGradebookWeightImpact(app, 'pupil-1', 'Religion', '1');
  assert.equal(impact.miOnly, true);
  assert.equal(impact.total, 3);
  assert.deepEqual(impact.rows.map(row => row.key), ['mi']);
  assert.equal(impact.rows[0].effectiveWeight, 100);
});

test('no scored assessment produces no effective weight without writing placeholder scores', () => {
  const app = fixture();
  app.noten['pupil-1'].Deutsch['1'].lzk = [];
  delete app.noten['pupil-1'].Deutsch['1'].miDirekt;
  const impact = explainGradebookWeightImpact(app, 'pupil-1', 'Deutsch', '1');
  assert.equal(impact.total, null);
  assert.equal(impact.activeWeight, 0);
  assert.ok(impact.rows.every(row => !row.active && row.effectiveWeight === 0));
});

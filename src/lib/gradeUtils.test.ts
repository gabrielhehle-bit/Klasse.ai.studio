import test from 'node:test';
import assert from 'node:assert/strict';
import { getFachCfg, berechne, isAssessmentValueMissing, hasCalculatedAverage } from './GradeUtils';

function baseApp() {
  return {
    faecher: ['Deutsch'],
    fachConfig: { Deutsch: { color: '#000000', unterrichtet: true } },
    schueler: [{ id: 's1', vorname: 'Test', nachname: 'Kind' }],
    noten: {
      s1: {
        Deutsch: {
          '1': {
            sa: [],
            lzk: [2],
            wp: [],
            aufgaben: [5],
            hue: 0,
            hueAnm: [],
          },
        },
      },
    },
    mitarbeit: {},
    mitarbeit_settings: { thresholds: { 1: 13, 2: 10, 3: 7, 4: 4, 5: 0 }, mode: 'absolute' },
    notenMeta: {
      Deutsch: {
        enableObj: true,
        colCounts: { lzk: 1, wp: 0, obj: 1 },
      },
    },
    notenGewichtung: {
      Deutsch: { sa: 0, lzk: 100, wp: 0, obj: 0, mi: 0, hue: 0 },
    },
    settings: {},
  } as any;
}

test('generic other-assessment area can be visible without changing the grade at 0% weight', () => {
  const app = baseApp();
  assert.equal(getFachCfg(app, 'Deutsch').obj, true);
  assert.equal(berechne(app, 's1', 'Deutsch', '1'), 2);
});

test('generic other assessment contributes only after a positive explicit weighting is configured', () => {
  const app = baseApp();
  app.notenGewichtung.Deutsch = { sa: 0, lzk: 50, wp: 0, obj: 50, mi: 0, hue: 0 };
  assert.equal(berechne(app, 's1', 'Deutsch', '1'), 3.5);
});


test('zero points are recorded, not missing', () => {
  assert.equal(isAssessmentValueMissing(0), false);
  assert.equal(isAssessmentValueMissing('0'), false);
  assert.equal(isAssessmentValueMissing(null), true);
  assert.equal(isAssessmentValueMissing('f'), true);
});

test('zero percent is a calculated average', () => {
  assert.equal(hasCalculatedAverage(0), true);
  assert.equal(hasCalculatedAverage(null), false);
  assert.equal(hasCalculatedAverage(undefined), false);
});

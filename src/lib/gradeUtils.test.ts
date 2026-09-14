import test from 'node:test';
import assert from 'node:assert/strict';
import { getFachCfg, berechne, getAssessmentStorageValue, getHomeworkGradebookSettings, getMirroredAssessmentValue, isAssessmentValueMissing, hasCalculatedAverage, parseAssessmentInput, parseFinalGradeInput } from './GradeUtils';

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


test('invalid gradebook input is rejected instead of becoming an empty value', () => {
  assert.deepEqual(parseAssessmentInput('abc', 'grades', 20), { valid: false, value: null });
  assert.deepEqual(parseAssessmentInput('12foo', 'points', 20), { valid: false, value: null });
});

test('gradebook parser accepts zero, decimal commas, statuses and tendencies', () => {
  assert.deepEqual(parseAssessmentInput('0', 'points', 20), { valid: true, value: 0 });
  assert.deepEqual(parseAssessmentInput('0%', 'percent', 100), { valid: true, value: 0 });
  assert.deepEqual(parseAssessmentInput('12,5', 'points', 20), { valid: true, value: 12.5 });
  assert.deepEqual(parseAssessmentInput('2+', 'grades', 20), { valid: true, value: '2+' });
  assert.deepEqual(parseAssessmentInput('e', 'grades', 20), { valid: true, value: 'e' });
});

test('gradebook parser rejects out-of-range values instead of silently changing them', () => {
  assert.deepEqual(parseAssessmentInput('150', 'percent', 100), { valid: false, value: null });
  assert.deepEqual(parseAssessmentInput('25', 'points', 20), { valid: false, value: null });
  assert.deepEqual(parseAssessmentInput('7', 'grades', 20), { valid: false, value: null });
});


test('assessment storage keeps points and percent modes distinct from grades', () => {
  assert.equal(getAssessmentStorageValue('grades', 12, 20, 2), 2);
  assert.equal(getAssessmentStorageValue('points', 12, 20, 2), 12);
  assert.equal(getAssessmentStorageValue('percent', 12, 20, 2), 60);
  assert.equal(getAssessmentStorageValue('percent', 0, 20, 5), 0);
});


test('final-grade parser accepts valid grades and SPF markers but rejects accidental out-of-range values', () => {
  assert.deepEqual(parseFinalGradeInput('2,5'), { valid: true, value: '2.5' });
  assert.deepEqual(parseFinalGradeInput('SPF'), { valid: true, value: 'SPF' });
  assert.deepEqual(parseFinalGradeInput('ESPF'), { valid: true, value: 'ESPF' });
  assert.deepEqual(parseFinalGradeInput('6'), { valid: false, value: '' });
  assert.deepEqual(parseFinalGradeInput('12'), { valid: false, value: '' });
});

test('homework grading rules are subject-specific with legacy settings only as fallback', () => {
  const app = baseApp();
  app.settings = { hueGewichten: false, huePercentDeduction: 9, hueWeight: 2 };
  app.notenMeta.Deutsch = {
    ...app.notenMeta.Deutsch,
    hueMode: 'grade',
    hueDeduction: 4,
    hueMitarbeitWeight: 0.5,
  };
  app.notenMeta.Mathematik = {
    hueMode: 'document',
    hueDeduction: 7,
    hueMitarbeitWeight: 3,
  };

  assert.deepEqual(getHomeworkGradebookSettings(app, 'Deutsch'), {
    mode: 'grade',
    percentDeduction: 4,
    participationDeduction: 0.5,
  });
  assert.deepEqual(getHomeworkGradebookSettings(app, 'Mathematik'), {
    mode: 'document',
    percentDeduction: 7,
    participationDeduction: 3,
  });
  assert.deepEqual(getHomeworkGradebookSettings(app, 'Sachunterricht'), {
    mode: 'document',
    percentDeduction: 9,
    participationDeduction: 2,
  });
});

test('manual participation in points mode is converted using its configured maximum', () => {
  const app = baseApp();
  app.notenMeta.Deutsch.assessmentMode = 'points';
  app.notenMeta.Deutsch.maxPoints = { mi: [20] };
  app.notenGewichtung.Deutsch = { sa: 0, lzk: 0, wp: 0, obj: 0, mi: 100, hue: 0 };
  app.mitarbeit_settings = { mode: 'manual' };
  app.noten.s1.Deutsch['1'].miDirekt = 10;

  assert.equal(berechne(app, 's1', 'Deutsch', '1'), 50);
});

test('weekly-plan mirroring never reinterprets a raw value across different assessment modes', () => {
  assert.deepEqual(
    getMirroredAssessmentValue(8, 'points', 10, 'grades', 20),
    { sync: false, value: 8 },
  );
  assert.deepEqual(
    getMirroredAssessmentValue(8, 'points', 10, 'points', 20),
    { sync: true, value: 16 },
  );
  assert.deepEqual(
    getMirroredAssessmentValue(80, 'percent', 100, 'percent', 100),
    { sync: true, value: 80 },
  );
  assert.deepEqual(
    getMirroredAssessmentValue('e', 'points', 10, 'grades', 20),
    { sync: true, value: 'e' },
  );
});


test('different subjects can apply different homework rules without affecting each other', () => {
  const app = baseApp();
  app.faecher = ['Deutsch', 'Mathematik'];
  app.fachConfig.Mathematik = { color: '#000000', unterrichtet: true };
  app.noten.s1.Mathematik = {
    '1': {
      sa: [],
      lzk: [2],
      wp: [],
      aufgaben: [],
      hue: 2,
      hueErfasst: true,
      hueAnm: [],
    },
  };
  app.noten.s1.Deutsch['1'].hue = 2;
  app.noten.s1.Deutsch['1'].hueErfasst = true;
  app.notenMeta.Deutsch = {
    ...app.notenMeta.Deutsch,
    hueMode: 'grade',
    hueDeduction: 10,
  };
  app.notenMeta.Mathematik = {
    assessmentMode: 'grades',
    hueMode: 'document',
    colCounts: { lzk: 1, wp: 0, obj: 0 },
  };
  app.notenGewichtung.Deutsch = { sa: 0, lzk: 50, wp: 0, obj: 0, mi: 0, hue: 50 };
  app.notenGewichtung.Mathematik = { sa: 0, lzk: 100, wp: 0, obj: 0, mi: 0, hue: 0 };

  const deutsch = berechne(app, 's1', 'Deutsch', '1');
  const mathe = berechne(app, 's1', 'Mathematik', '1');

  assert.equal(deutsch, 1.5);
  assert.equal(mathe, 2);
});

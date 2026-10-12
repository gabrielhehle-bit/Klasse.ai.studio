import test from 'node:test';
import assert from 'node:assert/strict';
import { getFachCfg, berechne, miZuNote, hasSubjectAssessmentEntries, getAssessmentStorageValue, getHomeworkGradebookSettings, getMirroredAssessmentValue, getShowPointsPercent, isAssessmentValueMissing, hasCalculatedAverage, parseAssessmentInput, parseFinalGradeInput } from './GradeUtils';

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
    hueDeduction: 5,
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


test('points percent visibility defaults to on and can be disabled per subject', () => {
  const app = baseApp();
  app.notenMeta.Deutsch.assessmentMode = 'points';

  assert.equal(getShowPointsPercent(app, 'Deutsch'), true);

  app.notenMeta.Deutsch.showPointsPercent = false;
  assert.equal(getShowPointsPercent(app, 'Deutsch'), false);

  app.notenMeta.Deutsch.showPointsPercent = true;
  assert.equal(getShowPointsPercent(app, 'Deutsch'), true);
});


test('relative participation uses the same active-pupil baseline in row and weighted total', () => {
  const app = baseApp();
  app.schueler = [{ id: 's1' }, { id: 's2' }, { id: 's3' }];
  app.mitarbeit = { s1: { Deutsch: { '1': 10 } }, s2: { Deutsch: { '1': 10 } }, s3: { Deutsch: { '1': 0 } } };
  app.mitarbeit_settings = { mode: 'relative', relative_confirmed: true };
  app.notenGewichtung.Deutsch = { sa: 0, lzk: 0, wp: 0, obj: 0, mi: 100, hue: 0 };
  assert.equal(miZuNote(10, app.mitarbeit_settings, app.mitarbeit, 'Deutsch', '1', app.schueler), 3);
  assert.equal(berechne(app, 's1', 'Deutsch', '1'), 3);
  assert.equal(berechne(app, 's3', 'Deutsch', '1'), 5);
  app.notenMeta.Deutsch.assessmentMode = 'percent';
  assert.equal(berechne(app, 's1', 'Deutsch', '1'), 60);
  assert.equal(berechne(app, 's3', 'Deutsch', '1'), 20);
});

test('relative participation distinguishes a saved zero from an absent counter', () => {
  const app = baseApp();
  app.mitarbeit_settings = { mode: 'relative', relative_confirmed: true };
  app.notenGewichtung.Deutsch = { sa: 0, lzk: 0, wp: 0, obj: 0, mi: 100, hue: 0 };
  assert.equal(berechne(app, 's1', 'Deutsch', '1'), null);
  app.mitarbeit = { s1: { Deutsch: { '1': 0 } } };
  assert.equal(berechne(app, 's1', 'Deutsch', '1'), 5);
});

test('relative thresholds preserve explicit zero and default individually missing entries', () => {
  const students = [{ id: 'a' }, { id: 'b' }];
  const counters = { a: { Deutsch: { '1': 10, '2': 100 }, Mathematik: { '1': 500 } }, b: { Deutsch: { '1': 10 } }, outsider: { Deutsch: { '1': 1000 } } };
  const settings = { mode: 'relative', relative_confirmed: true, relative_thresholds: { 1: 0 } };
  assert.equal(miZuNote(10, settings, counters, 'Deutsch', '1', students), 1);
  assert.equal(miZuNote(9, settings, counters, 'Deutsch', '1', students), 4);
  assert.equal(miZuNote(0, settings, counters, 'Deutsch', '1', students), 5);
  assert.equal(miZuNote(10, { ...settings, relative_confirmed: false }, counters, 'Deutsch', '1', students), 2);
});


test('manual-only assessment values including zero trigger scale-change protection in either semester', () => {
  const app = baseApp();
  app.noten.s1.Deutsch['1'] = { sa: [], lzk: [], wp: [], aufgaben: [] };
  assert.equal(hasSubjectAssessmentEntries(app, 'Deutsch'), false);
  app.noten.s1.Deutsch['1'].miDirekt = 0;
  assert.equal(hasSubjectAssessmentEntries(app, 'Deutsch'), true);
  app.noten.s1.Deutsch['1'].miDirekt = undefined;
  app.noten.s1.Deutsch['2'] = { miDirekt: 50 };
  assert.equal(hasSubjectAssessmentEntries(app, 'Deutsch'), true);
  assert.equal(hasSubjectAssessmentEntries(app, 'Mathematik'), false);
  app.schueler = [];
  assert.equal(hasSubjectAssessmentEntries(app, 'Deutsch'), false);
});

test('manual participation preserves zero and scale maxima in weighted points and percent totals', () => {
  const app = baseApp();
  app.mitarbeit_settings = { mode: 'manual' };
  app.notenGewichtung.Deutsch = { sa: 0, lzk: 50, wp: 0, obj: 0, mi: 50, hue: 0 };
  app.notenMeta.Deutsch.maxPoints = { mi: [40], lzk: [20] };
  for (const mode of ['points', 'percent']) {
    app.notenMeta.Deutsch.assessmentMode = mode;
    app.noten.s1.Deutsch['1'].lzk = [mode === 'points' ? 20 : 100];
    for (const [value, expected] of [[0, 50], [mode === 'points' ? 20 : 50, 75], [mode === 'points' ? 40 : 100, 100]]) {
      app.noten.s1.Deutsch['1'].miDirekt = value;
      assert.equal(berechne(app, 's1', 'Deutsch', '1'), expected);
    }
    app.noten.s1.Deutsch['1'].miDirekt = undefined;
    assert.equal(berechne(app, 's1', 'Deutsch', '1'), 100);
  }
});

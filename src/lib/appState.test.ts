import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAppState, syncActiveClass, switchClassState } from './appState';

function fixture() {
  return normalizeAppState({
    activeClassId: 'a',
    classes: ['a', 'b'].map(id => ({
      id, name: id, schueler: [{ id: `student-${id}` }],
      saAssessments: { [`student-${id}`]: { Mathematik: { '1': { '0': { marker: id } } } } },
      notenMeta: {
        __customSaPresets: [{ id: `preset-${id}`, title: `Raster ${id}` }],
        Mathematik: {
          assessmentMode: id === 'a' ? 'grades' : 'points',
          labels: { wp: `wp-${id}` },
          saDefaults: {
            '1': {
              0: { config: { marker: id }, aspects: [{ id: `aspect-${id}`, title: id, criteria: [] }] },
            },
          },
        },
      },
      notenGewichtung: { Mathematik: { sa: id === 'a' ? 60 : 40, lzk: 20, wp: 20, obj: 0, mi: id === 'a' ? 0 : 20 } },
      lernzielTracker: { Mathematik: { [`goal-${id}`]: { text: id, abgehakt: id === 'a', abgehaktAm: null, kw: 37 } } },
      studentLernzielBewertungen: { [`student-${id}`]: { [`goal-${id}`]: id === 'a' ? 1 : 3 } },
      studentLernzielSemesterBewertungen: { [`student-${id}`]: { '1': { [`goal-${id}`]: id === 'a' ? 1 : 3 } } },
      diagnostikErgebnisse: [{ id: `legacy-result-${id}`, schuelerId: `student-${id}` }],
      diagnostikErhebungen: [{ id: `legacy-run-${id}`, schuelerId: `student-${id}`, datum: '2026-09-14' }],
      diagnosticResults: [{ id: `result-${id}`, studentId: `student-${id}`, date: '2026-09-14' }],
      ikmRecords: [{ id: `ikm-${id}`, schuelerId: `student-${id}` }],
      antolinRecords: [{ id: `antolin-${id}`, schuelerId: `student-${id}` }],
      schuelerGoals: [{ id: `student-goal-${id}`, schuelerId: `student-${id}` }],
      observations: [{ id: `observation-${id}`, schuelerId: `student-${id}` }],
      metaKognitionsProtokolle: [{ id: `meta-${id}`, schuelerId: `student-${id}` }],
      interaktionsLog: { eintraege: [{ id: `interaction-${id}`, schuelerId: `student-${id}` }], wochenEmpfehlung: null },
      stundenZeiten: { 1: `${id}-08:00` }, scheduleAnalysis: { marker: id },
      lastGroups: [{ marker: id }], customBgColor: id,
      wochenplanung: { 37: { Montag: [{ thema: id }] } },
      customLists: [{ id }], klassenglas_missions: [id],
      futureExtension: { preserved: id },
    })),
  });
}

test('A → B → edit → A → reload preserves both classes and their assessments', () => {
  const a = fixture();
  const originalA = structuredClone(a.classes[0]);
  let b = syncActiveClass(switchClassState(a, 'b'));
  assert.deepEqual(b.saAssessments, a.classes[1].saAssessments);
  assert.equal(b.stundenZeiten[1], 'b-08:00');
  assert.equal((b.scheduleAnalysis as any).marker, 'b');
  assert.equal(b.notenMeta.Mathematik.assessmentMode, 'points');
  assert.equal(b.notenGewichtung.Mathematik.sa, 40);
  b = syncActiveClass({
    ...b,
    saAssessments: { ...b.saAssessments, newAssessment: { 0: { value: 2 } } },
    notenMeta: { ...b.notenMeta, Mathematik: { ...b.notenMeta.Mathematik, labels: { wp: 'edited-b' } } },
  } as any);
  const reloaded = normalizeAppState(JSON.parse(JSON.stringify(syncActiveClass(switchClassState(b, 'a')))));
  assert.deepEqual(reloaded.saAssessments, originalA.saAssessments);
  assert.deepEqual(reloaded.notenMeta, originalA.notenMeta);
  assert.deepEqual(reloaded.notenGewichtung, originalA.notenGewichtung);
  assert.equal(reloaded.classes[1].saAssessments.newAssessment[0].value, 2);
  assert.equal(reloaded.classes[1].notenMeta.Mathematik.labels.wp, 'edited-b');
  assert.equal(reloaded.classes[0].notenMeta.Mathematik.saDefaults['1'][0].config.marker, 'a');
  assert.equal(reloaded.classes[1].notenMeta.Mathematik.saDefaults['1'][0].config.marker, 'b');
  assert.equal(reloaded.classes[0].notenMeta.__customSaPresets[0].id, 'preset-a');
  assert.equal(reloaded.classes[1].notenMeta.__customSaPresets[0].id, 'preset-b');
  assert.equal(reloaded.classes[0].lernzielTracker.Mathematik['goal-a'].text, 'a');
  assert.equal(reloaded.classes[1].lernzielTracker.Mathematik['goal-b'].text, 'b');
  assert.equal(reloaded.classes[0].studentLernzielSemesterBewertungen['student-a']['1']['goal-a'], 1);
  assert.equal(reloaded.classes[1].studentLernzielSemesterBewertungen['student-b']['1']['goal-b'], 3);
  assert.equal(reloaded.classes[1].wochenplanung[37].Montag[0].thema, 'b');
  assert.deepEqual((reloaded.classes[1] as any).futureExtension, { preserved: 'b' });
});

test('empty target assessments cannot inherit previous student records', () => {
  const a = fixture();
  delete a.classes[1].saAssessments;
  assert.deepEqual(syncActiveClass(switchClassState(a, 'b')).saAssessments, {});
});

test('normalization preserves inactive class extension fields across repeated loads', () => {
  const a = fixture();
  const loaded = normalizeAppState(JSON.parse(JSON.stringify(a)));
  for (const field of ['stundenZeiten', 'scheduleAnalysis', 'lastGroups', 'customBgColor', 'futureExtension']) {
    assert.deepEqual(loaded.classes[1][field], a.classes[1][field]);
  }
  assert.deepEqual(normalizeAppState(loaded), loaded);
});

test('legacy single-class migration retains root scheduling and assessments', () => {
  const legacy = { schueler: [], stundenZeiten: { 1: '09:00' }, scheduleAnalysis: { marker: 1 }, saAssessments: { marker: 2 } };
  const loaded = normalizeAppState(legacy);
  assert.deepEqual(loaded.classes[0].stundenZeiten, legacy.stundenZeiten);
  assert.deepEqual(loaded.classes[0].scheduleAnalysis, legacy.scheduleAnalysis);
  assert.deepEqual(loaded.saAssessments, legacy.saAssessments);
});

test('unknown class switch is a no-op and does not mutate the input', () => {
  const state = fixture();
  const before = structuredClone(state);
  assert.equal(switchClassState(state, 'missing'), state);
  assert.deepEqual(state, before);
});

test('legacy root-only assessments are retained only for the active class', () => {
  const loaded = normalizeAppState({
    activeClassId: 'a', saAssessments: { student: { 0: { score: 7 } } },
    classes: [{ id: 'a', schueler: [] }, { id: 'b', schueler: [] }],
  });
  assert.equal(loaded.saAssessments.student[0].score, 7);
  assert.deepEqual(loaded.classes[1].saAssessments, {});
});

test('classroom ink survives class changes, snapshots and reload without mixing classes', () => {
  const original = fixture();
  const ink = {
    a: [{ id: 'stroke-a', color: '#172554', width: 4, points: [[10, 20], [30, 40]] }],
    b: [{ id: 'text-b', color: '#172554', width: 4, points: [[50, 60]], text: 'Synthetic task' }],
  };
  const state = { ...original, boardSettings: { ...original.boardSettings, cockpitInkByClass: ink } };
  const switched = syncActiveClass(switchClassState(state, 'b'));
  const reloaded = normalizeAppState(JSON.parse(JSON.stringify(switched)));
  assert.deepEqual(reloaded.boardSettings.cockpitInkByClass, ink);
  assert.deepEqual(syncActiveClass(switchClassState(reloaded, 'a')).boardSettings.cockpitInkByClass, ink);
});

test('old app snapshots load without inventing or replacing classroom ink', () => {
  const old = fixture();
  assert.equal(normalizeAppState(JSON.parse(JSON.stringify(old))).boardSettings.cockpitInkByClass, undefined);
});


test('class switches replace root learning-goal data instead of mixing classes', () => {
  const state = fixture();
  const b = switchClassState(state, 'b');
  assert.equal(b.lernzielTracker.Mathematik['goal-b'].text, 'b');
  assert.equal(b.lernzielTracker.Mathematik['goal-a'], undefined);
  assert.equal(b.studentLernzielBewertungen['student-b']['goal-b'], 3);
  assert.equal(b.studentLernzielBewertungen['student-a'], undefined);

  const a = switchClassState(b, 'a');
  assert.equal(a.lernzielTracker.Mathematik['goal-a'].text, 'a');
  assert.equal(a.lernzielTracker.Mathematik['goal-b'], undefined);
  assert.equal(a.studentLernzielSemesterBewertungen['student-a']['1']['goal-a'], 1);
  assert.equal(a.studentLernzielSemesterBewertungen['student-b'], undefined);
});


test('class switches isolate diagnostic, iKM, Antolin and student-development records', () => {
  const state = fixture();
  const b = switchClassState(state, 'b');

  assert.equal(b.diagnosticResults?.[0]?.id, 'result-b');
  assert.equal((b.diagnostikErhebungen as any[])?.[0]?.id, 'legacy-run-b');
  assert.equal(b.ikmRecords?.[0]?.id, 'ikm-b');
  assert.equal(b.antolinRecords?.[0]?.id, 'antolin-b');
  assert.equal(b.schuelerGoals?.[0]?.id, 'student-goal-b');
  assert.equal(b.observations?.[0]?.id, 'observation-b');
  assert.equal(b.metaKognitionsProtokolle?.[0]?.id, 'meta-b');
  assert.equal(b.interaktionsLog?.eintraege?.[0]?.id, 'interaction-b');
  assert.equal(b.diagnosticResults?.some((entry: any) => entry.id === 'result-a'), false);

  const a = switchClassState(syncActiveClass(b), 'a');
  assert.equal(a.diagnosticResults?.[0]?.id, 'result-a');
  assert.equal(a.ikmRecords?.[0]?.id, 'ikm-a');
  assert.equal(a.antolinRecords?.[0]?.id, 'antolin-a');
  assert.equal(a.schuelerGoals?.[0]?.id, 'student-goal-a');
  assert.equal(a.observations?.[0]?.id, 'observation-a');
  assert.equal(a.metaKognitionsProtokolle?.[0]?.id, 'meta-a');
  assert.equal(a.interaktionsLog?.eintraege?.[0]?.id, 'interaction-a');
});

test('legacy root-only diagnostic data is assigned only to the active class', () => {
  const loaded = normalizeAppState({
    activeClassId: 'a',
    diagnosticResults: [{ id: 'root-result', studentId: 'student-a' }],
    ikmRecords: [{ id: 'root-ikm', schuelerId: 'student-a' }],
    classes: [
      { id: 'a', schueler: [{ id: 'student-a' }] },
      { id: 'b', schueler: [{ id: 'student-b' }] },
    ],
  });

  assert.equal(loaded.classes[0].diagnosticResults?.[0]?.id, 'root-result');
  assert.equal(loaded.classes[0].ikmRecords?.[0]?.id, 'root-ikm');
  assert.deepEqual(loaded.classes[1].diagnosticResults, []);
  assert.deepEqual(loaded.classes[1].ikmRecords, []);
});

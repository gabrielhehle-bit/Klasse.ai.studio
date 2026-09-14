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

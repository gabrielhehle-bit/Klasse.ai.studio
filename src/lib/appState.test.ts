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
      mitarbeit: { [`student-${id}`]: { Mathematik: { '1': id === 'a' ? 3 : 7 } } },
      mitarbeit_settings: {
        mode: id === 'a' ? 'absolute' : 'manual',
        thresholds: id === 'a'
          ? { 1: 13, 2: 10, 3: 7, 4: 4, 5: 0 }
          : { 1: 20, 2: 15, 3: 10, 4: 5, 5: 0 },
      },
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
      anwesenheit: { [`student-${id}`]: { '2026-09-14': { 1: id === 'a' ? 'a' : 'e', 2: 'a' } } },
      anwesenheitDetail: { [`student-${id}`]: { '2026-09-14': { verspaetung: id === 'a' ? 5 : 0, notiz: `attendance-${id}` } } },
      stundenZeiten: { 1: `${id}-08:00` }, scheduleAnalysis: { marker: id },
      lastGroups: [{ marker: id }], customBgColor: id,
      behavior_status: { [`student-${id}`]: id === 'a' ? '1' : '4' },
      behavior_notes: { [`student-${id}`]: `quick-${id}` },
      notes: [{ id: `note-${id}`, datum: '2026-09-14T10:00:00.000Z', kategorie: 'Journal', inhalt: `note-${id}` }],
      journal: [{ id: `note-${id}`, datum: '2026-09-14T10:00:00.000Z', kategorie: 'Journal', inhalt: `note-${id}` }],
      statusLog: [{ id: `status-${id}`, schuelerId: `student-${id}`, datum: '2026-09-14', iconId: id === 'a' ? '1' : '4', timestamp: id === 'a' ? 1 : 2 }],
      vertretungHinweise: `handover-${id}`,
      elterngespraeche: [{ id: `meeting-${id}`, schuelerId: `student-${id}`, datum: '2026-09-14', thema: `meeting-${id}` }],
      kelGespraeche: [{ id: `kel-${id}`, schuelerId: `student-${id}`, datum: '2026-09-14' }],
      portfolioEntries: { [`student-${id}`]: [{ id: `portfolio-${id}`, datum: '2026-09-14', titel: `portfolio-${id}` }] },
      kiPortfolioSummaries: { [`student-${id}`]: `summary-${id}` },
      oberauData: { [`student-${id}`]: { remarks: `remarks-${id}`, evaluationData: { criterion: id === 'a' ? 2 : 4 } } },
      sitzplan_schueler: { [`student-${id}`]: { x: id === 'a' ? 100 : 300, y: id === 'a' ? 150 : 350 } },
      sitzplan_objekte: [{ id: `board-${id}`, type: 'blackboard', x: id === 'a' ? 20 : 500, y: 10, w: 200, h: 10 }],
      sitzplanRegeln: [{ id: `rule-${id}`, typ: 'feste_zone', schuelerIds: [`student-${id}`], zone: id === 'a' ? 'vorne' : 'hinten' }],
      wochenplanung: { 37: { Montag: [{ thema: id }] } },
      klassenkasse: {
        kontostand: id === 'a' ? 12.5 : 7.25,
        sammlungen: [{
          id: `collection-${id}`,
          titel: `Sammlung ${id}`,
          betrag: id === 'a' ? 5 : 7.25,
          erstelltAm: '2026-09-14T10:00:00.000Z',
          status: { [`student-${id}`]: id === 'a' ? 'bezahlt' : 'offen' },
          betraege: { [`student-${id}`]: id === 'a' ? 5 : 0 },
        }],
        transaktionen: [{
          id: `tx-${id}`,
          datum: '2026-09-14T10:00:00.000Z',
          titel: `Buchung ${id}`,
          betrag: id === 'a' ? 5 : 2.25,
          typ: 'plus',
          kategorie: 'sonstiges',
        }],
      },
      checklisten: [{
        id: `check-${id}`,
        titel: `Check ${id}`,
        spalten: [{ id: 'ok', label: 'OK' }],
        eintraege: { [`student-${id}`]: { ok: id === 'a' } },
      }],
      customLists: [{
        id: `list-${id}`,
        titel: `Liste ${id}`,
        spalten: [{ id: 'value', label: 'Wert', type: 'text' }],
        werte: { [`student-${id}`]: { value: `value-${id}` } },
      }],
      zugangsdaten: [{
        id: `login-${id}`,
        bezeichnung: `Portal ${id}`,
        benutzername: `user-${id}`,
        passwort: `pw-${id}`,
        kategorie: 'Lernportal',
      }],
      klassenglas_missions: [id],
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


test('class switches isolate chronicle, journal and behavior status history', () => {
  const state = fixture();

  assert.equal(state.notes?.[0]?.id, 'note-a');
  assert.equal(state.journal?.[0]?.id, 'note-a');
  assert.equal(state.statusLog?.[0]?.id, 'status-a');
  assert.equal(state.behavior_status?.['student-a'], '1');

  let b = switchClassState(state, 'b');
  assert.equal(b.notes?.[0]?.id, 'note-b');
  assert.equal(b.journal?.[0]?.id, 'note-b');
  assert.equal(b.statusLog?.[0]?.id, 'status-b');
  assert.equal(b.behavior_status?.['student-b'], '4');
  assert.equal(b.notes?.some((entry: any) => entry.id === 'note-a'), false);
  assert.equal(b.statusLog?.some((entry: any) => entry.id === 'status-a'), false);

  b = syncActiveClass({
    ...b,
    notes: [{ id: 'note-b-edited', datum: '2026-09-14T11:00:00.000Z', kategorie: 'Verhalten', inhalt: 'edited' }],
    journal: [{ id: 'note-b-edited', datum: '2026-09-14T11:00:00.000Z', kategorie: 'Verhalten', inhalt: 'edited' }],
    statusLog: [{ id: 'status-b-edited', schuelerId: 'student-b', datum: '2026-09-14', iconId: '2', timestamp: 3 }],
    behavior_status: { 'student-b': '2' },
  } as any);

  const a = switchClassState(b, 'a');
  assert.equal(a.notes?.[0]?.id, 'note-a');
  assert.equal(a.statusLog?.[0]?.id, 'status-a');
  assert.equal(a.behavior_status?.['student-a'], '1');

  const reloaded = normalizeAppState(JSON.parse(JSON.stringify(syncActiveClass(a))));
  assert.equal(reloaded.classes[1].notes?.[0]?.id, 'note-b-edited');
  assert.equal(reloaded.classes[1].journal?.[0]?.id, 'note-b-edited');
  assert.equal(reloaded.classes[1].statusLog?.[0]?.id, 'status-b-edited');
  assert.equal(reloaded.classes[1].behavior_status?.['student-b'], '2');
});

test('legacy root-only chronicle and behavior history are assigned only to the active class', () => {
  const loaded = normalizeAppState({
    activeClassId: 'a',
    notes: [{ id: 'legacy-note', datum: '2026-09-14T10:00:00.000Z', kategorie: 'Journal', inhalt: 'legacy' }],
    journal: [{ id: 'legacy-note', datum: '2026-09-14T10:00:00.000Z', kategorie: 'Journal', inhalt: 'legacy' }],
    statusLog: [{ id: 'legacy-status', schuelerId: 'student-a', datum: '2026-09-14', iconId: '1', timestamp: 1 }],
    classes: [
      { id: 'a', schueler: [{ id: 'student-a' }] },
      { id: 'b', schueler: [{ id: 'student-b' }] },
    ],
  });

  assert.equal(loaded.classes[0].notes?.[0]?.id, 'legacy-note');
  assert.equal(loaded.classes[0].journal?.[0]?.id, 'legacy-note');
  assert.equal(loaded.classes[0].statusLog?.[0]?.id, 'legacy-status');
  assert.deepEqual(loaded.classes[1].notes, []);
  assert.deepEqual(loaded.classes[1].journal, []);
  assert.deepEqual(loaded.classes[1].statusLog, []);
  assert.deepEqual(switchClassState(loaded, 'b').notes, []);
  assert.deepEqual(switchClassState(loaded, 'b').statusLog, []);
});


test('legacy mixed multi-class chronicle is partitioned by student while general entries stay active', () => {
  const loaded = normalizeAppState({
    activeClassId: 'a',
    notes: [
      { id: 'note-a', datum: '2026-09-14T08:00:00.000Z', kategorie: 'Verhalten', inhalt: 'A', schuelerId: 'student-a' },
      { id: 'note-b', datum: '2026-09-14T09:00:00.000Z', kategorie: 'Erfolg', inhalt: 'B', schuelerId: 'student-b' },
      { id: 'general', datum: '2026-09-14T10:00:00.000Z', kategorie: 'Journal', inhalt: 'Allgemein' },
    ],
    journal: [
      { id: 'note-a', datum: '2026-09-14T08:00:00.000Z', kategorie: 'Verhalten', inhalt: 'A', schuelerId: 'student-a' },
      { id: 'note-b', datum: '2026-09-14T09:00:00.000Z', kategorie: 'Erfolg', inhalt: 'B', schuelerId: 'student-b' },
      { id: 'general', datum: '2026-09-14T10:00:00.000Z', kategorie: 'Journal', inhalt: 'Allgemein' },
    ],
    statusLog: [
      { id: 'status-a', schuelerId: 'student-a', datum: '2026-09-14', iconId: '1', timestamp: 1 },
      { id: 'status-b', schuelerId: 'student-b', datum: '2026-09-14', iconId: '4', timestamp: 2 },
    ],
    classes: [
      { id: 'a', schueler: [{ id: 'student-a' }] },
      { id: 'b', schueler: [{ id: 'student-b' }] },
    ],
  });

  assert.deepEqual(loaded.classes[0].notes?.map((entry: any) => entry.id), ['note-a', 'general']);
  assert.deepEqual(loaded.classes[1].notes?.map((entry: any) => entry.id), ['note-b']);
  assert.deepEqual(loaded.classes[0].journal?.map((entry: any) => entry.id), ['note-a', 'general']);
  assert.deepEqual(loaded.classes[1].journal?.map((entry: any) => entry.id), ['note-b']);
  assert.deepEqual(loaded.classes[0].statusLog?.map((entry: any) => entry.id), ['status-a']);
  assert.deepEqual(loaded.classes[1].statusLog?.map((entry: any) => entry.id), ['status-b']);

  const b = switchClassState(loaded, 'b');
  assert.deepEqual(b.notes?.map((entry: any) => entry.id), ['note-b']);
  assert.deepEqual(b.statusLog?.map((entry: any) => entry.id), ['status-b']);
});


test('class switches isolate seating positions, furniture and rules', () => {
  const state = fixture();

  assert.deepEqual(state.sitzplan_schueler, state.classes[0].sitzplan_schueler);
  assert.equal(state.sitzplan_objekte[0].id, 'board-a');
  assert.equal(state.sitzplanRegeln?.[0]?.id, 'rule-a');

  let b = switchClassState(state, 'b');
  assert.deepEqual(b.sitzplan_schueler, state.classes[1].sitzplan_schueler);
  assert.equal(b.sitzplan_objekte[0].id, 'board-b');
  assert.equal(b.sitzplanRegeln?.[0]?.id, 'rule-b');

  b = syncActiveClass({
    ...b,
    sitzplan_schueler: { 'student-b': { x: 444, y: 555 } },
    sitzplan_objekte: [{ id: 'board-b-edited', type: 'blackboard', x: 600, y: 20, w: 200, h: 10 }],
    sitzplanRegeln: [{ id: 'rule-b-edited', typ: 'fester_platz', schuelerIds: ['student-b'], position: { x: 444, y: 555 } }],
  } as any);

  const a = switchClassState(b, 'a');
  assert.deepEqual(a.sitzplan_schueler, state.classes[0].sitzplan_schueler);
  assert.equal(a.sitzplan_objekte[0].id, 'board-a');
  assert.equal(a.sitzplanRegeln?.[0]?.id, 'rule-a');

  const reloaded = normalizeAppState(JSON.parse(JSON.stringify(syncActiveClass(a))));
  assert.deepEqual(reloaded.classes[1].sitzplan_schueler, { 'student-b': { x: 444, y: 555 } });
  assert.equal(reloaded.classes[1].sitzplan_objekte[0].id, 'board-b-edited');
  assert.equal(reloaded.classes[1].sitzplanRegeln?.[0]?.id, 'rule-b-edited');
});

test('legacy global seating rules are partitioned by referenced students', () => {
  const loaded = normalizeAppState({
    activeClassId: 'a',
    sitzplanRegeln: [
      { id: 'rule-a', typ: 'feste_zone', schuelerIds: ['student-a'], zone: 'vorne' },
      { id: 'rule-b', typ: 'feste_zone', schuelerIds: ['student-b'], zone: 'hinten' },
    ],
    classes: [
      {
        id: 'a', name: 'A', stufe: 3, klassenvorstand: true,
        schueler: [{ id: 'student-a', vorname: 'Anna', nachname: 'A' }],
        sitzplan_schueler: { 'student-a': { x: 100, y: 100 } },
        sitzplan_objekte: [],
      },
      {
        id: 'b', name: 'B', stufe: 4, klassenvorstand: true,
        schueler: [{ id: 'student-b', vorname: 'Ben', nachname: 'B' }],
        sitzplan_schueler: { 'student-b': { x: 200, y: 200 } },
        sitzplan_objekte: [],
      },
    ],
  });

  assert.deepEqual(loaded.classes[0].sitzplanRegeln?.map((rule: any) => rule.id), ['rule-a']);
  assert.deepEqual(loaded.classes[1].sitzplanRegeln?.map((rule: any) => rule.id), ['rule-b']);
  assert.deepEqual(switchClassState(loaded, 'b').sitzplanRegeln?.map((rule: any) => rule.id), ['rule-b']);
});

test('legacy fixed-seat rule captures the current classroom coordinate during normalization', () => {
  const loaded = normalizeAppState({
    activeClassId: 'a',
    sitzplanRegeln: [{ id: 'fixed', typ: 'fester_platz', schuelerIds: ['student-a'] }],
    classes: [{
      id: 'a', name: 'A', stufe: 3, klassenvorstand: true,
      schueler: [{ id: 'student-a', vorname: 'Anna', nachname: 'A' }],
      sitzplan_schueler: { 'student-a': { x: 120, y: 240 } },
      sitzplan_objekte: [],
    }],
  });

  assert.deepEqual(loaded.sitzplanRegeln?.[0]?.position, { x: 120, y: 240 });
  assert.deepEqual(loaded.classes[0].sitzplanRegeln?.[0]?.position, { x: 120, y: 240 });
});


test('class switches isolate attendance and attendance details', () => {
  const state = fixture();
  assert.equal(state.anwesenheit['student-a']['2026-09-14'][1], 'a');
  assert.equal(state.anwesenheitDetail?.['student-a']?.['2026-09-14']?.notiz, 'attendance-a');

  let b = switchClassState(state, 'b');
  assert.equal(b.anwesenheit['student-b']['2026-09-14'][1], 'e');
  assert.equal(b.anwesenheitDetail?.['student-b']?.['2026-09-14']?.notiz, 'attendance-b');
  assert.equal(b.anwesenheit['student-a'], undefined);

  b = syncActiveClass({
    ...b,
    anwesenheit: {
      ...b.anwesenheit,
      'student-b': {
        ...b.anwesenheit['student-b'],
        '2026-09-14': { 1: 'u', 2: 'a' },
      },
    },
    anwesenheitDetail: {
      ...(b.anwesenheitDetail || {}),
      'student-b': {
        ...(b.anwesenheitDetail?.['student-b'] || {}),
        '2026-09-14': { verspaetung: 0, notiz: 'edited-b', fehlstunden: 1 },
      },
    },
  } as any);

  const a = switchClassState(b, 'a');
  assert.equal(a.anwesenheit['student-a']['2026-09-14'][1], 'a');
  assert.equal(a.anwesenheitDetail?.['student-a']?.['2026-09-14']?.notiz, 'attendance-a');

  const reloaded = normalizeAppState(JSON.parse(JSON.stringify(syncActiveClass(a))));
  assert.equal(reloaded.classes[1].anwesenheit['student-b']['2026-09-14'][1], 'u');
  assert.equal(reloaded.classes[1].anwesenheitDetail?.['student-b']?.['2026-09-14']?.notiz, 'edited-b');
  assert.equal(reloaded.classes[1].anwesenheitDetail?.['student-b']?.['2026-09-14']?.fehlstunden, 1);
});


test('class switches isolate gradebook participation settings', () => {
  const state = fixture();
  assert.equal(state.mitarbeit_settings?.mode, 'absolute');
  assert.equal(state.mitarbeit_settings?.thresholds?.[1], 13);

  let b = switchClassState(state, 'b');
  assert.equal(b.mitarbeit_settings?.mode, 'manual');
  assert.equal(b.mitarbeit_settings?.thresholds?.[1], 20);
  assert.equal(b.mitarbeit?.['student-b']?.Mathematik?.['1'], 7);
  assert.equal(b.mitarbeit?.['student-a'], undefined);

  b = syncActiveClass({
    ...b,
    mitarbeit_settings: {
      ...(b.mitarbeit_settings || {}),
      mode: 'relative',
      relative_confirmed: true,
      relative_thresholds: { 1: 25, 2: 10, 3: 0, 4: -15 },
    },
  } as any);

  const a = switchClassState(b, 'a');
  assert.equal(a.mitarbeit_settings?.mode, 'absolute');
  assert.equal(a.mitarbeit_settings?.relative_confirmed, undefined);

  const reloaded = normalizeAppState(JSON.parse(JSON.stringify(syncActiveClass(a))));
  assert.equal(reloaded.classes[0].mitarbeit_settings?.mode, 'absolute');
  assert.equal(reloaded.classes[1].mitarbeit_settings?.mode, 'relative');
  assert.equal(reloaded.classes[1].mitarbeit_settings?.relative_confirmed, true);
  assert.equal(reloaded.classes[1].mitarbeit_settings?.relative_thresholds?.[1], 25);
});


test('legacy shared participation settings are copied to every existing class before classes diverge', () => {
  const legacy = normalizeAppState({
    activeClassId: 'a',
    mitarbeit_settings: {
      mode: 'absolute',
      thresholds: { 1: 18, 2: 14, 3: 9, 4: 5, 5: 0 },
    },
    classes: [
      { id: 'a', name: 'a', schueler: [], noten: {}, mitarbeit: {} },
      { id: 'b', name: 'b', schueler: [], noten: {}, mitarbeit: {} },
    ],
  });

  assert.equal(legacy.classes[0].mitarbeit_settings?.thresholds?.[1], 18);
  assert.equal(legacy.classes[1].mitarbeit_settings?.thresholds?.[1], 18);
  assert.equal(switchClassState(legacy, 'b').mitarbeit_settings?.thresholds?.[1], 18);
});


test('class switches isolate Kassa & Orga data including class logins', () => {
  const state = fixture();
  assert.equal(state.klassenkasse?.kontostand, 12.5);
  assert.equal(state.checklisten?.[0]?.id, 'check-a');
  assert.equal(state.customLists?.[0]?.id, 'list-a');
  assert.equal(state.zugangsdaten?.[0]?.id, 'login-a');

  let b = switchClassState(state, 'b');
  assert.equal(b.klassenkasse?.kontostand, 7.25);
  assert.equal(b.klassenkasse?.sammlungen?.[0]?.id, 'collection-b');
  assert.equal(b.checklisten?.[0]?.id, 'check-b');
  assert.equal(b.customLists?.[0]?.id, 'list-b');
  assert.equal(b.zugangsdaten?.[0]?.id, 'login-b');

  b = syncActiveClass({
    ...b,
    klassenkasse: {
      ...(b.klassenkasse || { kontostand: 0, sammlungen: [], transaktionen: [] }),
      kontostand: 99.5,
    },
    checklisten: [{ ...(b.checklisten?.[0] as any), titel: 'edited-check-b' }],
    customLists: [{ ...(b.customLists?.[0] as any), titel: 'edited-list-b' }],
    zugangsdaten: [{ ...(b.zugangsdaten?.[0] as any), benutzername: 'edited-user-b' }],
  } as any);

  const a = switchClassState(b, 'a');
  assert.equal(a.klassenkasse?.kontostand, 12.5);
  assert.equal(a.checklisten?.[0]?.titel, 'Check a');
  assert.equal(a.customLists?.[0]?.titel, 'Liste a');
  assert.equal(a.zugangsdaten?.[0]?.benutzername, 'user-a');

  const reloaded = normalizeAppState(JSON.parse(JSON.stringify(syncActiveClass(a))));
  assert.equal(reloaded.classes[1].klassenkasse?.kontostand, 99.5);
  assert.equal(reloaded.classes[1].checklisten?.[0]?.titel, 'edited-check-b');
  assert.equal(reloaded.classes[1].customLists?.[0]?.titel, 'edited-list-b');
  assert.equal(reloaded.classes[1].zugangsdaten?.[0]?.benutzername, 'edited-user-b');
});

test('legacy global Kassa & Orga logins are copied into every existing class once', () => {
  const loaded = normalizeAppState({
    activeClassId: 'a',
    zugangsdaten: [{
      id: 'legacy-login',
      bezeichnung: 'Antolin',
      benutzername: 'klasse',
      passwort: 'secret',
      kategorie: 'Lernportal',
    }],
    classes: [
      { id: 'a', name: 'A', schueler: [], noten: {}, mitarbeit: {} },
      { id: 'b', name: 'B', schueler: [], noten: {}, mitarbeit: {} },
    ],
  });

  assert.equal(loaded.classes[0].zugangsdaten?.[0]?.id, 'legacy-login');
  assert.equal(loaded.classes[1].zugangsdaten?.[0]?.id, 'legacy-login');
  assert.equal(switchClassState(loaded, 'b').zugangsdaten?.[0]?.id, 'legacy-login');
});

test('legacy basis contribution is normalized for inactive classes too', () => {
  const loaded = normalizeAppState({
    activeClassId: 'a',
    classes: [
      {
        id: 'a', name: 'A', schueler: [{ id: 'a1' }], noten: {}, mitarbeit: {},
        klassenkasse: { beitrag_pro_kind: 10, kontostand: 10, zahlungen: { a1: true }, transaktionen: [] },
      },
      {
        id: 'b', name: 'B', schueler: [{ id: 'b1' }], noten: {}, mitarbeit: {},
        klassenkasse: { beitrag_pro_kind: 8.5, kontostand: 0, zahlungen: { b1: false }, transaktionen: [] },
      },
    ],
  } as any);

  assert.equal(loaded.classes[0].klassenkasse?.sammlungen?.[0]?.betrag, 10);
  assert.equal(loaded.classes[0].klassenkasse?.sammlungen?.[0]?.status?.a1, 'bezahlt');
  assert.equal(loaded.classes[1].klassenkasse?.sammlungen?.[0]?.betrag, 8.5);
  assert.equal(loaded.classes[1].klassenkasse?.sammlungen?.[0]?.status?.b1, 'offen');
  assert.equal(switchClassState(loaded, 'b').klassenkasse?.sammlungen?.[0]?.betrag, 8.5);
});


test('class switches isolate Übergabemappe notes', () => {
  const state = fixture();
  assert.equal(state.vertretungHinweise, 'handover-a');

  let b = switchClassState(state, 'b');
  assert.equal(b.vertretungHinweise, 'handover-b');

  b = syncActiveClass({
    ...b,
    vertretungHinweise: 'handover-b-edited',
  } as any);

  const a = switchClassState(b, 'a');
  assert.equal(a.vertretungHinweise, 'handover-a');

  const reloaded = normalizeAppState(JSON.parse(JSON.stringify(syncActiveClass(a))));
  assert.equal(reloaded.classes[0].vertretungHinweise, 'handover-a');
  assert.equal(reloaded.classes[1].vertretungHinweise, 'handover-b-edited');
});


test('class switches isolate parent meetings, KEL and profile artifacts', () => {
  const state = fixture();

  assert.equal(state.elterngespraeche?.[0]?.id, 'meeting-a');
  assert.equal(state.kelGespraeche?.[0]?.id, 'kel-a');
  assert.equal(state.portfolioEntries?.['student-a']?.[0]?.id, 'portfolio-a');
  assert.equal(state.kiPortfolioSummaries?.['student-a'], 'summary-a');
  assert.equal(state.oberauData?.['student-a']?.remarks, 'remarks-a');

  let b = switchClassState(state, 'b');
  assert.equal(b.elterngespraeche?.[0]?.id, 'meeting-b');
  assert.equal(b.kelGespraeche?.[0]?.id, 'kel-b');
  assert.equal(b.portfolioEntries?.['student-b']?.[0]?.id, 'portfolio-b');
  assert.equal(b.kiPortfolioSummaries?.['student-b'], 'summary-b');
  assert.equal(b.oberauData?.['student-b']?.remarks, 'remarks-b');
  assert.equal(b.portfolioEntries?.['student-a'], undefined);

  b = syncActiveClass({
    ...b,
    elterngespraeche: [{ id: 'meeting-b-edited', schuelerId: 'student-b', datum: '2026-09-15', thema: 'edited' }],
    kelGespraeche: [{ id: 'kel-b-edited', schuelerId: 'student-b', datum: '2026-09-15' }],
    portfolioEntries: { 'student-b': [{ id: 'portfolio-b-edited', datum: '2026-09-15', titel: 'edited' }] },
    kiPortfolioSummaries: { 'student-b': 'summary-b-edited' },
    oberauData: { 'student-b': { remarks: 'remarks-b-edited', evaluationData: { criterion: 5 } } },
  } as any);

  const a = switchClassState(b, 'a');
  assert.equal(a.elterngespraeche?.[0]?.id, 'meeting-a');
  assert.equal(a.kelGespraeche?.[0]?.id, 'kel-a');
  assert.equal(a.portfolioEntries?.['student-a']?.[0]?.id, 'portfolio-a');
  assert.equal(a.kiPortfolioSummaries?.['student-a'], 'summary-a');
  assert.equal(a.oberauData?.['student-a']?.remarks, 'remarks-a');

  const reloaded = normalizeAppState(JSON.parse(JSON.stringify(syncActiveClass(a))));
  assert.equal(reloaded.classes[1].elterngespraeche?.[0]?.id, 'meeting-b-edited');
  assert.equal(reloaded.classes[1].kelGespraeche?.[0]?.id, 'kel-b-edited');
  assert.equal(reloaded.classes[1].portfolioEntries?.['student-b']?.[0]?.id, 'portfolio-b-edited');
  assert.equal(reloaded.classes[1].kiPortfolioSummaries?.['student-b'], 'summary-b-edited');
  assert.equal(reloaded.classes[1].oberauData?.['student-b']?.remarks, 'remarks-b-edited');
});

test('legacy root-only profile artifacts are assigned only to the active class', () => {
  const loaded = normalizeAppState({
    activeClassId: 'a',
    elterngespraeche: [{ id: 'root-meeting', schuelerId: 'student-a', datum: '2026-09-14', thema: 'legacy' }],
    kelGespraeche: [{ id: 'root-kel', schuelerId: 'student-a', datum: '2026-09-14' }],
    portfolioEntries: { 'student-a': [{ id: 'root-portfolio', datum: '2026-09-14', titel: 'legacy' }] },
    kiPortfolioSummaries: { 'student-a': 'root-summary' },
    oberauData: { 'student-a': { remarks: 'root-remarks' } },
    classes: [
      { id: 'a', schueler: [{ id: 'student-a' }] },
      { id: 'b', schueler: [{ id: 'student-b' }] },
    ],
  } as any);

  assert.equal(loaded.classes[0].elterngespraeche?.[0]?.id, 'root-meeting');
  assert.equal(loaded.classes[0].portfolioEntries?.['student-a']?.[0]?.id, 'root-portfolio');
  assert.equal(loaded.classes[0].kiPortfolioSummaries?.['student-a'], 'root-summary');
  assert.equal(loaded.classes[0].oberauData?.['student-a']?.remarks, 'root-remarks');
  assert.deepEqual(loaded.classes[1].elterngespraeche, []);
  assert.deepEqual(loaded.classes[1].portfolioEntries, {});
  assert.deepEqual(loaded.classes[1].kiPortfolioSummaries, {});
  assert.deepEqual(loaded.classes[1].oberauData, {});
});

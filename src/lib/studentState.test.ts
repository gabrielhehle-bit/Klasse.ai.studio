import test from 'node:test';
import assert from 'node:assert/strict';
import { removeStudentFromAppState } from './studentState';

test('deleting a student removes student-linked class data without touching classmates', () => {
  const state: any = {
    schueler: [{ id: 'a' }, { id: 'b' }],
    noten: { a: { marker: 'a' }, b: { marker: 'b' } },
    mitarbeit: { a: { marker: 'a' }, b: { marker: 'b' } },
    verhalten: { a: 1, b: 2 },
    karten: { a: { gelb: 1 }, b: { gelb: 0 } },
    anwesenheit: { a: { day: {} }, b: { day: {} } },
    anwesenheitDetail: { a: { day: {} }, b: { day: {} } },
    schuelerStimmung: { a: { day: 1 }, b: { day: 2 } },
    hueBuch: { a: { x: 1 }, b: { x: 2 } },
    awGruende: { a: 'a', b: 'b' },
    verbal: { a: { x: 1 }, b: { x: 2 } },
    saAssessments: { a: { x: 1 }, b: { x: 2 } },
    behavior_status: { a: '4', b: '1' },
    behavior_notes: { a: 'note-a', b: 'note-b' },
    sue_kontrolle: { a: { x: '1' }, b: { x: '2' } },
    sitzplan_schueler: { a: { x: 1, y: 1 }, b: { x: 2, y: 2 } },
    studentLernzielBewertungen: { a: { g: 1 }, b: { g: 2 } },
    studentLernzielSemesterBewertungen: { a: { 1: { g: 1 } }, b: { 1: { g: 2 } } },
    schuelerNotizen: { a: 'a', b: 'b' },
    jahresberichte: { a: { inhalt: 'a' }, b: { inhalt: 'b' } },
    schuelerWochenplaene: { a: { id: 'a' }, b: { id: 'b' } },
    notizen: [{ id: 'na', schuelerId: 'a' }, { id: 'nb', schuelerId: 'b' }],
    notes: [{ id: 'aa', schuelerId: 'a' }, { id: 'bb', schuelerId: 'b' }, { id: 'general' }],
    journal: [{ id: 'ja', schuelerId: 'a' }, { id: 'jb', schuelerId: 'b' }],
    statusLog: [{ id: 'sa', schuelerId: 'a' }, { id: 'sb', schuelerId: 'b' }],
    stimmNotizen: [{ id: 'va', schuelerId: 'a' }, { id: 'vb', schuelerId: 'b' }],
    ikmRecords: [{ id: 'ia', schuelerId: 'a' }, { id: 'ib', schuelerId: 'b' }],
    antolinRecords: [{ id: 'xa', schuelerId: 'a' }, { id: 'xb', schuelerId: 'b' }],
    schuelerGoals: [{ id: 'ga', schuelerId: 'a' }, { id: 'gb', schuelerId: 'b' }],
    observations: [{ id: 'oa', schuelerId: 'a' }, { id: 'ob', schuelerId: 'b' }],
    metaKognitionsProtokolle: [{ id: 'ma', schuelerId: 'a' }, { id: 'mb', schuelerId: 'b' }],
    diagnostikErhebungen: [{ id: 'da', schuelerId: 'a' }, { id: 'db', schuelerId: 'b' }],
    diagnosticResults: [{ id: 'dra', studentId: 'a' }, { id: 'drb', studentId: 'b' }],
    diagnostikErgebnisse: [{ id: 'legacy-a', schuelerId: 'a' }, { id: 'legacy-b', schuelerId: 'b' }],
    mitarbeitLogs: [{ id: 'la', sid: 'a' }, { id: 'lb', sid: 'b' }],
    verpassteInhalte: [{ id: 'miss-a', schuelerId: 'a' }, { id: 'miss-b', schuelerId: 'b' }],
    elterngespraeche: [{ id: 'pa', schuelerId: 'a' }, { id: 'pb', schuelerId: 'b' }],
    kelGespraeche: [{ id: 'ka', schuelerId: 'a' }, { id: 'kb', schuelerId: 'b' }],
    differenzierungsGruppen: [{ id: 'g', schuelerIds: ['a', 'b'] }],
    dienste: [{ id: 'd', schuelerIds: ['a', 'b'], substitutions: { a: 'b', b: 'a' } }],
    sitzplanRegeln: [
      { id: 'pair', typ: 'nebeneinander', schuelerIds: ['a', 'b'] },
      { id: 'zone', typ: 'feste_zone', schuelerIds: ['a'] },
      { id: 'keep', typ: 'feste_zone', schuelerIds: ['b'] },
    ],
    stationenbetriebe: [{ id: 's', erledigt: { a: { one: true }, b: { one: false } } }],
    checklisten: [{ id: 'c', eintraege: { a: { x: true }, b: { x: false } } }],
    customLists: [{ id: 'l', werte: { a: { x: 1 }, b: { x: 2 } } }],
    interaktionsLog: {
      eintraege: [{ id: 'inta', schuelerId: 'a' }, { id: 'intb', schuelerId: 'b' }],
      wochenEmpfehlung: { kw: 1, jahr: 2026, schuelerIds: ['a', 'b'], generiert: 'x' }
    },
    klassenkasse: {
      kontostand: 10,
      sammlungen: [{ id: 'money', status: { a: 'bezahlt', b: 'offen' }, betraege: { a: 5, b: 5 } }],
      transaktionen: [{ id: 'ta', schuelerId: 'a', betrag: 5 }, { id: 'tb', schuelerId: 'b', betrag: 5 }]
    },
    lehrerProfil: { anekdoten: [{ id: 'a1', schuelerId: 'a' }, { id: 'b1', schuelerId: 'b' }, { id: 'general' }] },
    selectedDiagnosticStudentId: 'a',
    selectedStudentForPortfolio: 'a',
    activePrintStudentId: 'a',
    unterrichtsmodus_geburtstagskinder: ['a', 'b'],
    gabicState: { selectedStudentId: 'a', childDraftAnswer: 'x', currentQuestStep: 1, companionChoice: null, questObservations: {}, selectedGrade: '1' }
  };

  const before = structuredClone(state);
  const next: any = removeStudentFromAppState(state, 'a');

  assert.deepEqual(next.schueler.map((s: any) => s.id), ['b']);
  for (const field of ['noten','mitarbeit','verhalten','karten','anwesenheit','anwesenheitDetail','schuelerStimmung','hueBuch','awGruende','verbal','saAssessments','behavior_status','behavior_notes','sue_kontrolle','sitzplan_schueler','studentLernzielBewertungen','studentLernzielSemesterBewertungen','schuelerNotizen','jahresberichte','schuelerWochenplaene']) {
    assert.equal(next[field]?.a, undefined, field);
    assert.notEqual(next[field]?.b, undefined, field);
  }
  for (const field of ['notizen','notes','journal','statusLog','stimmNotizen','ikmRecords','antolinRecords','schuelerGoals','observations','metaKognitionsProtokolle','diagnostikErhebungen','diagnosticResults','diagnostikErgebnisse','mitarbeitLogs','verpassteInhalte','elterngespraeche','kelGespraeche']) {
    assert.equal((next[field] || []).some((entry: any) => entry.schuelerId === 'a' || entry.studentId === 'a' || entry.sid === 'a'), false, field);
  }
  assert.deepEqual(next.notes.map((entry: any) => entry.id), ['bb', 'general']);
  assert.deepEqual(next.differenzierungsGruppen[0].schuelerIds, ['b']);
  assert.deepEqual(next.dienste[0].schuelerIds, ['b']);
  assert.deepEqual(next.dienste[0].substitutions, {});
  assert.deepEqual(next.sitzplanRegeln.map((rule: any) => rule.id), ['keep']);
  assert.deepEqual(Object.keys(next.stationenbetriebe[0].erledigt), ['b']);
  assert.deepEqual(Object.keys(next.checklisten[0].eintraege), ['b']);
  assert.deepEqual(Object.keys(next.customLists[0].werte), ['b']);
  assert.deepEqual(next.interaktionsLog.eintraege.map((entry: any) => entry.id), ['intb']);
  assert.deepEqual(next.interaktionsLog.wochenEmpfehlung.schuelerIds, ['b']);
  assert.deepEqual(Object.keys(next.klassenkasse.sammlungen[0].status), ['b']);
  assert.deepEqual(Object.keys(next.klassenkasse.sammlungen[0].betraege), ['b']);
  assert.equal(next.klassenkasse.transaktionen[0].schuelerId, undefined);
  assert.equal(next.klassenkasse.transaktionen[0].betrag, 5);
  assert.equal(next.klassenkasse.transaktionen[1].schuelerId, 'b');
  assert.deepEqual(next.lehrerProfil.anekdoten.map((entry: any) => entry.id), ['b1', 'general']);
  assert.equal(next.selectedDiagnosticStudentId, undefined);
  assert.equal(next.selectedStudentForPortfolio, undefined);
  assert.equal(next.activePrintStudentId, undefined);
  assert.deepEqual(next.unterrichtsmodus_geburtstagskinder, ['b']);
  assert.equal(next.gabicState.selectedStudentId, '');
  assert.equal(next.gabicState.childDraftAnswer, null);
  assert.deepEqual(state, before);
});

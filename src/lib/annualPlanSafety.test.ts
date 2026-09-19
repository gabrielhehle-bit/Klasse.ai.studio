import test from 'node:test';
import assert from 'node:assert/strict';
import { occupiedYearPlanCell, plannedYearWeeks, conflictingYearWeeks } from './annualPlanSafety';
import { normalizeAppState, syncActiveClass, switchClassState } from './appState';
import { shiftYearPlanSubjectForward, type YearPlanCell } from './yearlyPlanData';

test('Jahresplan: auch alte Unterthemen, Bucheinträge und Metadaten zählen als vorhandene Planung', () => {
  assert.equal(occupiedYearPlanCell({thema:'',items:[{thema:'Lesen',buch:'Buch'}]}),true);
  assert.equal(occupiedYearPlanCell({thema:'',buch:'Arbeitsheft 1'}),true);
  assert.equal(occupiedYearPlanCell({type:'event'}),true);
  assert.equal(occupiedYearPlanCell({completed:true}),true);
  assert.equal(occupiedYearPlanCell({thema:'',items:[],type:'standard',completed:false}),false);
});
test('Mehrwochenthemen überspringen Ferien und blockieren belegte Folgewochen, ohne irgendetwas zu ändern', () => {
  const weeks=[{kw:38,monday:new Date(2026,8,14)},{kw:39,monday:new Date(2026,8,21)},{kw:40,monday:new Date(2026,8,28)},{kw:41,monday:new Date(2026,9,5)}];
  const plan:Record<number,Record<string,YearPlanCell>>={38:{deutsch:{thema:'Start',items:[]}},40:{deutsch:{items:[{thema:'Bestand'}]}}};
  const before=JSON.stringify(plan);
  const requested=plannedYearWeeks(weeks,38,3,w=>w.kw!==39);
  assert.deepEqual(requested,[38,40,41]);
  assert.deepEqual(plannedYearWeeks(weeks,38,2,w=>w.kw!==38&&w.kw!==39),[38,40], 'clicked start week is kept even if marked school-start');
  assert.deepEqual(conflictingYearWeeks(plan,requested,'deutsch',38),[40]);
  assert.equal(JSON.stringify(plan),before);
});
test('Vorhandene Klassen-Jahres- und Wochenplanung überleben Wechsel und JSON-Roundtrip', () => {
  const base=normalizeAppState({
    activeClassId:'klasse-A', schuljahr:'2026/27',
    classes:[
      {id:'klasse-A',name:'A',schueler:[],jahresplanung:{38:{deutsch:{thema:'Leseprojekt',items:[{thema:'Zweite Einheit'}]}}},wochenplanung:{38:{Montag:{0:{fach:'Deutsch',thema:'Lesen',housework:'S. 2'}}}}},
      {id:'klasse-B',name:'B',schueler:[],jahresplanung:{38:{mathematik:{thema:'Zahlenraum'}}},wochenplanung:{38:{Dienstag:{0:{fach:'Mathematik',thema:'Addieren'}}}}}
    ]
  });
  const a=switchClassState(base,'klasse-A');
  const before=JSON.stringify({year:a.jahresplanung,week:a.wochenplanung});
  const b=switchClassState(a,'klasse-B');
  assert.equal((b.jahresplanung as any)[38].mathematik.thema,'Zahlenraum');
  const restored=normalizeAppState(JSON.parse(JSON.stringify(syncActiveClass(switchClassState(b,'klasse-A')))));
  assert.equal(JSON.stringify({year:restored.jahresplanung,week:restored.wochenplanung}),before);
});

test('Verschieben bei voll belegtem Schuljahresende bewahrt alle vorhandenen Themen', () => {
 const original={38:{deutsch:{thema:'A'}},39:{deutsch:{thema:'B'}},40:{deutsch:{thema:'C'}}};
 const shifted=shiftYearPlanSubjectForward(original,'deutsch',38,[38,39,40]);
 assert.deepEqual(shifted,original);
 assert.equal(JSON.stringify(original),JSON.stringify(shifted));
});

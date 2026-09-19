import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAppState, syncActiveClass, switchClassState } from './appState';
import { createSeatingLayout } from './seatingPlanLayouts';

test('Gespeicherte Sitzordnungen sind pro Klasse isoliert und Klassenwechsel erhält die jeweilige Standardwahl', () => {
  const aLayout = createSeatingLayout('layout-a','Standard A', {a: {x:100,y:100}},[]);
  const bLayout = createSeatingLayout('layout-b','Standard B', {b: {x:300,y:300}},[]);
  const restored = normalizeAppState({
    activeClassId: 'a', schuljahr: '2026/27', schueler: [{id:'a'}],
    sitzplan_schueler: {a:{x:100,y:100}}, sitzplanLayouts: [aLayout],
    sitzplanDefaultLayoutId: 'layout-a',
    classes: [
      {id:'a', name:'A', stufe:1, schuljahr:'2026/27', schueler:[{id:'a'}],
       sitzplan_schueler:{a:{x:100,y:100}}, sitzplan_objekte:[],
       sitzplanLayouts:[aLayout], sitzplanDefaultLayoutId:'layout-a'},
      {id:'b', name:'B', stufe:2, schuljahr:'2026/27', schueler:[{id:'b'}],
       sitzplan_schueler:{b:{x:300,y:300}}, sitzplan_objekte:[],
       sitzplanLayouts:[bLayout], sitzplanDefaultLayoutId:'layout-b'}
    ]
  });
  assert.deepEqual(restored.sitzplanLayouts?.map(x => x.id), ['layout-a']);
  const b = switchClassState(restored, 'b');
  assert.deepEqual(b.sitzplanLayouts?.map(x => x.id), ['layout-b']);
  assert.equal(b.sitzplanDefaultLayoutId, 'layout-b');
  assert.equal(b.sitzplan_schueler.b.x, 300);
  const a = switchClassState(b, 'a');
  assert.deepEqual(a.sitzplanLayouts?.map(x => x.id), ['layout-a']);
  assert.equal(a.sitzplanDefaultLayoutId, 'layout-a');
  assert.equal(a.sitzplan_schueler.a.x, 100);
});

test('Bestehende JSON-Backups ohne gespeicherte Sitzordnungen bleiben lesbar', () => {
  const state = normalizeAppState({schuljahr:'2026/27', klassenbezeichnung:'Alt', schueler:[], sitzplan_schueler:{}, sitzplan_objekte:[]});
  assert.deepEqual(state.sitzplanLayouts, []);
  assert.ok(Array.isArray(state.classes));
});

test('Neue Sitzordnungen überleben JSON-Rücksicherung unverändert und separat von der Arbeitsanordnung', () => {
  const saved = createSeatingLayout('fester-plan','Gruppen', {abc: {x:20,y:40}},[{id:'desk',x:10,y:20,w:200,h:80}]);
  let state = normalizeAppState({
    activeClassId:'klasse-1',
    classes:[{id:'klasse-1',name:'Klasse 1',schueler:[{id:'abc'}],sitzplan_schueler:{abc:{x:99,y:88}},sitzplan_objekte:[],
      sitzplanLayouts:[saved],sitzplanDefaultLayoutId:'fester-plan'}],
  });
  state = syncActiveClass(state);
  const roundTrip = normalizeAppState(JSON.parse(JSON.stringify(state)));
  assert.equal(roundTrip.sitzplanLayouts?.[0].positions.abc.x, 20);
  assert.equal(roundTrip.sitzplanDefaultLayoutId,'fester-plan');
  assert.equal(roundTrip.sitzplan_schueler.abc.x,99);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findFreeDeskSeatPosition, findNextFreeSeatPosition } from './seatingPlanPlacement';

const component = readFileSync('src/components/SeatingPlan.tsx','utf8');

test('Sitzplan 2.0: Status and toolbar get separate full-width rows', () => {
  assert.match(component, /data-seating-toolbar/);
  assert.match(component, /flex w-full min-w-0 flex-wrap items-center gap-2/);
  assert.match(component, /flex w-full flex-wrap items-center justify-start gap-2/);
  assert.match(component, /whitespace-nowrap rounded-lg bg-emerald-50/);
  assert.match(component, /Kinder platziert/);
  assert.doesNotMatch(component, /lg:flex-row justify-between items-stretch lg:items-center gap-3 bg-white\/95/);
});

test('Sitzplan 2.0: side dock is optional and canvas can use full width', () => {
  assert.match(component, /const \[showSeatDock, setShowSeatDock\] = useState\(false\)/);
  assert.match(component, /data-seating-dock-toggle/);
  assert.match(component, /aria-expanded=\{showSeatDock && !selectedObjId\}/);
  assert.match(component, /editMode && !presentationMode && showSeatDock/);
  assert.match(component, /data-seating-workspace/);
  assert.match(component, /min-w-0 flex-1 relative overflow-hidden/);
  assert.match(component, /setRefitSavedLayoutSignal\(value => value \+ 1\)/);
});

test('Sitzplan 2.0: empty saved-layout area stays compact; save always exists', () => {
  assert.match(component, /savedLayouts\.length > 0 && <select/);
  assert.match(component, /Noch keine gespeicherten Varianten/);
  assert.match(component, /onClick=\{saveCurrentArrangement\}/);
});

test('Sitzplan 2.0: free-standing student may be moved only to genuinely vacant table', () => {
  const positions = { a: {x:100,y:204}, b:{x:224,y:204} };
  const desk = [{type:'rectangle',x:100,y:200,w:240,h:80}];
  assert.equal(findFreeDeskSeatPosition(positions,desk),null);
  assert.notEqual(findNextFreeSeatPosition(positions,desk),null);
  assert.deepEqual(findFreeDeskSeatPosition({a:positions.a},desk),{x:224,y:204});
  assert.match(component, /moveIndividualSeatToDesk\(student\.id\)/);
  assert.match(component, /if \(!deskSeat\) return/);
  assert.match(component, /disabled=\{!availableDesk\}/);
  assert.match(component, /updatePosition\(id, deskSeat\.x, deskSeat\.y\)/);
  assert.match(component, /freeStandingStudents\.map\(student =>/);
});

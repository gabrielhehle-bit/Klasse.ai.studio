import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findFreeDeskSeatPosition } from './seatingPlanPlacement';

const plan = readFileSync('src/components/SeatingPlan.tsx','utf8');

test('Sitzplan: Tischplätze werden gezielt und ohne Änderungen an fremden Positionen gefunden', () => {
  const leftDesk = { id:'left', type:'rectangle', x:100, y:200, w:240, h:80, rotation:0 };
  const rightDesk = { id:'right', type:'rectangle', x:600, y:200, w:240, h:80, rotation:0 };
  const original = { a: {x:104, y:204}, b:{x:224,y:204} };
  const before = structuredClone(original);
  assert.equal(findFreeDeskSeatPosition(original,[leftDesk]),null);
  assert.deepEqual(findFreeDeskSeatPosition(original,[rightDesk]),{x:604,y:204});
  assert.deepEqual(original,before);
  assert.equal(findFreeDeskSeatPosition(original,[{...rightDesk,rotation:90}]),null);
});

test('Sitzplan: Tischliste zeigt tatsächliche Belegung, Zielzuweisung ist eine explizite Aktion', () => {
  assert.match(plan, /data-seating-table-groups/);
  assert.match(plan, /deskObjects\.map\(\(desk, index\) =>/);
  assert.match(plan, /getStudentsOnTable\(desk, sitzplan_schueler\)/);
  assert.match(plan, /findDeskSeatForStudent\(selectedSeatStudentId, desk\)/);
  assert.match(plan, /disabled=\{!vacancy\}/);
  assert.match(plan, /placeStudentAtSelectedDesk\(selectedSeatStudentId, desk\.id\)/);
  assert.match(plan, /selectedAlreadyHere \? 'Sitzt hier' : 'Hierhin'/);
});

test('Sitzplan: Tischklick bietet direkten Belegungsüberblick und optionales Umsetzen', () => {
  assert.match(plan, /data-seating-desk-inspector/);
  assert.match(plan, /getStudentsOnTable\(obj, sitzplan_schueler\)\.length/);
  assert.match(plan, /disabled=\{!findDeskSeatForStudent\(selectedSeatStudent\.id, obj\)\}/);
  assert.match(plan, /placeStudentAtSelectedDesk\(selectedSeatStudent\.id, obj\.id\)/);
});

test('Sitzplan: Schüler wird nur bei vorhandenem freien Ziel und nur auf ausdrücklichen Klick umgesetzt', () => {
  assert.match(plan, /if \(!editMode \|\| !sitzplan_schueler\[studentId\]\) return/);
  assert.match(plan, /if \(!desk \|\| getStudentsOnTable\(desk, sitzplan_schueler\)\.includes\(studentId\)\) return/);
  assert.match(plan, /if \(!vacantSeat\) return/);
  assert.match(plan, /updatePosition\(studentId, vacantSeat\.x, vacantSeat\.y\)/);
  assert.match(plan, /const handleSeatSelection = \(studentId: string\) =>/);
  assert.match(plan, /handleSwap\(selectedSeatStudentId, studentId\)/);
  assert.match(plan, /pushState\(\)/);
});

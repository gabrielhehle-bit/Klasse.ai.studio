import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeatingLayout, resolveSeatingLayout, sameSeatingArrangement, omitStudentFromSeatingLayouts } from './seatingPlanLayouts';

test('Sitzordnung: Speichern erstellt unabhängige Kopien von Plätzen, Möbeln und Regeln', () => {
  const seats = { student1: { x: 20, y: 25 } };
  const furniture = [{ id: 'desk', x: 10, y: 10, w: 240, h: 80 }];
  const layout = createSeatingLayout('layout1', 'Gruppenarbeit', seats, furniture, [], '2026-09-19T00:00:00Z');
  seats.student1.x = 900;
  furniture[0].x = 999;
  assert.equal(layout.positions.student1.x, 20);
  assert.equal(layout.objects[0].x, 10);
  assert.equal(sameSeatingArrangement(layout, seats, furniture), false);
});

test('Sitzordnung: Laden entfernt alte Kinder aus einer alten Variante, ohne Originaldaten zu verändern', () => {
  const layout = createSeatingLayout('old', 'Alt',
    { student1: {x: 10, y: 20}, departed: {x: 30, y: 40} }, [{id:'desk',x:5,y:5}]);
  const restored = resolveSeatingLayout(layout, ['student1', 'newcomer']);
  assert.deepEqual(Object.keys(restored.positions), ['student1']);
  assert.equal(restored.positions.student1.x, 10);
  restored.positions.student1.x = 300;
  assert.equal(layout.positions.student1.x, 10);
  assert.equal(layout.objects.length, 1);
});

test('Sitzordnung: Regeln sind optional für ältere gespeicherte Anordnungen', () => {
  const layout = createSeatingLayout('x','Normal',{},[]);
  delete layout.rules;
  assert.equal(resolveSeatingLayout(layout, []).rules, undefined);
});

test('Schüler entfernen löscht gespeicherte Sitzplatz- und Partnerbezüge aus allen Varianten', () => {
  const layout = createSeatingLayout('l','A',
    {stay:{x:1,y:2},leave:{x:2,y:3}}, [],
    [{id:'r', typ:'nebeneinander', schuelerIds:['stay','leave']} as any]);
  const [clean] = omitStudentFromSeatingLayouts([layout], 'leave');
  assert.deepEqual(Object.keys(clean.positions), ['stay']);
  assert.deepEqual(clean.rules, []);
  assert.deepEqual(Object.keys(layout.positions), ['stay','leave']);
});

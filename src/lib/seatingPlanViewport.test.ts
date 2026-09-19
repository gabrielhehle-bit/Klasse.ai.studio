import test from 'node:test';
import assert from 'node:assert/strict';
import { fitSeatingPlanViewport } from './seatingPlanViewport';

test('Sitzplan-Einpassen zentriert Plätze und Raumobjekte, ohne die gespeicherten Koordinaten zu verändern', () => {
  const seats = [{x: 100, y: 300}, {x: 650, y: 500}];
  const objects = [{x: 350, y: 10, w: 200, h: 40}];
  const before = JSON.stringify({seats, objects});
  const view = fitSeatingPlanViewport(1300, 780, seats, objects);
  assert.ok(view.zoom > 0 && view.zoom <= 1.5);
  for (const p of [...seats, ...objects]) {
    const transformedX = p.x * view.zoom + view.offsetX;
    const transformedY = p.y * view.zoom + view.offsetY;
    assert.ok(transformedX >= 25);
    assert.ok(transformedY >= 25);
  }
  assert.equal(JSON.stringify({seats, objects}), before);
});

test('Sitzplan-Einpassen berücksichtigt einzelne und weit auseinanderliegende Tische auch mobil', () => {
  const result = fitSeatingPlanViewport(320, 500, [{x: 0, y: 0}, {x: 1100, y: 700}], [], 24);
  assert.ok(result.zoom < 0.5);
  const last = 1100 * result.zoom + result.offsetX + 112 * result.zoom;
  assert.ok(last <= 320);
});

test('Leerer oder nicht gemessener Raum hat eine sichere Standardansicht', () => {
  assert.deepEqual(fitSeatingPlanViewport(1200, 800, [], []), {zoom: 1, offsetX: 0, offsetY: 0});
  assert.deepEqual(fitSeatingPlanViewport(0, 0, [{x: 20, y: 20}], []), {zoom: 1, offsetX: 0, offsetY: 0});
});

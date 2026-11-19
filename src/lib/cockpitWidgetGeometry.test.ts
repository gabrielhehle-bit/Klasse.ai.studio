import test from 'node:test';
import assert from 'node:assert/strict';
import type { CockpitWidgetConfig } from '../types';
import {
  applyCockpitGeometryChanges,
  getCockpitGeometryChanges,
  getCockpitWidgetUsableHeight,
  normalizeCockpitWidgetGeometry,
} from './cockpitWidgetGeometry';

const widget = (type: CockpitWidgetConfig['type'], x: number, y: number): CockpitWidgetConfig =>
  ({ id: type, type, x, y, w: 35, h: 30, visible: true });

test('bewahrt Positionen links oben, Überlappungen und gespeicherte Fenstergrößen', () => {
  const rects = [
    { x: 5, y: 6, w: 32, h: 25 },
    { x: 15, y: 8, w: 36, h: 40 },
    { x: 18, y: 13, w: 50, h: 70 },
  ];
  for (const rect of rects) {
    assert.deepEqual(normalizeCockpitWidgetGeometry(Object.freeze(rect)), rect);
  }
});

test('korrigiert nur ungültige Geometrie und behandelt das Maskottchen als Anker', () => {
  assert.deepEqual(normalizeCockpitWidgetGeometry({ x: -3, y: 99, w: 105, h: 28 }),
    { x: 0, y: 72, w: 100, h: 28 });
  assert.deepEqual(normalizeCockpitWidgetGeometry({ x: NaN, y: Infinity, w: 0, h: -1 }),
    { x: 50, y: 50, w: 25, h: 20 });
  assert.deepEqual(normalizeCockpitWidgetGeometry({ x: 96, y: 94, w: 44, h: 66 }, true),
    { x: 96, y: 94, w: 44, h: 66 });
  assert.equal(getCockpitWidgetUsableHeight('timer', 500), 500);
  assert.ok(getCockpitWidgetUsableHeight('riddle', 500) < 500);
});

test('macht eine gemeinsame Anordnung rückgängig und übernimmt neuere Einstellungen', () => {
  const before = [widget('timer', 5, 6), widget('waldruhe', 15, 8), widget('instruction', 44, 10)];
  const after = [{ ...before[0], x: 28, w: 39 }, { ...before[1], y: 22 }, before[2]];
  const changes = getCockpitGeometryChanges(before, after);
  assert.equal(changes.length, 2);
  const arranged = applyCockpitGeometryChanges(before, changes, 'apply');
  assert.deepEqual(arranged, after);

  const edited = [{ ...arranged[0], visible: false, settings: { timerMinutes: 12 } }, ...arranged.slice(1)];
  const undone = applyCockpitGeometryChanges(edited, changes, 'undo');
  assert.deepEqual(undone, [{ ...before[0], visible: false, settings: { timerMinutes: 12 } }, ...before.slice(1)]);
  assert.equal(undone[2], before[2]);
  assert.deepEqual(getCockpitGeometryChanges(before, undone), []);

  const movedElsewhere = [arranged[0], { ...arranged[1], x: 40 }, arranged[2]];
  assert.equal(applyCockpitGeometryChanges(movedElsewhere, changes, 'undo'), movedElsewhere);
});

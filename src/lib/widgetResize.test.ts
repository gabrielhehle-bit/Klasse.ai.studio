import test from 'node:test';
import assert from 'node:assert/strict';
import { resizeWidgetRect, type WidgetResizeDirection } from './widgetResize';
const initial = { x: 100, y: 80, w: 300, h: 240 };
const stage = { width: 900, height: 700 };
const minimum = { minW: 160, minH: 120 };
for (const direction of ['n','ne','e','se','s','sw','w','nw'] as WidgetResizeDirection[]) {
  test(`Resize ${direction}: grows and shrinks with opposite edge anchored`, () => {
    const dx = direction.includes('w') ? -30 : direction.includes('e') ? 30 : 0;
    const dy = direction.includes('n') ? -20 : direction.includes('s') ? 20 : 0;
    const grown = resizeWidgetRect(initial, direction, dx, dy, stage, minimum);
    assert.equal(grown.w, initial.w + (dx ? 30 : 0));
    assert.equal(grown.h, initial.h + (dy ? 20 : 0));
    if (direction.includes('w')) assert.equal(grown.x + grown.w, initial.x + initial.w);
    else assert.equal(grown.x, initial.x);
    if (direction.includes('n')) assert.equal(grown.y + grown.h, initial.y + initial.h);
    else assert.equal(grown.y, initial.y);
    assert.deepEqual(resizeWidgetRect(grown, direction, -dx, -dy, stage, minimum), initial);
  });
}
test('all corners respect minimum dimensions and stage bounds', () => {
  for (const direction of ['nw','ne','sw','se'] as WidgetResizeDirection[]) {
    for (const amount of [-10000,10000]) {
      const result = resizeWidgetRect(initial, direction, amount, amount, stage, minimum);
      assert.ok(result.x >= 0 && result.y >= 0);
      assert.ok(result.x + result.w <= stage.width && result.y + result.h <= stage.height);
      assert.ok(result.w >= minimum.minW && result.h >= minimum.minH);
    }
  }
});
test('small screens cap minimum size to the available stage', () => {
  assert.deepEqual(resizeWidgetRect({x:0,y:0,w:80,h:60}, 'se', -500,-500, {width:80,height:60}, minimum), {x:0,y:0,w:80,h:60});
});

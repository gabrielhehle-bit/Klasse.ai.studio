import test from "node:test";
import assert from "node:assert/strict";
import {
  COCKPIT_AUTO_ARRANGE_DOCK_CLEARANCE_PX,
  getCockpitAutoArrangeLayout,
  type CockpitAutoArrangeItem,
  type CockpitAutoArrangeRect,
} from "./cockpitAutoArrange";

const standard = (id: string): CockpitAutoArrangeItem => ({
  id,
  minW: 280,
  minH: 220,
  prefW: 380,
  prefH: 340,
});

const large = (id: string): CockpitAutoArrangeItem => ({
  id,
  minW: 480,
  minH: 360,
  prefW: 960,
  prefH: 720,
});

function overlaps(a: CockpitAutoArrangeRect, b: CockpitAutoArrangeRect): boolean {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

function assertSafeLayout(rects: CockpitAutoArrangeRect[], width: number, height: number) {
  for (const rect of rects) {
    assert.ok(rect.x >= 0 && rect.y >= 0, "widget starts inside usable board");
    assert.ok(rect.x + rect.w <= width + 0.5, "widget stays inside usable width");
    assert.ok(rect.y + rect.h <= height + 0.5, "widget stays above dock clearance");
  }
  for (let first = 0; first < rects.length; first += 1) {
    for (let second = first + 1; second < rects.length; second += 1) {
      assert.equal(overlaps(rects[first], rects[second]), false, "widgets must not overlap");
    }
  }
}

test("smart auto-arrange handles two through six standard widgets without overlaps", () => {
  for (let count = 2; count <= 6; count += 1) {
    const result = getCockpitAutoArrangeLayout(
      Array.from({ length: count }, (_, index) => standard(String(index))),
      1200,
      650,
    );
    assert.equal(result.constrained, false, `${count} widgets should fit`);
    assert.equal(result.rects.length, count);
    assertSafeLayout(result.rects, 1200, 650);
  }
});

test("smart auto-arrange gives heterogeneous widgets enough hard minimum space", () => {
  const result = getCockpitAutoArrangeLayout(
    [large("weekly"), standard("timer"), standard("clock"), standard("groups"), standard("qr")],
    1200,
    650,
  );
  assert.equal(result.constrained, false);
  assert.equal(result.rects.length, 5);
  assertSafeLayout(result.rects, 1200, 650);

  const weekly = result.rects.find(rect => rect.id === "weekly");
  assert.ok(weekly);
  assert.ok(weekly.w >= 480);
  assert.ok(weekly.h >= 360);
});

test("smart auto-arrange adapts to a board narrowed by an overlaying student sidebar", () => {
  const result = getCockpitAutoArrangeLayout(
    [standard("a"), standard("b"), standard("c")],
    760,
    650,
  );
  assert.equal(result.constrained, false);
  assertSafeLayout(result.rects, 760, 650);
});

test("smart auto-arrange refuses a layout that cannot respect readable minimum sizes", () => {
  const result = getCockpitAutoArrangeLayout(
    Array.from({ length: 6 }, (_, index) => large(String(index))),
    760,
    500,
  );
  assert.equal(result.constrained, true);
  assert.equal(result.rects.length, 0);
});

test("auto-arrange reserves explicit space for the floating cockpit dock", () => {
  assert.equal(COCKPIT_AUTO_ARRANGE_DOCK_CLEARANCE_PX, 70);
});

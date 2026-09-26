import test from "node:test";
import assert from "node:assert/strict";
import {
  findCockpitWidgetOpeningPlacement,
  type CockpitPlacementRect,
} from "./cockpitWidgetPlacement";

const overlaps = (a: CockpitPlacementRect, b: CockpitPlacementRect) =>
  !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);

test("new widget opens in a truly free area when one exists", () => {
  const occupied = [
    { id: "a", x: 14, y: 14, w: 360, h: 260 },
    { id: "b", x: 390, y: 14, w: 360, h: 260 },
  ];
  const result = findCockpitWidgetOpeningPlacement({
    usableWidth: 1100,
    usableHeight: 650,
    desiredW: 340,
    desiredH: 260,
    minW: 280,
    minH: 220,
    occupied,
  });
  assert.equal(result.usedOverlapFallback, false);
  assert.equal(result.overlapArea, 0);
  for (const rect of occupied) assert.equal(overlaps(result, rect), false);
});

test("new widget never opens underneath the reserved right or bottom area", () => {
  const result = findCockpitWidgetOpeningPlacement({
    usableWidth: 760,
    usableHeight: 520,
    desiredW: 420,
    desiredH: 340,
    minW: 280,
    minH: 220,
    occupied: [],
  });
  assert.ok(result.x >= 0);
  assert.ok(result.y >= 0);
  assert.ok(result.x + result.w <= 760);
  assert.ok(result.y + result.h <= 520);
});

test("free placement respects dragged arbitrary widget edges", () => {
  const occupied = [
    { id: "a", x: 133, y: 91, w: 347, h: 251 },
    { id: "b", x: 503, y: 333, w: 319, h: 241 },
  ];
  const result = findCockpitWidgetOpeningPlacement({
    usableWidth: 1200,
    usableHeight: 700,
    desiredW: 320,
    desiredH: 240,
    minW: 280,
    minH: 220,
    occupied,
  });
  assert.equal(result.usedOverlapFallback, false);
  for (const rect of occupied) assert.equal(overlaps(result, rect), false);
});

test("only falls back to overlap when no free rectangle exists", () => {
  const occupied = [
    { id: "cover", x: 0, y: 0, w: 700, h: 500 },
  ];
  const result = findCockpitWidgetOpeningPlacement({
    usableWidth: 700,
    usableHeight: 500,
    desiredW: 320,
    desiredH: 240,
    minW: 280,
    minH: 220,
    occupied,
  });
  assert.equal(result.usedOverlapFallback, true);
  assert.ok(result.overlapArea > 0);
});

test("fallback chooses the least obstructed side instead of cascading blindly", () => {
  const occupied = [
    { id: "large-left", x: 0, y: 0, w: 520, h: 600 },
    { id: "small-right", x: 560, y: 0, w: 180, h: 250 },
  ];
  const result = findCockpitWidgetOpeningPlacement({
    usableWidth: 760,
    usableHeight: 600,
    desiredW: 300,
    desiredH: 260,
    minW: 280,
    minH: 220,
    occupied,
  });
  assert.equal(result.usedOverlapFallback, true);
  assert.ok(result.x >= 430, "least-overlap fallback should move toward the freer right side");
});

test("desired size is clamped to the usable board instead of spilling below the dock", () => {
  const result = findCockpitWidgetOpeningPlacement({
    usableWidth: 500,
    usableHeight: 360,
    desiredW: 900,
    desiredH: 700,
    minW: 280,
    minH: 220,
    occupied: [],
  });
  assert.ok(result.w <= 500);
  assert.ok(result.h <= 360);
  assert.ok(result.x + result.w <= 500);
  assert.ok(result.y + result.h <= 360);
});

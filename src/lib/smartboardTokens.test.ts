import assert from "node:assert/strict";
import test from "node:test";
import {
  getSmartboardControlStyle,
  isSmartboardTouchTarget,
  SMARTBOARD_GAP_MAX,
  SMARTBOARD_GAP_MIN,
  SMARTBOARD_PRIMARY_ACTION_CLASS,
  SMARTBOARD_TOUCH_TARGET_MIN,
} from "./smartboardTokens";

test("defines the shared Smartboard touch and spacing profile", () => {
  assert.equal(SMARTBOARD_TOUCH_TARGET_MIN, 44);
  assert.equal(SMARTBOARD_GAP_MIN, 8);
  assert.equal(SMARTBOARD_GAP_MAX, 12);
  assert.deepEqual(getSmartboardControlStyle(32), {
    minWidth: "44px",
    minHeight: "44px",
  });
  assert.equal(isSmartboardTouchTarget(44, 44), true);
  assert.equal(isSmartboardTouchTarget(43, 44), false);
});

test("primary actions use semantic KLASSIO tokens", () => {
  assert.match(SMARTBOARD_PRIMARY_ACTION_CLASS, /bg-accent/);
  assert.match(SMARTBOARD_PRIMARY_ACTION_CLASS, /bg-accent-hover/);
  assert.match(SMARTBOARD_PRIMARY_ACTION_CLASS, /focus-visible/);
  assert.doesNotMatch(SMARTBOARD_PRIMARY_ACTION_CLASS, /indigo|violet/);
});

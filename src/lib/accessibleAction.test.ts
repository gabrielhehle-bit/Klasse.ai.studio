import test from "node:test";
import assert from "node:assert/strict";
import {
  createAccessibleActionDispatcher,
  isAccessibleActivationKey,
  type AccessibleActivationSource,
} from "./accessibleAction";

test("accessible actions use one activation path for pointer, touch, keyboard and click", async (t) => {
  await t.test("recognises Enter and Space as activation keys", () => {
    assert.equal(isAccessibleActivationKey("Enter"), true);
    assert.equal(isAccessibleActivationKey(" "), true);
    assert.equal(isAccessibleActivationKey("Tab"), false);
  });

  const actions = [
    "Hinzufügen",
    "Start",
    "Pause",
    "Prüfen",
    "Reset",
    "Nächste Aufgabe",
    "Schließen",
  ] as const;

  for (const actionName of actions) {
    await t.test(`${actionName} runs once for a pointer followed by the browser click`, () => {
      let now = 100;
      let count = 0;
      const dispatcher = createAccessibleActionDispatcher(() => { count += 1; }, () => now);

      assert.equal(dispatcher.activate("pointer"), true);
      assert.equal(dispatcher.activate("click"), false);
      assert.equal(count, 1);

      now += 501;
      assert.equal(dispatcher.activate("click"), true);
      assert.equal(count, 2);
    });

    await t.test(`${actionName} runs once for touchend plus synthetic pointer/click events`, () => {
      let now = 200;
      let count = 0;
      const dispatcher = createAccessibleActionDispatcher(() => { count += 1; }, () => now);

      assert.equal(dispatcher.activate("touch"), true);
      now += 10;
      assert.equal(dispatcher.activate("pointer"), false);
      assert.equal(dispatcher.activate("click"), false);
      assert.equal(count, 1);
    });

    for (const key of ["Enter", " "] as const) {
      await t.test(`${actionName} activates with ${key === " " ? "Space" : key}`, () => {
        let count = 0;
        const dispatcher = createAccessibleActionDispatcher(() => { count += 1; }, () => 300);
        assert.equal(dispatcher.activate("keyboard"), true);
        assert.equal(dispatcher.activate("click"), false);
        assert.equal(count, 1);
      });
    }
  }

  await t.test("form submission can use the same dispatcher without requiring a clickable wrapper", () => {
    let count = 0;
    const sources: AccessibleActivationSource[] = ["form", "click"];
    const dispatcher = createAccessibleActionDispatcher(() => { count += 1; }, () => 400);

    assert.equal(dispatcher.activate(sources[0]), true);
    assert.equal(dispatcher.activate(sources[1]), false);
    assert.equal(count, 1);
  });
});

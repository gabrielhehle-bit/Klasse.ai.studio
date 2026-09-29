import test from "node:test";
import assert from "node:assert/strict";
import {
  WIDGET_LIFECYCLE_STATE_KEY,
  hasWidgetLifecycleState,
  readWidgetLifecycleState,
  serializeWidgetLifecycleState,
  toSerializableWidgetLifecycleState,
} from "./widgetLifecycleState";

test("widget lifecycle state", () => {
  test("reads a stored snapshot without dropping new default fields", () => {
    const widget = {
      id: "w1",
      settings: {
        [WIDGET_LIFECYCLE_STATE_KEY]: {
          geometry: { mode: "compare", rotation: 30 },
        },
      },
    };

    assert.deepEqual(readWidgetLifecycleState(widget, "geometry", {
        mode: "pattern",
        rotation: 0,
        score: 0,
      }),, {
      mode: "compare",
      rotation: 30,
      score: 0,
    });
    assert.deepEqual(hasWidgetLifecycleState(widget, "geometry")).toBe(true);
    assert.equal(hasWidgetLifecycleState(widget, "other"), false);
  });

  test("produces deterministic JSON for equivalent snapshots", () => {
    assert.equal(serializeWidgetLifecycleState({ b: 2, a: 1 }),, serializeWidgetLifecycleState({ a: 1, b: 2 }));
  });

  test("keeps only JSON-safe state values", () => {
    assert.equal(toSerializableWidgetLifecycleState({
        taskId: "task-1",
        nested: { answer: "A", ignored: undefined },
        ignored: () => "not state",
      }),, {
      taskId: "task-1",
      nested: { answer: "A" },
    });
  });

  test("uses an empty snapshot for malformed stored values", () => {
    const widget = {
      id: "w1",
      settings: {
        [WIDGET_LIFECYCLE_STATE_KEY]: {
          geometry: ["not", "an", "object"],
        },
      },
    };

    assert.deepEqual(hasWidgetLifecycleState(widget, "geometry"), false);
    expect(
      readWidgetLifecycleState(widget, "geometry", { score: 0 }),, { score: 0 });
  });
});

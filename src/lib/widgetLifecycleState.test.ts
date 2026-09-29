import {
  WIDGET_LIFECYCLE_STATE_KEY,
  hasWidgetLifecycleState,
  readWidgetLifecycleState,
  serializeWidgetLifecycleState,
  toSerializableWidgetLifecycleState,
} from "./widgetLifecycleState";

describe("widget lifecycle state", () => {
  it("reads a stored snapshot without dropping new default fields", () => {
    const widget = {
      id: "w1",
      settings: {
        [WIDGET_LIFECYCLE_STATE_KEY]: {
          geometry: { mode: "compare", rotation: 30 },
        },
      },
    };

    expect(
      readWidgetLifecycleState(widget, "geometry", {
        mode: "pattern",
        rotation: 0,
        score: 0,
      }),
    ).toEqual({
      mode: "compare",
      rotation: 30,
      score: 0,
    });
    expect(hasWidgetLifecycleState(widget, "geometry")).toBe(true);
    expect(hasWidgetLifecycleState(widget, "other")).toBe(false);
  });

  it("produces deterministic JSON for equivalent snapshots", () => {
    expect(
      serializeWidgetLifecycleState({ b: 2, a: 1 }),
    ).toBe(serializeWidgetLifecycleState({ a: 1, b: 2 }));
  });

  it("keeps only JSON-safe state values", () => {
    expect(
      toSerializableWidgetLifecycleState({
        taskId: "task-1",
        nested: { answer: "A", ignored: undefined },
        ignored: () => "not state",
      }),
    ).toEqual({
      taskId: "task-1",
      nested: { answer: "A" },
    });
  });

  it("uses an empty snapshot for malformed stored values", () => {
    const widget = {
      id: "w1",
      settings: {
        [WIDGET_LIFECYCLE_STATE_KEY]: {
          geometry: ["not", "an", "object"],
        },
      },
    };

    expect(hasWidgetLifecycleState(widget, "geometry")).toBe(false);
    expect(
      readWidgetLifecycleState(widget, "geometry", { score: 0 }),
    ).toEqual({ score: 0 });
  });
});

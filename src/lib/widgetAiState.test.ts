import test from "node:test";
import assert from "node:assert/strict";
import {
  WIDGET_AI_STATUS_MESSAGES,
  classifyWidgetAiError,
  getWidgetAiStatusMessage,
} from "./widgetAiState";

test("gemeinsamer KI-Zustand deckt Laden, Erfolg und Fallback ab", () => {
  assert.deepEqual(Object.keys(WIDGET_AI_STATUS_MESSAGES), [
    "idle",
    "loading",
    "success",
    "unavailable",
    "timeout",
    "error",
  ]);
  assert.match(getWidgetAiStatusMessage("loading"), /KI/);
  assert.match(getWidgetAiStatusMessage("error"), /Standardaufgabe/);
});

test("KI-Fehler werden für Timeout, Infrastruktur und sonstige Fehler klassifiziert", () => {
  assert.equal(classifyWidgetAiError(new Error("request timeout")), "timeout");
  assert.equal(classifyWidgetAiError({ status: 429 }), "unavailable");
  assert.equal(classifyWidgetAiError(new Error("Failed to fetch")), "unavailable");
  assert.equal(classifyWidgetAiError(new Error("invalid response")), "error");
});

test("Abort- und HTTP-Fehler behalten verständliche, kindgerechte Zustände", () => {
  assert.equal(classifyWidgetAiError({ name: "AbortError" }), "timeout");
  assert.equal(classifyWidgetAiError({ status: 503 }), "unavailable");
  assert.equal(
    getWidgetAiStatusMessage(classifyWidgetAiError({ status: 503 })),
    WIDGET_AI_STATUS_MESSAGES.unavailable,
  );
});

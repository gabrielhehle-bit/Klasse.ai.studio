import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyNetworkMediaError,
  getNetworkMediaStatusMessage,
  isNetworkMediaRetryable,
} from "./networkMediaState";

test("Medienzustand deckt Erfolg, Laden und Wiederholen ab", () => {
  assert.equal(classifyNetworkMediaError(null), "error");
  assert.equal(getNetworkMediaStatusMessage("loading", "Wetterdaten"), "Wetterdaten wird geladen…");
  assert.equal(getNetworkMediaStatusMessage("loaded", "Wetterdaten"), "Wetterdaten geladen.");
  assert.equal(isNetworkMediaRetryable("loaded"), false);
  assert.equal(isNetworkMediaRetryable("timeout"), true);
});

test("Netzwerkfehler werden von HTTP- und Timeout-Fehlern unterschieden", () => {
  assert.equal(classifyNetworkMediaError(new TypeError("Failed to fetch"), true), "offline");
  assert.equal(classifyNetworkMediaError(new Error("HTTP 503"), true), "error");
  assert.equal(classifyNetworkMediaError({ status: 504 }, true), "error");
  assert.equal(classifyNetworkMediaError({ name: "AbortError" }, true), "timeout");
  assert.equal(classifyNetworkMediaError(new Error("anything"), false), "offline");
  assert.match(getNetworkMediaStatusMessage("offline", "Wetterdaten"), /Verbindung/);
});

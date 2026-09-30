import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyMediaPlaybackError,
  getMediaPlaybackStatusMessage,
  isMediaPlaybackRetryable,
  MediaPlaybackStatus,
} from "./mediaPlaybackState";

test("exposes the complete shared playback state vocabulary", () => {
  const statuses: MediaPlaybackStatus[] = [
    "idle",
    "loading",
    "ready",
    "playing",
    "paused",
    "muted",
    "unavailable",
    "offline",
    "error",
  ];

  assert.equal(new Set(statuses).size, 9);
  assert.equal(getMediaPlaybackStatusMessage("unavailable", "Audio"), "Audio nicht verfügbar.");
  assert.equal(getMediaPlaybackStatusMessage("paused"), "Ton pausiert.");
});

test("classifies unavailable browser audio separately from connection failures", () => {
  assert.equal(
    classifyMediaPlaybackError({ name: "NotAllowedError" }),
    "unavailable",
  );
  assert.equal(
    classifyMediaPlaybackError(new Error("AudioContext is not supported")),
    "unavailable",
  );
  assert.equal(
    classifyMediaPlaybackError(new TypeError("Failed to fetch")),
    "offline",
  );
  assert.equal(
    classifyMediaPlaybackError(new Error("decode failed"), false),
    "offline",
  );
  assert.equal(
    classifyMediaPlaybackError(new Error("oscillator failed")),
    "error",
  );
});

test("marks only recoverable failure states as retryable", () => {
  assert.equal(isMediaPlaybackRetryable("unavailable"), true);
  assert.equal(isMediaPlaybackRetryable("offline"), true);
  assert.equal(isMediaPlaybackRetryable("error"), true);
  assert.equal(isMediaPlaybackRetryable("ready"), false);
  assert.equal(isMediaPlaybackRetryable("playing"), false);
});

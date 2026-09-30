import assert from "node:assert/strict";
import test from "node:test";
import {
  getCockpitWidgetCanonicalCatalog,
  getCockpitWidgetCanonicalEntry,
  resolveCockpitWidgetCanonicalId,
  summarizeCockpitWidgetTypes,
} from "./cockpitWidgetCanonical";

test("resolves the planned legacy aliases without changing stored widget types", () => {
  assert.equal(resolveCockpitWidgetCanonicalId("wheel"), "randomname");
  assert.equal(resolveCockpitWidgetCanonicalId("stopwatch"), "timer");
  assert.equal(resolveCockpitWidgetCanonicalId("wordbuilder"), "wortsatzwerkstatt");
  assert.equal(resolveCockpitWidgetCanonicalId("multitrainer"), "kopfrechnen");
  assert.equal(resolveCockpitWidgetCanonicalId("fractiongrid"), "fractionvisualizer");
  assert.equal(resolveCockpitWidgetCanonicalId("piano"), "sounds");
  assert.equal(resolveCockpitWidgetCanonicalId("lernwoerter"), "vocabulary");
  assert.equal(resolveCockpitWidgetCanonicalId("unknown-widget"), null);
});

test("returns canonical metadata and marks aliases explicitly", () => {
  assert.deepEqual(getCockpitWidgetCanonicalEntry("wordbuilder"), {
    canonicalId: "wortsatzwerkstatt",
    displayName: "Wörter & Sätze",
    category: "language",
    description: "Wörter ordnen, bauen und zu Sätzen verbinden.",
    aliasOf: "wortsatzwerkstatt",
  });
  assert.equal(
    getCockpitWidgetCanonicalEntry("wortsatzwerkstatt")?.aliasOf,
    undefined,
  );
});

test("keeps canonical type counts separate from legacy entry counts", () => {
  const summary = summarizeCockpitWidgetTypes([
    "wheel",
    "randomname",
    "wordbuilder",
    "scrambler",
    "sounds",
  ]);
  assert.deepEqual(summary, {
    canonicalTypeCount: 3,
    entryCount: 5,
    aliasCount: 2,
  });
  assert.equal(getCockpitWidgetCanonicalCatalog().length, 20);
});

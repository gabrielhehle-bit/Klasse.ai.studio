import assert from "node:assert/strict";
import test from "node:test";
import {
  getCockpitWidgetCanonicalDisplayLabel,
  getCockpitWidgetCatalogEntry,
  getCockpitWidgetDisplayLabel,
  summarizeCockpitWidgetLibraryTypes,
} from "./cockpitWidgetCatalog";

test("resolves canonical headers without rewriting legacy layout types", () => {
  assert.equal(getCockpitWidgetDisplayLabel("wheel"), "🎡 Glücksrad");
  assert.equal(getCockpitWidgetCanonicalDisplayLabel("wheel"), "Zufallsauswahl");
  assert.equal(getCockpitWidgetCanonicalDisplayLabel("wordbuilder"), "Wörter & Sätze");
  assert.equal(getCockpitWidgetDisplayLabel("lernwoerter"), "🔤 Lernwörter-Studio");
  assert.equal(getCockpitWidgetCanonicalDisplayLabel("lernwoerter"), "Lernwörter");
  assert.equal(getCockpitWidgetCatalogEntry("scrambler")?.aliasOf, "wortsatzwerkstatt");
});

test("keeps canonical and entry counts distinct for library/search consumers", () => {
  assert.deepEqual(
    summarizeCockpitWidgetLibraryTypes([
      "wheel",
      "randomname",
      "scrambler",
      "wordbuilder",
      "sounds",
    ]),
    {
      canonicalTypeCount: 3,
      entryCount: 5,
      aliasCount: 3,
    },
  );
});

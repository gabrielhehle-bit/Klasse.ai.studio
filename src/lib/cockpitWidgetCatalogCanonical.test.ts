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

test('Library searches exact audit aliases, punctuation, umlauts and named fraction variants', async () => {
  const { COCKPIT_WIDGET_LIBRARY_ITEMS, matchesCockpitWidgetSearch } = await import('./cockpitWidgetCatalog');
  const results = (query: string) => COCKPIT_WIDGET_LIBRARY_ITEMS.filter(item => matchesCockpitWidgetSearch(item, query)).map(item => item.type);
  for (const query of ['QR-Code & Link', 'QR code und Link']) assert.ok(results(query).includes('qrcode'));
  for (const query of ['Lautstärke & Arbeitsampel', 'Lautstaerke und Arbeitsampel']) {
    assert.ok(results(query).includes('noisemeter'));
    assert.ok(results(query).includes('noisescales'));
  }
  assert.ok(results('Bild & Material').includes('image'));
  assert.ok(results('Wörter & Sätze').includes('wortsatzwerkstatt'));
  assert.ok(results('Bruch-Visualisierer').includes('fractionvisualizer'));
  assert.ok(results('Bruch-Visualisierer · Vergleich').includes('fractions'));
  assert.equal(results('nonexistentthing').length, 0);
});

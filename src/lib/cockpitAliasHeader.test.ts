import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/cockpit/CockpitWidget.tsx", "utf8");

test("widget headers resolve aliases through canonical catalog metadata", () => {
  assert.match(source, /getCockpitWidgetDisplayLabel\(widget\.type\)/);
  assert.match(source, /const canonicalEntry = getCockpitWidgetCatalogEntry\(widget\.type\)/);
  assert.match(source, /canonicalEntry\?\.aliasOf/);
  assert.match(source, /getCockpitWidgetCanonicalDisplayLabel\(widget\.type\)/);
  assert.match(source, /data-widget-title=\{displayLabel\}/);
});

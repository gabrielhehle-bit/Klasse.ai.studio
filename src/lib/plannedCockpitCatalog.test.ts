import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PLANNED_COCKPIT_WIDGETS,
  getPlannedCockpitWidgetForLegacyType,
} from '../components/cockpit/plannedCockpitCatalog';

const source = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const layoutStart = source.indexOf('const DEFAULT_COCKPIT_LAYOUT');
const layoutEnd = source.indexOf('const DEFAULT_WORKSPACE_PROFILES', layoutStart);
const defaultTypes = [...source.slice(layoutStart, layoutEnd).matchAll(/type:\s*"([^"]+)"/g)]
  .map(match => match[1]);

test('Cockpit-Zielkatalog: genau 20 unterschiedliche, bestehende Einstiegstypen', () => {
  assert.equal(PLANNED_COCKPIT_WIDGETS.length, 20);
  assert.equal(new Set(PLANNED_COCKPIT_WIDGETS.map(widget => widget.id)).size, 20);
  for (const widget of PLANNED_COCKPIT_WIDGETS) {
    assert.ok(defaultTypes.includes(widget.id), `Unbekannter Einstiegstyp: ${widget.id}`);
    assert.ok(widget.label.trim());
    assert.ok((widget.sources as readonly string[]).includes(widget.id));
  }
});

test('Cockpit-Zielkatalog: Quellen überschneiden sich nicht und bleiben bisher im Layout lesbar', () => {
  assert.ok(layoutStart >= 0 && layoutEnd > layoutStart);
  const allSources = PLANNED_COCKPIT_WIDGETS.flatMap(widget => [...widget.sources]);
  assert.equal(new Set(allSources).size, allSources.length);
  for (const alias of allSources) {
    assert.ok(defaultTypes.includes(alias), `Vor einer Zusammenführung prüfen: ${alias}`);
    assert.ok(getPlannedCockpitWidgetForLegacyType(alias));
  }
  assert.equal(defaultTypes.length, 111, '109 historische Widgets plus HÜ-Widget und Sterneauswertung vollständig inventarisieren');
  const knownTypesBlock = source.slice(
    source.indexOf('const knownTypes = ['),
    source.indexOf('];', source.indexOf('const knownTypes = [')),
  );
  for (const legacyType of defaultTypes) {
    // Auch nicht mehr angebotene Widgets dürfen beim Wiederherstellen nicht verlorengehen.
    assert.ok(knownTypesBlock.includes(`"${legacyType}"`), `Legacy-Widget wurde aus dem Layout-Sanitizer entfernt: ${legacyType}`);
  }
});

test('Cockpit-Zielkatalog: nicht übernommene Typen bleiben ausdrücklich Legacy', () => {
  assert.equal(getPlannedCockpitWidgetForLegacyType('studentlist'), null);
  assert.equal(getPlannedCockpitWidgetForLegacyType('drawing'), null);
  assert.equal(getPlannedCockpitWidgetForLegacyType('weather'), null);
  assert.equal(getPlannedCockpitWidgetForLegacyType('pet'), null);
  assert.equal(getPlannedCockpitWidgetForLegacyType('unknown-from-backup'), null);
});

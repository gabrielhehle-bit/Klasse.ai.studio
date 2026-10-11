import assert from 'node:assert/strict';
import test from 'node:test';
import { COCKPIT_WIDGET_LIBRARY_ITEMS } from './cockpitWidgetCatalog';
import { resolveCockpitWidgetCanonicalId } from './cockpitWidgetCanonical';

const registryTypes = COCKPIT_WIDGET_LIBRARY_ITEMS.map(item => item.type);
const finalRegistryTypes = [
  'zahlenraum',
  'anschauung',
  'numberline',
  'image',
  'sounds',
  'soundmachine',
  'weather',
  'scrambler',
] as const;

test('classroom widget registry has 112 unique visible entries', () => {
  assert.equal(registryTypes.length, 112);
  assert.equal(new Set(registryTypes).size, 112);
});

test('the final audit block is still present in the visible registry', () => {
  for (const type of finalRegistryTypes) {
    assert.ok(registryTypes.includes(type), `${type} fehlt im sichtbaren Widget-Katalog`);
  }
});

test('legacy final-block aliases resolve to the intended core widgets', () => {
  assert.equal(resolveCockpitWidgetCanonicalId('zahlenraum'), 'zahlenraum');
  assert.equal(resolveCockpitWidgetCanonicalId('anschauung'), 'zahlenraum');
  assert.equal(resolveCockpitWidgetCanonicalId('numberline'), 'zahlenraum');
  assert.equal(resolveCockpitWidgetCanonicalId('sounds'), 'sounds');
  assert.equal(resolveCockpitWidgetCanonicalId('soundmachine'), 'sounds');
  assert.equal(resolveCockpitWidgetCanonicalId('scrambler'), 'wortsatzwerkstatt');
  assert.equal(resolveCockpitWidgetCanonicalId('image'), 'image');
  assert.equal(resolveCockpitWidgetCanonicalId('weather'), null);
});

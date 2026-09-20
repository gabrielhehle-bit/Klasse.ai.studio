import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COCKPIT_QUICKBAR_ITEMS, normalizeCockpitQuickbarSettings, toggleCockpitQuickbarItem } from './cockpitQuickbar';

const source = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');

test('quickbar is optional, never seeds a demo widget or overwrites layout', () => {
  assert.equal(normalizeCockpitQuickbarSettings(null).enabled, false);
  assert.equal(normalizeCockpitQuickbarSettings({ enabled: true }).enabled, true);
  assert.equal(normalizeCockpitQuickbarSettings({ enabled: 'yes' }).enabled, false);
  assert.deepEqual(normalizeCockpitQuickbarSettings({ enabled: true, itemIds: ['timer', 'timer', 'unsafe', null] }), {
    enabled: true, itemIds: ['timer'],
  });
  assert.equal(COCKPIT_QUICKBAR_ITEMS.length, 7);
  assert.match(source, /Zusätzliche Widget-Leiste konfigurieren/);
  assert.match(source, /quickBarSettings\.enabled && quickBarSettings\.itemIds\.length > 0 && app\.activeClassId/);
  assert.match(source, /handleOpenWidgetInCockpitLayout\(item\.id as CockpitWidgetConfig\['type'\]\)/);
  assert.match(source, /toggleWidget\('termine'\)/);
});

test('quickbar changes and reset affect only active class preference', () => {
  const before = normalizeCockpitQuickbarSettings({ enabled: true, itemIds: ['timer', 'clock'] });
  const next = toggleCockpitQuickbarItem(before, 'dienste');
  assert.deepEqual(before.itemIds, ['timer', 'clock']);
  assert.deepEqual(next.itemIds, ['clock', 'timer', 'dienste']);
  assert.deepEqual(toggleCockpitQuickbarItem(next, 'timer').itemIds, ['clock', 'dienste']);
  assert.match(source, /cockpitQuickbarByClass/);
  assert.match(source, /\[boardTextClassKey\]: update\(current\)/);
  assert.match(source, /delete next\[boardTextClassKey\]/);
  assert.doesNotMatch(source.slice(source.indexOf('const resetQuickBarSettings'), source.indexOf('const boardInkItems: InkItem')), /cockpitLayout\s*:/);
  assert.match(source, /setIsQuickBarSettingsOpen\(false\);\s*\}, \[boardTextClassKey\]\)/);
});

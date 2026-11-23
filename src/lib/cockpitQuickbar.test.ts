import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  COCKPIT_QUICKBAR_ITEMS, COCKPIT_QUICKBAR_ADDABLE_ITEMS, normalizeCockpitQuickbarSettings,
  toggleCockpitQuickbarItem, moveCockpitQuickbarItem, getCockpitTeachingQuickbarIds,
} from './cockpitQuickbar';

const source = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const dock = readFileSync('src/components/cockpit/CockpitWidgetDock.tsx', 'utf8');

test('new classrooms get an ordered customizable dock; old disabled favorites remain disabled', () => {
  const defaults = normalizeCockpitQuickbarSettings(null);
  assert.equal(defaults.enabled, true);
  assert.deepEqual(defaults.itemIds, ['kidattendance', 'waldruhe', 'timeline', 'instruction', 'timer']);
  assert.equal(normalizeCockpitQuickbarSettings({ enabled: false }).enabled, false);
  assert.equal(normalizeCockpitQuickbarSettings({ enabled: 'yes' }).enabled, false);
  assert.deepEqual(normalizeCockpitQuickbarSettings({ enabled: true, itemIds: ['timer', 'timer', 'unsafe', null] }), {
    enabled: true, itemIds: ['timer'],
  });
  assert.equal(COCKPIT_QUICKBAR_ADDABLE_ITEMS.length, 17);
  assert.ok(!COCKPIT_QUICKBAR_ADDABLE_ITEMS.some(item => item.id === 'toothbrush'));
  assert.deepEqual(toggleCockpitQuickbarItem(defaults, 'toothbrush'), defaults);
  assert.equal(COCKPIT_QUICKBAR_ITEMS.some(item => item.id === 'pet'), true);
  assert.equal(COCKPIT_QUICKBAR_ITEMS.some(item => item.id === 'mathcards'), true);
  assert.deepEqual(normalizeCockpitQuickbarSettings({ enabled: true, itemIds: ['studentlist', 'timer'] }).itemIds, ['timer']);
  assert.deepEqual(
    normalizeCockpitQuickbarSettings({ enabled: true, itemIds: ['wheel', 'timer', 'geometry', 'dailyquotes'] }).itemIds,
    ['wheel', 'timer', 'geometry', 'dailyquotes'],
  );
  assert.match(source, /<CockpitWidgetDock/);
  assert.match(source, /onOpenWidget=\{\(id\) =>/);
  assert.match(source, /handleOpenWidgetInCockpitLayout\(id as CockpitWidgetConfig\["type"\]\)/);
  assert.doesNotMatch(source, /toggleWidget\("termine"\)/);
  assert.equal(COCKPIT_QUICKBAR_ITEMS.some(item => item.id === ('termine' as any)), false);
  assert.deepEqual(normalizeCockpitQuickbarSettings({ enabled: true, itemIds: ['termine', 'timer'] }).itemIds, ['timer']);
  assert.match(dock, /aria-label="Meine Widget-Favoriten"/);
  assert.match(dock, /aria-label="Weitere Widgets hinzufügen"/);
  assert.match(dock, /aria-label="Meine Widget-Leiste anpassen"/);
  assert.match(dock, /Weitere Widgets/);
  assert.match(dock, /\+ Hinzufügen/);
  assert.match(dock, /Standard wiederherstellen/);
  assert.match(dock, /Ja, Standard laden/);
  assert.doesNotMatch(dock, /onContextMenu=/);
});

test('dock labels are derived from the same catalog instead of a second visible-name map', () => {
  assert.match(readFileSync('src/lib/cockpitQuickbar.ts', 'utf8'), /splitCockpitWidgetLabel\(item\.label\)/);
  assert.doesNotMatch(readFileSync('src/lib/cockpitQuickbar.ts', 'utf8'), /QUICKBAR_OVERRIDES/);
  assert.equal(COCKPIT_QUICKBAR_ITEMS.find(item => item.id === 'pet')?.icon, '🐾');
  assert.equal(COCKPIT_QUICKBAR_ITEMS.find(item => item.id === 'groups')?.label, 'Gruppen-Einteiler');
});

test('favorites can be chosen and reordered without modifying saved widget positions', () => {
  const before = normalizeCockpitQuickbarSettings({ enabled: true, itemIds: ['timer', 'clock'] });
  const next = toggleCockpitQuickbarItem(before, 'classweeklyplan');
  assert.deepEqual(before.itemIds, ['timer', 'clock']);
  assert.deepEqual(next.itemIds, ['timer', 'clock', 'classweeklyplan']);
  assert.deepEqual(toggleCockpitQuickbarItem(next, 'timer').itemIds, ['clock', 'classweeklyplan']);
  assert.deepEqual(getCockpitTeachingQuickbarIds(next), ['timer', 'classweeklyplan']);
  assert.deepEqual(moveCockpitQuickbarItem(next, 'classweeklyplan', -1).itemIds, ['classweeklyplan', 'clock', 'timer']);
  assert.deepEqual(moveCockpitQuickbarItem(next, 'timer', -1).itemIds, next.itemIds);
  assert.deepEqual(moveCockpitQuickbarItem(next, 'clock', 1).itemIds, next.itemIds);
  assert.match(source, /cockpitQuickbarByClass/);
  assert.match(source, /\[boardTextClassKey\]: update\(current\)/);
  assert.match(source, /delete next\[boardTextClassKey\]/);
  assert.doesNotMatch(source.slice(source.indexOf('const resetQuickBarSettings'), source.indexOf('const boardInkItems: InkItem')), /cockpitLayout\s*:/);
  assert.match(dock, /moveCockpitQuickbarItem\(current, item\.id/);
  assert.match(dock, /removeCockpitQuickbarItem\(current, id\)/);
  assert.match(source, /addCockpitQuickbarItem\(settings, group\.id\)/);
});

test('clicking a pinned widget toggles open, minimized and restored without closing its saved state', () => {
  assert.match(source, /const visibleWidget = cockpitWidgets\.find\(widget => widget\.type === id && widget\.visible\)/);
  assert.match(source, /minimizedWidgetIds\.includes\(visibleWidget\.id\)/);
  assert.match(source, /current\.includes\(visibleWidget\.id\) \? current : \[\.\.\.current, visibleWidget\.id\]/);
  assert.match(source, /handleOpenWidgetInCockpitLayout\(id as CockpitWidgetConfig\["type"\]\)/);
  assert.match(dock, /item\.label \+ ' einklappen'/);
  assert.match(dock, /item\.label \+ ' wieder einblenden'/);
  assert.match(dock, /aria-pressed=\{isActive && !isMinimized\}/);
});

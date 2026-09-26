import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  COCKPIT_QUICKBAR_ITEMS, normalizeCockpitQuickbarSettings,
  toggleCockpitQuickbarItem, moveCockpitQuickbarItem,
} from './cockpitQuickbar';

const source = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const dock = readFileSync('src/components/cockpit/CockpitWidgetDock.tsx', 'utf8');

test('new classrooms get an ordered customizable dock; old disabled favorites remain disabled', () => {
  const defaults = normalizeCockpitQuickbarSettings(null);
  assert.equal(defaults.enabled, true);
  assert.deepEqual(defaults.itemIds, ['kidattendance', 'classweeklyplan', 'timer', 'wheel', 'randomname', 'groups']);
  assert.equal(normalizeCockpitQuickbarSettings({ enabled: false }).enabled, false);
  assert.equal(normalizeCockpitQuickbarSettings({ enabled: 'yes' }).enabled, false);
  assert.deepEqual(normalizeCockpitQuickbarSettings({ enabled: true, itemIds: ['timer', 'timer', 'unsafe', null] }), {
    enabled: true, itemIds: ['timer'],
  });
  assert.ok(COCKPIT_QUICKBAR_ITEMS.length >= 100);
  assert.equal(COCKPIT_QUICKBAR_ITEMS.some(item => item.id === 'pet'), true);
  assert.equal(COCKPIT_QUICKBAR_ITEMS.some(item => item.id === 'mathcards'), true);
  assert.deepEqual(normalizeCockpitQuickbarSettings({ enabled: true, itemIds: ['studentlist', 'timer'] }).itemIds, ['timer']);
  assert.deepEqual(
    normalizeCockpitQuickbarSettings({ enabled: true, itemIds: ['timer', 'geometry', 'dailyquotes'] }).itemIds,
    ['timer', 'geometry', 'dailyquotes'],
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
  assert.match(dock, /Ja, entfernen/);
  assert.doesNotMatch(dock, /onContextMenu=/);
});

test('favorites can be chosen and reordered without modifying saved widget positions', () => {
  const before = normalizeCockpitQuickbarSettings({ enabled: true, itemIds: ['timer', 'clock'] });
  const next = toggleCockpitQuickbarItem(before, 'dienste');
  assert.deepEqual(before.itemIds, ['timer', 'clock']);
  assert.deepEqual(next.itemIds, ['timer', 'clock', 'dienste']);
  assert.deepEqual(toggleCockpitQuickbarItem(next, 'timer').itemIds, ['clock', 'dienste']);
  assert.deepEqual(moveCockpitQuickbarItem(next, 'dienste', -1).itemIds, ['timer', 'dienste', 'clock']);
  assert.deepEqual(moveCockpitQuickbarItem(next, 'timer', -1).itemIds, next.itemIds);
  assert.deepEqual(moveCockpitQuickbarItem(next, 'clock', 1).itemIds, ['timer', 'dienste', 'clock']);
  assert.match(source, /cockpitQuickbarByClass/);
  assert.match(source, /\[boardTextClassKey\]: update\(current\)/);
  assert.match(source, /delete next\[boardTextClassKey\]/);
  assert.doesNotMatch(source.slice(source.indexOf('const resetQuickBarSettings'), source.indexOf('const boardInkItems: InkItem')), /cockpitLayout\s*:/);
  assert.match(dock, /moveCockpitQuickbarItem\(current, item\.id/);
  assert.match(dock, /removeCockpitQuickbarItem\(current, id\)/);
  assert.match(source, /addCockpitQuickbarItem\(settings, item\.type as CockpitQuickbarId\)/);
  assert.match(source, /addCockpitQuickbarItem\(settings, primaryType as CockpitQuickbarId\)/);
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

import test from 'node:test';
import assert from 'node:assert/strict';
import { groupSidebarItems } from './sidebarNavigation';
const items = ['dashboard', 'cockpit', 'wochenplanung', 'schueler', 'anwesenheit', 'noten', 'diagnostik', 'jahresplanung', 'datensicherung', 'settings'].map(id => ({ id, section: 'Test' }));
test('everyday navigation has six ordered entries and keeps utilities separate', () => {
  const result = groupSidebarItems(items, [], 'dashboard', false);
  assert.deepEqual(result.daily.map(i => i.id), items.slice(0, 6).map(i => i.id));
  assert.deepEqual(result.utilities.map(i => i.id), ['datensicherung', 'settings']);
  assert.deepEqual(result.extra.map(i => i.id), ['diagnostik', 'jahresplanung']);
  assert.equal(result.expanded, false);
  assert.equal(new Set([...result.daily, ...result.extra, ...result.utilities].map(i => i.id)).size, items.length);
});
test('custom visibility is preserved but an already open page remains discoverable', () => {
  const result = groupSidebarItems(items, ['cockpit', 'diagnostik', 'settings', 'datensicherung'], 'diagnostik', false);
  assert.equal(result.daily.some(i => i.id === 'cockpit'), false);
  assert.equal(result.extra.some(i => i.id === 'diagnostik'), true);
  assert.deepEqual(result.utilities.map(i => i.id), ['datensicherung', 'settings']);
  assert.equal(result.expanded, false);
  assert.equal(groupSidebarItems(items, [], 'dashboard', true).expanded, true);
});

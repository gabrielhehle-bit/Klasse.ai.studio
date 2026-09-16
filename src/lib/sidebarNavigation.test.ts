import test from 'node:test';
import assert from 'node:assert/strict';
import { groupSidebarItems } from './sidebarNavigation';

const items = [
  'dashboard', 'klasse', 'verhalten', 'planung', 'leistungen', 'unterricht',
  'cockpit', 'ki-helfer', 'schueler', 'anwesenheit', 'noten',
  'diagnostik', 'jahresplanung', 'datensicherung', 'settings'
].map(id => ({ id, section: 'Test' }));

test('Klassio core navigation includes Notizen as a direct main area', () => {
  const result = groupSidebarItems(items, [], 'dashboard', false);
  assert.deepEqual(result.daily.map(i => i.id), ['dashboard', 'klasse', 'verhalten', 'planung', 'leistungen', 'unterricht']);
  assert.deepEqual(result.utilities.map(i => i.id), ['datensicherung', 'settings']);
  assert.deepEqual(result.extra.map(i => i.id), ['cockpit', 'ki-helfer', 'schueler', 'anwesenheit', 'noten', 'diagnostik', 'jahresplanung']);
  assert.equal(result.expanded, false);
  assert.equal(new Set([...result.daily, ...result.extra, ...result.utilities].map(i => i.id)).size, items.length);
});

test('custom visibility is preserved but an already open page remains discoverable', () => {
  const result = groupSidebarItems(items, ['diagnostik', 'settings', 'datensicherung'], 'diagnostik', false);
  assert.equal(result.daily.map(i => i.id).join(','), 'dashboard,klasse,verhalten,planung,leistungen,unterricht');
  assert.equal(result.extra.some(i => i.id === 'diagnostik'), true);
  assert.deepEqual(result.utilities.map(i => i.id), ['datensicherung', 'settings']);
  assert.equal(result.expanded, false);
  assert.equal(groupSidebarItems(items, [], 'dashboard', true).expanded, true);
});

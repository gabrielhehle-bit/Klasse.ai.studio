import test from 'node:test';
import assert from 'node:assert/strict';
import { getNavigationParent } from './navigationHierarchy';

test('core pages have no parent breadcrumb', () => {
  for (const page of ['dashboard', 'klasse', 'verhalten', 'planung', 'leistungen', 'unterricht']) {
    assert.equal(getNavigationParent(page), null);
  }
});

test('Unterricht tools return to Unterricht', () => {
  for (const page of ['cockpit', 'ki-helfer', 'ki-paedagogik', 'arbeitsblatt', 'stationenbetrieb', 'differenzierung', 'elternbrief']) {
    assert.deepEqual(getNavigationParent(page), { id: 'unterricht', label: 'Unterricht' });
  }
});

test('Diktat gehört zu Notizen', () => {
  assert.deepEqual(getNavigationParent('stimmnotizen'), { id: 'verhalten', label: 'Notizen' });
});

test('Klasse, Planung and Leistungen detail pages have a stable parent', () => {
  for (const page of ['schueler', 'sitzplan', 'anwesenheit', 'orga', 'klassengemeinschaft', 'eltern', 'teamteaching']) {
    assert.equal(getNavigationParent(page)?.id, 'klasse');
  }
  for (const page of ['planungszentrale', 'jahresplanung', 'wochenplanung', 'stunden', 'materialien', 'canva', 'vertretung', 'uebergabemappe']) {
    assert.equal(getNavigationParent(page)?.id, 'planung');
  }
  for (const page of ['noten', 'portfolio', 'diagnostik', 'statistik', 'kel', 'notenTabelle', 'verbal', 'jahresbericht']) {
    assert.equal(getNavigationParent(page)?.id, 'leistungen');
  }
});

test('utility and unclassified pages do not pretend to have a parent', () => {
  for (const page of ['datensicherung', 'settings', 'drucken', 'archiv', 'design-system', 'unknown-page']) {
    assert.equal(getNavigationParent(page), null);
  }
});

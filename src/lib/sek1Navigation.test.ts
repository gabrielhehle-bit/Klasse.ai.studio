import test from 'node:test';
import assert from 'node:assert/strict';
import { istSekundarstufe, istSek1Navigationsziel, SEK1_NAVIGATION_IDS, sek1Seite } from './sek1Navigation';

test('secondary schools get exactly the requested pedagogical modules plus essential data utilities', () => {
  const expected = [
    'dashboard', 'jahresplanung', 'wochenplanung', 'schueler', 'sitzplan',
    'noten', 'anwesenheit', 'stundenplan', 'verhalten', 'dossier', 'drucken',
    'datensicherung', 'settings',
  ];
  assert.deepEqual([...SEK1_NAVIGATION_IDS], expected);
  for (const id of expected) assert.equal(istSek1Navigationsziel(id), true);
  for (const id of ['cockpit', 'diagnostik', 'portfolio', 'klassengemeinschaft', 'ki-helfer', 'canva', 'tools', 'orga']) {
    assert.equal(istSek1Navigationsziel(id), false);
  }
});

test('class-dependent navigation redirects unsupported pages only for Sek I', () => {
  assert.equal(istSekundarstufe('volksschule'), false);
  assert.equal(istSekundarstufe('mittelschule'), true);
  assert.equal(istSekundarstufe('ahs_unterstufe'), true);
  for (const schulart of ['mittelschule', 'ahs_unterstufe'] as const) {
    for (const id of SEK1_NAVIGATION_IDS) assert.equal(sek1Seite(id, schulart), id);
    assert.equal(sek1Seite('setup', schulart), 'setup');
    assert.equal(sek1Seite('setup_new', schulart), 'setup_new');
    assert.equal(sek1Seite('klasse', schulart), 'schueler');
    assert.equal(sek1Seite('planung', schulart), 'wochenplanung');
    assert.equal(sek1Seite('leistungen', schulart), 'noten');
    assert.equal(sek1Seite('diagnostik', schulart), 'dashboard');
  }
  assert.equal(sek1Seite('diagnostik', 'volksschule'), 'diagnostik');
  assert.equal(sek1Seite('cockpit', undefined), 'cockpit');
});

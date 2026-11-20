import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Öffentlicher Einstieg trennt Landingpage, Demo und geschützten Login', () => {
  const appSource = readFileSync('src/App.tsx', 'utf8');

  assert.ok(appSource.includes("path === '/login'"));
  assert.ok(appSource.includes("path === '/demo'"));
  assert.match(appSource, /<PublicWelcome/);
  assert.match(appSource, /publicMode === 'login'/);
  assert.match(appSource, /<AccessGate onSuccess=\{handleLoginSuccess\}/);
});

test('Öffentliche KLASSIO-Demo bleibt von echten App- und Tresordaten isoliert', () => {
  const previewSource = readFileSync('src/components/PublicWelcome.tsx', 'utf8');

  assert.match(previewSource, /ohne Anmeldung/i);
  assert.match(previewSource, /nur Beispieldaten/i);
  assert.match(previewSource, /Nichts wird gespeichert/);

  assert.doesNotMatch(previewSource, /useApp\s*\(/);
  assert.doesNotMatch(previewSource, /AppContext/);
  assert.doesNotMatch(previewSource, /VaultGate/);
  assert.doesNotMatch(previewSource, /localforage/);
  assert.doesNotMatch(previewSource, /\/api\/account-sync/);
  assert.doesNotMatch(previewSource, /createBeispielklasse/);
});

test('Die Vorschau zeigt die vier wichtigsten KLASSIO-Bereiche', () => {
  const previewSource = readFileSync('src/components/PublicWelcome.tsx', 'utf8');

  for (const label of ['Dashboard', 'Wochenplanung', 'Lehrer-Cockpit', 'Schülerdossier']) {
    assert.match(previewSource, new RegExp(label));
  }
});


test('Öffentliche Startseite erklärt den Nutzen, den Preis und den Datenschutz', () => {
  const previewSource = readFileSync('src/components/PublicWelcome.tsx', 'utf8');
  const hero = previewSource.match(/<section data-public-landing-hero[\s\S]*?<\/section>/)?.[0] || '';

  assert.match(hero, /Die App für Lehrpersonen/);
  assert.match(hero, /Dauerhaft kostenlos/);
  assert.match(hero, /0 €/);
  assert.match(hero, /Alle Funktionen inklusive/);
  assert.match(hero, /Demo ausprobieren/);
  assert.match(hero, /Demo ohne Anmeldung/);
  assert.match(hero, /Mit KLASSIO starten/);
  assert.match(previewSource, /AES-256-Verschlüsselung/);
  assert.match(previewSource, /Unterricht planen/);
  assert.match(previewSource, /Deine Klasse im Blick behalten/);
  assert.match(previewSource, /KEL-Gespräche vorbereiten/);
});

test('Startseiten-Metadaten sind deutsch und für Teilen aktualisiert', () => {
  const indexSource = readFileSync('index.html', 'utf8');

  assert.match(indexSource, /<html lang="de">/);
  assert.match(indexSource, /<title>KLASSIO – Kostenlose App für Lehrpersonen<\/title>/);
  assert.match(indexSource, /property="og:description" content="[^"]*Dauerhaft 0 €/);
  assert.match(indexSource, /property="og:type" content="website"/);
  assert.match(indexSource, /property="og:url" content="https:\/\/klassio\.at\/"/);
  assert.match(indexSource, /rel="canonical" href="https:\/\/klassio\.at\/"/);
});


test('Öffentliche Startseite ist für kleine Displays abgesichert', () => {
  const previewSource = readFileSync('src/components/PublicWelcome.tsx', 'utf8');

  assert.match(previewSource, /overflow-x-hidden/);
  assert.match(previewSource, /scroll-mt-20/);
  assert.match(previewSource, /scrollbar-width:none/);
  assert.match(previewSource, /aria-pressed=\{tab === id\}/);
});

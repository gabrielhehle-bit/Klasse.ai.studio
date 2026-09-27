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


test('Öffentliche Startseite erklärt Produkt, Ablauf und Datenschutz klar', () => {
  const previewSource = readFileSync('src/components/PublicWelcome.tsx', 'utf8');

  assert.match(previewSource, /Dein kompletter Schulalltag/);
  assert.match(previewSource, /Eine Oberfläche/);
  assert.match(previewSource, /KLASSIO in Aktion/);
  assert.match(previewSource, /So funktioniert KLASSIO/);
  assert.match(previewSource, /AES-256-Verschlüsselung/);

  for (const label of [
    'Planung',
    'Lehrer-Cockpit',
    'Klasse & Schülerdossier',
    'Leistungen & Diagnostik',
    'Organisation',
    'KI & Werkzeuge',
  ]) {
    assert.match(previewSource, new RegExp(label.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&')));
  }
});

test('Startseiten-Metadaten sind deutsch und für Teilen aktualisiert', () => {
  const indexSource = readFileSync('index.html', 'utf8');

  assert.match(indexSource, /<html lang="de">/);
  assert.match(indexSource, /KLASSIO – Dein kompletter Schulalltag in einer Oberfläche/);
  assert.match(indexSource, /property="og:type" content="website"/);
  assert.match(indexSource, /property="og:url" content="https:\/\/klassio\.at\/"/);
  assert.match(indexSource, /rel="canonical" href="https:\/\/klassio\.at\/"/);
});


test('Öffentliche Startseite ist für kleine Displays abgesichert', () => {
  const previewSource = readFileSync('src/components/PublicWelcome.tsx', 'utf8');

  assert.match(previewSource, /overflow-x-hidden/);
  assert.match(previewSource, /clamp\(2\.35rem,11vw,3\.25rem\)/);
  assert.match(previewSource, /scroll-mt-20/);
  assert.match(previewSource, /scrollbar-width:none/);
  assert.match(previewSource, /aria-pressed=\{tab === id\}/);
});

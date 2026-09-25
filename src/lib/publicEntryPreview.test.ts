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

  assert.match(previewSource, /Demo ohne Anmeldung/);
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

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const components = join(here, '..', 'components');

const read = (name: string) => readFileSync(join(components, name), 'utf8');

test('Klasse hub separates daily work from organization and community', () => {
  const source = read('KlasseHub.tsx');
  assert.match(source, /Kinder & Alltag/);
  assert.match(source, /Organisation & Gemeinschaft/);
  for (const id of ['schueler', 'anwesenheit', 'sitzplan', 'verhalten', 'orga', 'kel', 'klassengemeinschaft']) {
    assert.match(source, new RegExp(`id:\\s*['"]${id}['"]`));
  }
});

test('Leistungen hub separates assessment from learning development', () => {
  const source = read('LeistungenHub.tsx');
  assert.match(source, /Bewerten & Beurteilen/);
  assert.match(source, /Lernentwicklung & Gespräche/);
  for (const id of ['noten', 'notenTabelle', 'verbal', 'portfolio', 'diagnostik', 'statistik', 'kel', 'jahresbericht']) {
    assert.match(source, new RegExp(`id:\\s*['"]${id}['"]`));
  }
});

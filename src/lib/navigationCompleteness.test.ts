import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const components = join(here, '..', 'components');

function source(file: string) {
  return readFileSync(join(components, file), 'utf8');
}

function assertContainsAll(text: string, ids: string[]) {
  for (const id of ids) {
    assert.match(text, new RegExp(`id:\\s*['"]${id}['"]`), `missing navigation target ${id}`);
  }
}

test('Unterricht hub exposes the cockpit and previously scattered teaching tools', () => {
  const text = source('UnterrichtHub.tsx');
  assert.match(text, /setPage\(['"]cockpit['"]\)/);
  assertContainsAll(text, ['ki-helfer', 'arbeitsblatt', 'stationenbetrieb', 'stimmnotizen', 'differenzierung', 'elternbrief']);
});

test('Klasse, Planung and Leistungen hubs expose their remaining legacy tools', () => {
  assertContainsAll(source('KlasseHub.tsx'), ['schueler', 'anwesenheit', 'sitzplan', 'verhalten', 'orga', 'kel', 'klassengemeinschaft']);
  assertContainsAll(source('PlanungHub.tsx'), ['planungszentrale', 'wochenplanung', 'jahresplanung', 'stunden', 'materialien', 'canva', 'vertretung', 'uebergabemappe']);
  assertContainsAll(source('LeistungenHub.tsx'), ['noten', 'portfolio', 'diagnostik', 'statistik', 'kel', 'notenTabelle', 'verbal', 'jahresbericht']);
});

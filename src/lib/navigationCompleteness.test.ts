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

test('Unterricht führt ohne Übersichtsseite direkt ins Lehrercockpit und vorbereitet wird getrennt', () => {
  const sidebar = source('Sidebar.tsx');
  const app = readFileSync(join(components, '..', 'App.tsx'), 'utf8');
  const tools = source('ToolsHub.tsx');
  assert.match(sidebar, /id: 'cockpit', label: 'Lehrercockpit'.*section: 'Start'/);
  assert.doesNotMatch(sidebar, /id: 'unterricht', label: 'Unterricht'/);
  assert.match(app, /app\.currentPage === 'unterricht' \? 'cockpit'/);
  assert.match(app, /case 'cockpit': return null/);
  assert.match(app, /currentPage === 'cockpit'/);
  assert.match(app, /setPage\('dashboard'\);\s*\}\} \/>/);
  assertContainsAll(tools, ['stationenbetrieb', 'textanalyse', 'drucken']);
  for (const id of ['ki-helfer', 'arbeitsblatt', 'differenzierung', 'elternbrief']) {
    assert.doesNotMatch(tools, new RegExp("id: '"+id+"'"));
  }
  assertContainsAll(sidebar, ['ki-helfer', 'arbeitsblatt', 'differenzierung', 'elternbrief']);
});

test('Klasse, Planung and Leistungen hubs expose their remaining legacy tools', () => {
  assertContainsAll(source('KlasseHub.tsx'), ['schueler', 'dossier', 'anwesenheit', 'sitzplan', 'verhalten', 'orga', 'kel', 'klassengemeinschaft', 'teamteaching', 'jahresbericht']);
  assertContainsAll(source('PlanungHub.tsx'), ['planungszentrale', 'wochenplanung', 'jahresplanung', 'materialien', 'vertretung']);
  assertContainsAll(source('ToolsHub.tsx'), ['canva']);
  assertContainsAll(source('LeistungenHub.tsx'), ['noten', 'portfolio', 'diagnostik', 'kel', 'verbal']);
});

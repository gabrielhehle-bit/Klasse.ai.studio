import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sidebar = readFileSync('src/components/Sidebar.tsx', 'utf8');

test('Sidebar: vollständige moderne Klassio-Bereiche bleiben erreichbar', () => {
  for (const id of [
    'dashboard', 'klasse', 'planung', 'leistungen', 'unterricht',
    'cockpit', 'ki-helfer', 'lehrerzimmer', 'arbeitsblatt', 'stationenbetrieb',
    'stimmnotizen', 'differenzierung', 'elternbrief',
    'schueler', 'sitzplan', 'anwesenheit', 'verhalten', 'orga',
    'noten', 'statistik', 'diagnostik', 'portfolio', 'notenTabelle', 'verbal', 'kel',
    'planungszentrale', 'jahresplanung', 'wochenplanung', 'materialien', 'stunden',
    'canva', 'vertretung', 'uebergabemappe', 'klassengemeinschaft', 'jahresbericht',
    'archiv', 'drucken', 'datensicherung', 'settings',
  ]) {
    assert.match(sidebar, new RegExp(`id:\\s*['"]${id}['"]`), `Sidebar-Modul fehlt: ${id}`);
  }
});

test('Sidebar: persönliche Reihenfolge ist global statt auf Bereiche begrenzt', () => {
  assert.match(sidebar, /moveSidebarModule\(draggedId, item\.id\)/);
  assert.doesNotMatch(sidebar, /dragged\.section !== target\.section/);
  assert.match(sidebar, /moveSidebarModuleBy/);
  assert.match(sidebar, /<ArrowUp/);
  assert.match(sidebar, /<ArrowDown/);
});

test('Sidebar: kompakter Standard zeigt acht Prioritäten und alle weiteren unter Mehr', () => {
  assert.match(sidebar, /const PRIMARY_VISIBLE_COUNT = 8/);
  assert.match(sidebar, /visibleMainModules = showMorePages \? mainModules : mainModules\.slice/);
  assert.match(sidebar, /Mehr \(\$\{hiddenMainCount\}\)/);
});

test('Sidebar: alte Fokus- und Standard-Presets werden nicht als versteckte Funktionsbasis beibehalten', () => {
  assert.match(sidebar, /Alte Fokus-\/Standard-Presets hatten neue Funktionen unsichtbar gemacht/);
  assert.match(sidebar, /disabledModules: \[\]/);
  assert.doesNotMatch(sidebar, />\s*🌱 Fokus\s*</);
  assert.doesNotMatch(sidebar, />\s*🚀 Standard\s*</);
});

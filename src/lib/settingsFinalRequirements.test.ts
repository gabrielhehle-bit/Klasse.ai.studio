import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const settings = readFileSync('src/components/Settings.tsx', 'utf8');
const general = readFileSync('src/components/settings/GeneralSettings.tsx', 'utf8');
const display = readFileSync('src/components/settings/DisplaySettings.tsx', 'utf8');
const modules = readFileSync('src/components/settings/ModuleSettings.tsx', 'utf8');
const advanced = readFileSync('src/components/settings/AdvancedSettings.tsx', 'utf8');
const header = readFileSync('src/components/settings/SettingsHeader.tsx', 'utf8');
const dashboard = readFileSync('src/components/settings/SettingsDashboard.tsx', 'utf8');
const sidebar = readFileSync('src/components/Sidebar.tsx', 'utf8');
const catalog = readFileSync('src/lib/settingsModuleCatalog.ts', 'utf8');

function idsFromBlock(source: string, startMarker: string, endMarker: string): string[] {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `Block ${startMarker} nicht gefunden`);
  const block = source.slice(start, end);
  return Array.from(block.matchAll(/\bid:\s*['"]([^'"]+)['"]/g), match => match[1]);
}

test('Einstellungen: Schuljahr wird dynamisch statt als 2025/26-Aktuell markiert', () => {
  assert.match(general, /getCurrentSchuljahr\(\)/);
  assert.match(general, /year === currentSchoolYear \? ' \(Aktuell\)' : ''/);
  assert.doesNotMatch(general, /2025\/26 \(Aktuell\)/);
  assert.match(general, /app\.schuljahr,[\s\S]*\.filter\(Boolean\)/);
});

test('Einstellungen: Ferientext behauptet keine schulautonomen Tage im Datensatz', () => {
  assert.match(general, /Schulautonome oder kurzfristig geänderte freie Tage müssen zusätzlich in der Planung ergänzt werden/);
});

test('Einstellungen: Modulverwaltung deckt alle ausblendbaren Sidebar-Bereiche ab', () => {
  const sidebarIds = idsFromBlock(sidebar, 'const ALL_MODULES = [', '];');
  const configurableSidebarIds = sidebarIds.filter(id => !['settings', 'datensicherung'].includes(id));
  const catalogIds = idsFromBlock(catalog, 'export const AVAILABLE_MODULES', '];');

  assert.deepEqual(
    [...catalogIds].sort(),
    [...configurableSidebarIds].sort(),
    'Settings-Katalog und ausblendbare Sidebar-Module müssen identisch bleiben'
  );
  assert.equal(new Set(catalogIds).size, catalogIds.length, 'Modul-IDs dürfen nicht doppelt vorkommen');
});

test('Einstellungen: Modulverwaltung hat keinen Kreisimport über Settings.tsx', () => {
  assert.match(settings, /from '\.\.\/lib\/settingsModuleCatalog'/);
  assert.match(modules, /from '\.\.\/\.\.\/lib\/settingsModuleCatalog'/);
  assert.doesNotMatch(modules, /from '\.\.\/Settings'/);
});

test('Einstellungen: alte wirkungslose Whiteboard-Schalter sind aus Darstellung entfernt', () => {
  assert.doesNotMatch(display, /enableWhiteboardLaser/);
  assert.doesNotMatch(display, /whiteboardBackground/);
  assert.doesNotMatch(display, /showVerhaltenOnBoard/);
  assert.match(display, /Weiße Arbeitsfläche im Lehrercockpit/);
  assert.match(display, /bewusst leere weiße Fläche und die gewünschten Widgets/);
  assert.match(display, /Schreiben und Zeichnen übernimmt das Smartboard selbst/);
});

test('Einstellungen: Speicherdiagnose verwendet Browser-Quote statt 4- oder 5-MB-Fiktion', () => {
  assert.match(advanced, /speicherInfo\.quotaBytes/);
  assert.match(advanced, /speicherInfo\.indexedDbBytes/);
  assert.doesNotMatch(advanced, /> 4 MB/);
  assert.doesNotMatch(advanced, /5\.0 MB/);
  assert.doesNotMatch(advanced, /5 \* 1024 \* 1024/);
});

test('Einstellungen: Offline- und Werksreset-Texte sind präzise', () => {
  assert.match(advanced, /lokale Kernfunktionen verfügbar, Online-Funktionen eingeschränkt/);
  assert.match(advanced, /Lokale App-Daten löschen \(Werkseinstellung\)/);
  assert.match(advanced, /Separate OneDrive-\/Cloud-Sicherungen bleiben bestehen/);
});

test('Einstellungen: Detailmodus-Badge zeigt den echten Zustand', () => {
  assert.match(header, /einfachModus \? 'Einfachmodus' : 'Alle Optionen'/);
  assert.doesNotMatch(header, />\s*Ruhiger Modus\s*</);
});

test('Einstellungen: Übersicht vermeidet pauschale Sicherheitsgarantie', () => {
  assert.match(dashboard, /Löschfunktionen sind getrennt im Gefahrenbereich abgesichert/);
  assert.doesNotMatch(dashboard, /bleiben stets sicher geschützt/);
});

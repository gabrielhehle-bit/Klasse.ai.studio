import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const overview = readFileSync('src/components/settings/SettingsDashboard.tsx', 'utf8');
const header = readFileSync('src/components/settings/SettingsHeader.tsx', 'utf8');

const originalOrder = ['help', 'account', 'general', 'display', 'modules', 'sync', 'backup', 'support', 'advanced'];
const originalTitles = [
  'Hilfe & Anleitungen', 'Konto & Schulmail', 'Allgemein', 'Darstellung', 'Module & Bereiche',
  'Synchronisierung', 'Daten & Backup', 'Unterstützung', 'Erweitert & Sicherheit',
];

test('Redesign preserves exactly the nine known cards, their names and their positions', () => {
  const ids = [...overview.matchAll(/id: '(\w+)' as SettingsCategory/g)].map(m => m[1]);
  const labels = [...overview.matchAll(/title: '([^']+)'/g)].map(m => m[1]);
  assert.deepEqual(ids, originalOrder);
  assert.deepEqual(labels, originalTitles);
  assert.match(overview, /grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3/);
  assert.match(overview, /TILES\.map\(tile =>/);
  assert.match(overview, /onClick=\{\(\) => onSelectCategory\(tile\.id\)\}/);
  assert.match(overview, /data-settings-destination=\{tile\.id\}/);
  assert.match(overview, /Bereich öffnen/);
});

test('New style is restrained while retaining responsive cards and real statuses', () => {
  assert.match(overview, /data-testid="klassio-editorial-settings"/);
  assert.doesNotMatch(overview, /bg-gradient-to-br|rounded-\[2rem\]|hover:shadow-md|group-hover:scale-105/);
  assert.doesNotMatch(overview, /initial=\{|animate=\{|transition=\{\{ delay:/);
  assert.match(overview, /border-\[var\(--border\)\]/);
  assert.match(overview, /disabledModulesCount > 0/);
  assert.match(overview, /hasActiveSync \?/);
  assert.match(overview, /hasDemoData \?/);
  assert.match(overview, /Löschfunktionen sind getrennt im Gefahrenbereich abgesichert/);
});

test('All original tab icons, orders, labels and Einfachmodus switch remain', () => {
  const items = header.match(/export const CATEGORIES:[\s\S]*?= \[([\s\S]*?)\];/);
  assert.ok(items);
  const ids = [...items[1].matchAll(/id: '(\w+)'/g)].map(m => m[1]);
  assert.deepEqual(ids, ['account', 'general', 'display', 'modules', 'sync', 'backup', 'support', 'advanced', 'help']);
  assert.match(header, /<Icon size=\{14\} \/>/);
  assert.match(header, /role="switch"/);
  assert.match(header, /aria-checked=\{einfachModus\}/);
  assert.match(header, /setEinfachModus\(!einfachModus\)/);
  assert.match(header, /einfachModus \? 'Einfachmodus' : 'Alle Optionen'/);
  assert.match(header, /setActiveCategory\('overview'\)/);
  assert.match(header, /activeCategory === cat\.id/);
});

test('Neither design component writes application or classroom state', () => {
  assert.doesNotMatch(overview + '\n' + header, /\bsetApp\(|\bfetch\(|\blocalStorage\.|\bdeleteClass\(|\bpushSharedClass\(/);
});

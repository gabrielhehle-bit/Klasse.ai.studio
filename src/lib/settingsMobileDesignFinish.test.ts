import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const header = readFileSync('src/components/settings/SettingsHeader.tsx', 'utf8');
const overview = readFileSync('src/components/settings/SettingsDashboard.tsx', 'utf8');

test('mobile settings show a labelled, keyboard-accessible native section picker', () => {
  assert.match(header, /data-testid="settings-mobile-section-picker"/);
  assert.match(header, /className="space-y-2 sm:hidden"/);
  assert.match(header, /htmlFor="klassio-settings-mobile-category"/);
  assert.match(header, /id="klassio-settings-mobile-category"/);
  assert.match(header, /value=\{activeCategory\}/);
  assert.match(header, /onChange=\{\(event\) => setActiveCategory\(event\.target\.value as SettingsCategory\)\}/);
  assert.match(header, /<option value="overview">Übersicht<\/option>/);
  assert.match(header, /\{visibleCategories\.map\(cat => \(/);
  assert.match(header, /min-h-12/);
});

test('desktop tabs remain intact while narrow phones use the picker', () => {
  assert.match(header, /<nav ref=\{navRef\} aria-label="Einstellungen: Bereiche" className="hidden sm:flex/);
  assert.match(header, /aria-current=\{isActive \? 'page' : undefined\}/);
  assert.match(header, /setActiveCategory\(cat\.id\)/);
  assert.match(header, /cat\.id !== 'advanced' && cat\.id !== 'support'/);
  assert.match(header, /cat\.id === activeCategory/);
});

test('mobile settings cards use compact rows without hiding functionality or status', () => {
  assert.match(overview, /data-settings-destination=\{tile\.id\}/);
  assert.match(overview, /sm:min-h-\[175px\] sm:flex-col/);
  assert.match(overview, /sm:hidden/);
  assert.match(overview, /\{'status' in tile && tile\.status && \(/);
  assert.match(overview, /onClick=\{\(\) => onSelectCategory\(tile\.id\)\}/);
  assert.match(overview, /data-testid="settings-open-class-team"/);
  assert.doesNotMatch(overview + header, /\bsetApp\(|\bfetch\(/);
});

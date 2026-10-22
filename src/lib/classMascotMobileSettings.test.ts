import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_CLASS_MASCOT, MASCOT_OPTIONS, selectClassMascot } from './classMascot';

const mobile = readFileSync('src/mobileQuickMode.ts', 'utf8');
const display = readFileSync('src/components/settings/DisplaySettings.tsx', 'utf8');
const settings = readFileSync('src/components/Settings.tsx', 'utf8');

test('Phone quick mode offers a direct route to class mascot settings', () => {
  assert.match(mobile, /createAction\('Klassenmaskottchen', 'Figur für diese Klasse auswählen', 'settings', undefined, 'display'\)/);
  assert.match(mobile, /sessionStorage\.setItem\('klassio-settings-category', settingsCategory\)/);
  assert.match(mobile, /new CustomEvent\('klassio-open-settings-category', \{ detail: settingsCategory \}\)/);
  assert.match(settings, /window\.sessionStorage\.getItem\('klassio-settings-category'\)/);
  assert.match(settings, /'klassio-open-settings-category'/);
});

test('Only phones get the additional mascot picker; no cockpit state is reset', () => {
  assert.match(display, /className="md:hidden rounded-3xl/);
  assert.match(display, /aria-label="Klassenmaskottchen am Handy ändern"/);
  assert.match(display, /MASCOT_OPTIONS\.map\(option =>/);
  assert.match(display, /disabled=\{!app\.activeClassId\}/);
  assert.match(display, /aria-pressed=\{selected\}/);
  assert.match(display, /classMascot: selectClassMascot\(normalizeClassMascot\(prev\.classMascot\), option\.kind\)/);
  assert.match(display, /<ClassMascotArtwork kind=\{option\.kind\}/);
  assert.equal(MASCOT_OPTIONS.length, 4);
});

test('Mascot changes preserve class-scoped decoration and rewards', () => {
  const before = {
    ...DEFAULT_CLASS_MASCOT,
    mood: 'proud' as const,
    accessory: 'scarf' as const,
    season: 'winter' as const,
    stars: 4,
    displaySize: 280 as const,
    liveNoiseEnabled: true,
  };
  const after = selectClassMascot(before, 'cat');
  assert.equal(after.kind, 'cat');
  assert.equal(after.name, 'Mimi');
  assert.equal(after.mood, 'happy');
  assert.equal(after.accessory, 'scarf');
  assert.equal(after.season, 'winter');
  assert.equal(after.stars, 4);
  assert.equal(after.displaySize, 280);
  assert.equal(after.liveNoiseEnabled, true);
  assert.equal(before.kind, 'otter');
});

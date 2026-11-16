import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const header = readFileSync('src/components/settings/SettingsHeader.tsx', 'utf8');
const settings = readFileSync('src/components/Settings.tsx', 'utf8');

test('active settings tab stays identified and scrolls into view on narrow screens', () => {
  assert.match(header, /ref=\{navRef\} aria-label="Einstellungen: Bereiche"/);
  assert.match(header, /querySelector<HTMLButtonElement>\('\[aria-current="page"\]'\)/);
  assert.match(header, /nav\.scrollBy\(\{ left:/);
  assert.match(header, /\[activeCategory, einfachModus\]/);
  assert.match(header, /aria-current=\{activeCategory === 'overview' \? 'page' : undefined\}/);
  assert.match(header, /aria-current=\{isActive \? 'page' : undefined\}/);
  assert.match(header, /className=\{\`min-h-11 px-4 py-2\.5/);
});

test('easy mode hides risky categories on overview but keeps directly opened category reachable', () => {
  assert.match(header, /\(cat\.id !== 'advanced' && cat\.id !== 'support'\) \|\| cat\.id === activeCategory/);
  assert.match(settings, /klassio-open-settings-category/);
  assert.match(settings, /setActiveCategory\(requested as SettingsCategory\)/);
});

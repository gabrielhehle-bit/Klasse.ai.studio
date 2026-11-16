import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const settings = readFileSync('src/components/Settings.tsx', 'utf8');
const dashboard = readFileSync('src/components/settings/SettingsDashboard.tsx', 'utf8');
const header = readFileSync('src/components/settings/SettingsHeader.tsx', 'utf8');

test('the default simplified mode hides advanced and support cards as well as tabs', () => {
  assert.match(settings, /const einfachModus = \(app\.settings as any\)\?\.einfachModus !== false/);
  assert.match(settings, /einfachModus=\{einfachModus\}/);
  assert.match(dashboard, /einfachModus: boolean/);
  assert.match(dashboard, /TILES\.map\(tile => \{/);
  assert.match(dashboard, /if \(einfachModus && \(tile\.id === 'support' \|\| tile\.id === 'advanced'\)\) return null/);
  assert.match(dashboard, /data-testid="settings-simple-mode-footnote"/);
  assert.match(header, /cat\.id !== 'advanced' && cat\.id !== 'support'/);
  assert.match(header, /setEinfachModus\(!einfachModus\)/);
});

test('advanced actions remain present when teachers choose all settings', () => {
  assert.match(dashboard, /id: 'advanced' as SettingsCategory/);
  assert.match(dashboard, /id: 'support' as SettingsCategory/);
  assert.match(dashboard, /data-settings-destination=\{tile\.id\}/);
  assert.match(dashboard, /onClick=\{\(\) => onSelectCategory\(tile\.id\)\}/);
  assert.match(settings, /activeCategory === 'advanced'/);
  assert.match(settings, /activeCategory === 'support'/);
  assert.match(dashboard, /data-testid="settings-teamteaching-entry"/);
  assert.match(dashboard, /onClick=\{onOpenTeam\}/);
});

test('simple presentation does not modify classroom data or force cloud writes', () => {
  assert.doesNotMatch(dashboard, /\bsetApp\(|\bdeleteClass\(|\bpushSharedClass\(/);
  assert.doesNotMatch(dashboard, /\bfetch\(|localStorage\./);
  assert.match(settings, /einfachModus: val/);
});

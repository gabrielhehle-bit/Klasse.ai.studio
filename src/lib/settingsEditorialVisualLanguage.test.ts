import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const overview = readFileSync('src/components/settings/SettingsDashboard.tsx', 'utf8');
const header = readFileSync('src/components/settings/SettingsHeader.tsx', 'utf8');

test('Settings visual concept uses an editorial index instead of decorative AI-dashboard cards', () => {
  assert.match(overview, /data-testid="klassio-editorial-settings"/);
  assert.match(overview, /Dein Unterricht\. Deine Einstellungen\./);
  assert.match(overview, /border-t border-\[var\(--border\)\]/);
  assert.match(overview, /divide-y divide-\[var\(--border\)\]/);
  assert.doesNotMatch(overview, /bg-gradient-to-br|rounded-\[2rem\]|hover:shadow-md|group-hover:scale-105/);
  assert.doesNotMatch(overview, /initial=\{|animate=\{|transition=\{\{ delay:/);
});

test('All nine settings destinations and their dynamic status remain accessible', () => {
  for (const id of ['account', 'general', 'display', 'modules', 'sync', 'backup', 'help', 'support', 'advanced']) {
    assert.match(overview, new RegExp("id: '"+id+"'"));
    assert.match(header, new RegExp("id: '"+id+"'"));
  }
  assert.match(overview, /onSelectCategory\(entry\.id\)/);
  assert.match(overview, /disabledModulesCount > 0/);
  assert.match(overview, /hasActiveSync \?/);
  assert.match(overview, /hasDemoData \?/);
  assert.match(overview, /Löschfunktionen sind getrennt im Gefahrenbereich abgesichert/);
});

test('Settings headings and tabs follow the theme, remain keyboard accessible and preserve Einfachmodus', () => {
  assert.match(header, /aria-label="Einstellungsbereiche"/);
  assert.match(header, /aria-current=\{active \? 'page' : undefined\}/);
  assert.match(header, /role="switch" aria-checked=\{einfachModus\}/);
  assert.match(header, /setEinfachModus\(!einfachModus\)/);
  assert.match(header, /einfachModus \? 'Einfachmodus' : 'Alle Optionen'/);
  assert.match(header, /setActiveCategory\('overview'\)/);
  assert.match(header, /var\(--accent\)/);
  assert.doesNotMatch(header, /rounded-\[2rem\]|backdrop-blur|font-black uppercase tracking-wider/);
});

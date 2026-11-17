import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readComponent = (file: string) => readFileSync('src/components/' + file, 'utf8');
const palette = readFileSync('src/index.css', 'utf8');
const polish = readFileSync('src/ui-polish.css', 'utf8');
const sidebar = readComponent('Sidebar.tsx');
const topbar = readComponent('Topbar.tsx');
const hubs = ['KlasseHub.tsx', 'PlanungHub.tsx', 'LeistungenHub.tsx'].map(readComponent);
const settings = readComponent('settings/SettingsHeader.tsx');

test('Professional default keeps a restrained neutral palette while preserving user-selected themes', () => {
  const classic = palette.split('[data-style="classic_light"] {')[1]?.split('\n  }')[0] || '';
  assert.match(classic, /--bg: #f5f7f8;/);
  assert.match(classic, /--surface2: #f1f4f5;/);
  assert.match(classic, /--text: #1e2d34;/);
  assert.match(classic, /--accent: #116971;/);
  assert.match(classic, /--app-font: "Inter"/);
  assert.match(palette, /\[data-style="deep_dark"\]/);
  assert.match(palette, /\[data-style="soft_sage"\]/);
  assert.match(palette, /\[data-style="custom_theme"\]/);
  assert.match(polish, /--klassio-radius-area: 1rem/);
  assert.match(polish, /--klassio-radius-control: 0\.75rem/);
});

test('Sidebar has no decorative gradient and keeps clear selected-page navigation', () => {
  assert.doesNotMatch(sidebar, /Elegant Top Ambient Accent bar|bg-gradient-to-r from-accent/);
  assert.match(sidebar, /Schuljahr \{app\.schuljahr \|\| getCurrentSchuljahr\(\)\}/);
  assert.match(sidebar, /aria-current=\{currentPage === item\.id \? 'page' : undefined\}/);
  assert.match(sidebar, /bg-\[var\(--accent-soft\)\] text-\[var\(--text\)\] font-semibold/);
  assert.match(sidebar, /bg-\[var\(--accent\)\]"/);
  assert.match(sidebar, /aria-label="Klasse auswählen"/);
  assert.match(sidebar, /aria-expanded=\{showClassMenu\}/);
  assert.match(sidebar, /setShowClassMenu\(!showClassMenu\)/);
  assert.match(sidebar, /onClick=\{\(\) => \{\s*setPage\(item\.id\)/);
});

test('Topbar shows a readable page title without frosted glass or microscopically spaced breadcrumbs', () => {
  assert.match(topbar, /border-b border-\[var\(--border\)\] bg-\[var\(--surface\)\] px-3 py-2\.5/);
  assert.match(topbar, /className="flex min-w-0 flex-col leading-tight"/);
  assert.match(topbar, /truncate text-sm font-semibold text-\[var\(--text\)\]/);
  assert.match(topbar, /className="hidden truncate text-xs font-medium text-\[var\(--text2\)\] md:block"/);
  assert.match(topbar, /h-11 w-11 shrink-0 items-center justify-center/);
  assert.match(topbar, /data-account-sync-status=\{accountSyncStatus\}/);
  assert.match(topbar, /<SaveSyncStatus/);
  assert.match(topbar, /createManualBackup\(\)/);
  assert.match(topbar, /onMenuClick=\{onMenuClick\}/);
});

test('Module entry cards are consistent and never turn normal navigation into colorful tiles', () => {
  for (const source of hubs) {
    assert.match(source, /data-klassio-module-card/);
    assert.match(source, /min-h-28 items-start gap-3 rounded-xl border border-\[var\(--border\)\]/);
    assert.match(source, /rounded-lg border border-\[var\(--border\)\] bg-\[var\(--surface2\)\] text-\[var\(--text2\)\]/);
    assert.doesNotMatch(source, /group-hover:translate-x-0\.5/);
    assert.match(source, /<ChevronRight/);
  }
  assert.match(hubs[0], /onClick=\{\(\) => onOpen\(item\.id\)\}/);
  assert.match(hubs[1], /onClick=\{\(\) => onOpen\(item\.id\)\}/);
  assert.match(hubs[2], /onClick=\{\(\) => onOpen\(item\.id\)\}/);
});

test('Simple mode in settings describes its purpose without AI sparkle decoration', () => {
  assert.match(settings, /Einfachmodus/);
  assert.match(settings, /Nur wesentliche Optionen/);
  assert.match(settings, /role="switch"/);
  assert.match(settings, /aria-checked=\{einfachModus\}/);
  assert.match(settings, /<Sliders size=\{14\} aria-hidden="true"/);
  assert.doesNotMatch(settings, /<Sparkles size=\{12\}/);
});

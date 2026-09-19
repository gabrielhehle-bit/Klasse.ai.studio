import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const readSource = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

test('audit #1 keeps only the core areas plus pins directly visible by default', () => {
  const source = readSource('src/components/Sidebar.tsx');

  for (const id of ['dashboard', 'klasse', 'verhalten', 'planung', 'leistungen', 'cockpit', 'ki-helfer', 'tools']) {
    assert.ok(source.includes(`'${id}'`), `core module ${id} must remain configured`);
  }

  assert.ok(source.includes('CORE_MODULE_IDS.has(item.id) || sidebarPinned.includes(item.id)'));
  assert.ok(source.includes('showMorePages ? mainModules : defaultPrimaryModules'));
  assert.doesNotMatch(source, /PRIMARY_VISIBLE_COUNT/);
  assert.doesNotMatch(source, /mainModules\.slice\(0,/);
});

test('audit #1 keeps secondary routes available through Mehr and preserves active context', () => {
  const source = readSource('src/components/Sidebar.tsx');

  assert.ok(source.includes('const hiddenMainCount = Math.max(0, mainModules.length - defaultPrimaryModules.length)'));
  assert.ok(source.includes('const activeSecondaryModule = mainModules.find('));
  assert.ok(source.includes('`Mehr · ${activeSecondaryModule.label}`'));
  assert.ok(source.includes('Alle übrigen Bereiche findest du über „Mehr“.'));
});

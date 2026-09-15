import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..');
const components = join(src, 'components');

function read(path: string) {
  return readFileSync(path, 'utf8');
}

function dashboardTargets(source: string) {
  const targets = new Set<string>();
  const patterns = [
    /(?:setPage|onNavigate)\(\s*["']([^"']+)["']\s*\)/g,
    /linkPage:\s*["']([^"']+)["']/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) targets.add(match[1]);
  }
  return [...targets];
}

test('Heute/Dashboard only links to routes that exist in Klassio', () => {
  const app = read(join(src, 'App.tsx'));
  const renderStart = app.indexOf('const renderPage =');
  const renderEnd = app.indexOf('const getPageTitle =');
  assert.ok(renderStart >= 0 && renderEnd > renderStart, 'App routing section must be detectable');

  const routing = app.slice(renderStart, renderEnd);
  const validRoutes = new Set(
    [...routing.matchAll(/case\s+["']([^"']+)["']\s*:/g)].map(match => match[1]),
  );
  validRoutes.add('setup');
  validRoutes.add('setup_new');

  const files = [
    'Dashboard.tsx',
    'DashboardTodayOverview.tsx',
    'DashboardSimpleOverview.tsx',
  ];

  for (const file of files) {
    const source = read(join(components, file));
    for (const target of dashboardTargets(source)) {
      assert.equal(
        validRoutes.has(target),
        true,
        `${file} links to unknown page "${target}"`,
      );
    }
  }
});

test('known dead legacy dashboard route ids stay removed', () => {
  const dashboard = read(join(components, 'Dashboard.tsx'));
  const today = read(join(components, 'DashboardTodayOverview.tsx'));
  const combined = dashboard + '\n' + today;

  for (const deadRoute of ['einstellungen', 'geldsammlung', 'kalender']) {
    assert.equal(
      new RegExp(`["']${deadRoute}["']`).test(combined),
      false,
      `dead dashboard route "${deadRoute}" must not return`,
    );
  }

  assert.match(dashboard, /setPage\(["']settings["']\)/);
  assert.match(dashboard, /linkPage:\s*["']orga["']/);
  assert.match(today, /onNavigate\(["']planung["']\)/);
  assert.match(today, /onNavigate\(["']orga["']\)/);
});

test('compact Heute view remains the default for a fresh browser profile', () => {
  const dashboard = read(join(components, 'Dashboard.tsx'));
  assert.match(
    dashboard,
    /saved\s*!==\s*null\s*\?\s*saved\s*===\s*["']true["']\s*:\s*true/,
  );
});

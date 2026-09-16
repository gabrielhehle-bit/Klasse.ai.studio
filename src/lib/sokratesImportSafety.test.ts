import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./sokratesParser.ts', import.meta.url), 'utf8');

test('Sokrates PDF import does not depend on a third-party PDF worker CDN', () => {
  assert.match(source, /pdf\.worker\.min\.mjs\?url/);
  assert.doesNotMatch(source, /cdnjs\.cloudflare\.com|unpkg\.com|jsdelivr\.net/);
});

test('Sokrates import does not invent missing core student fields', () => {
  assert.match(source, /let besuchsjahr = '';/);
  assert.match(source, /let staatsbuergerschaft = '';/);
  assert.match(source, /let erstsprache = '';/);
  assert.doesNotMatch(source, /s\.staatsbuergerschaft \|\| 'Österreich'/);
  assert.doesNotMatch(source, /s\.erstsprache \|\| 'Deutsch'/);
  assert.doesNotMatch(source, /s\.besuchsjahr \|\| '1'/);
});

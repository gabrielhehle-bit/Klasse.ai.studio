import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '..', 'components', 'PlanungHub.tsx'), 'utf8');

test('planning hub separates core planning from preparation without duplicate shortcut grid', () => {
  assert.match(source, /Kernplanung/);
  assert.match(source, /Vorbereitung & Weitergabe/);
  assert.doesNotMatch(source, /grid-cols-2 gap-3 rounded/);
  assert.equal((source.match(/<PlanningCard/g) || []).length, 2);
});

test('planning hub keeps every agreed planning destination', () => {
  for (const id of [
    'wochenplanung',
    'jahresplanung',
    'planungszentrale',
    'stunden',
    'materialien',
    'canva',
    'vertretung',
  ]) {
    assert.match(source, new RegExp(`id:\\s*['"]${id}['"]`));
  }
  assert.doesNotMatch(source, /id:\\s*['"]uebergabemappe['"]/);
});

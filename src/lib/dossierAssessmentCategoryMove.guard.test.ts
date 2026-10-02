import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/lib/dossierAssessmentWrite.ts', 'utf8');

test('Kategorie-Wechsel nutzt freien Zielplatz und räumt die Quelle auf', () => {
  assert.match(source, /firstAvailableAssessmentIndex/);
  assert.match(source, /sourceList\[originalColIndex\] = null/);
  assert.match(source, /cloneMetaList\(colLabels, originalCategory\)\[originalColIndex\] = null/);
  assert.match(source, /cloneMetaList\(maxPointsMeta, sourceKey\)\[originalColIndex\] = null/);
});

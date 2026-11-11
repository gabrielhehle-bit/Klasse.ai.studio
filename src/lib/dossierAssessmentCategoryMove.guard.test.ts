import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/lib/dossierAssessmentWrite.ts', 'utf8');

test('Kategorie-Wechsel reserviert einen sicheren Klassenspalten-Index und räumt nur die eigene Quelle auf', () => {
  // The old firstAvailableAssessmentIndex could reuse a different pupil's
  // assessment column. New assessment destinations must be allocated globally.
  assert.match(source, /nextDossierAssessmentColumnIndex\(state, request\.fach, request\.category\)/);
  assert.match(source, /sourceList\[originalColIndex\] = null/);
  assert.match(source, /if \(isCategoryMove && !sourceNeededByAnotherRecord\)/);
  assert.match(source, /cloneMetaList\(colLabels, metaCategory\(originalCategory\)\)\[originalColIndex\] = null/);
  assert.match(source, /!sourceNeededByAnotherRecord && \(mode === 'points' \|\| hasMaxPointsMeta\)/);
  assert.match(source, /Object\.values\(state\.noten \|\| \{\}\)\.flatMap/);
  assert.doesNotMatch(source, /\? firstAvailableAssessmentIndex\(existingTargetList\)/);
});

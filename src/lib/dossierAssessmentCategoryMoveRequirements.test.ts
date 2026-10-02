import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dossier = readFileSync('src/components/dossier/DossierLeistungen.tsx', 'utf8');

test('Dossier merkt beim Bearbeiten die ursprüngliche Kategorie und Position', () => {
  assert.match(dossier, /originalCategory\?: 'sa' \| 'lzk' \| 'wp' \| 'aufgaben'/);
  assert.match(dossier, /originalColIndex\?: number/);
  assert.match(dossier, /originalCategory: item\.category as any/);
  assert.match(dossier, /originalColIndex: item\.colIndex \?\? 0/);
});

test('Dossier gibt die ursprüngliche Position beim Speichern an die Schreiblogik weiter', () => {
  assert.match(dossier, /originalCategory,/);
  assert.match(dossier, /originalColIndex,/);
  assert.match(dossier, /writeDossierAssessment\(prev, \{/);
});

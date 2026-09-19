import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { materialCollections, normalizeMaterialCollections } from './materialCollections';

test('old JSON materials remain valid and gain an empty collection read projection', () => {
  const legacy = { id: 'old-pdf', titel: 'Bild', typ: 'datei', dateiInhalt: 'data:application/pdf;base64,AAAA', materialIds: ['old-pdf'] };
  const roundtrip = JSON.parse(JSON.stringify(legacy));
  assert.deepEqual(roundtrip, legacy);
  assert.deepEqual(normalizeMaterialCollections(roundtrip.sammlungen), []);
  assert.deepEqual(materialCollections([roundtrip]), []);
});

test('one source item can be assigned to several named collections without copying its file', () => {
  const items = [{ id: 'first', sammlungen: ['MINT', 'Mathe 1', 'MINT'] }, { id: 'second', sammlungen: ['Mathe 1'] }];
  assert.deepEqual(materialCollections(items), ['Mathe 1', 'MINT']);
  assert.equal(items.length, 2);
  assert.deepEqual(normalizeMaterialCollections([' MINT ', 'mint', '  Mathe   1 ', '', 5]), ['MINT', 'Mathe 1']);
});

test('material library retains links, file contents, transfer and prior drafts', () => {
  const source = readFileSync('src/components/Materialbibliothek.tsx', 'utf8');
  assert.match(source, /onSave\(finalItem\)/);
  assert.match(source, /removeMaterialReferencesFromWeeklyPlan/);
  assert.match(source, /removeMaterialReferencesFromClasses/);
  assert.match(source, /setPage\('stunden'\)/);
  assert.match(source, /MaterialToWeekPlanModal/);
  assert.match(source, /Sammlungen \(optional\)/);
  assert.match(source, /normalizeMaterialCollections\(collectionInput\.split\(','\)\)/);
  assert.match(source, /aria-label="Persönliche Sammlung auswählen"/);
  assert.doesNotMatch(source, /Verfügbar sind insgesamt 5 MB/);
  assert.doesNotMatch(source, /Mit Canva gestalten/);
});

test('Canva entry is under tools, library contains a single main add action', () => {
  const tools = readFileSync('src/components/ToolsHub.tsx', 'utf8');
  const planning = readFileSync('src/components/PlanungHub.tsx', 'utf8');
  const library = readFileSync('src/components/Materialbibliothek.tsx', 'utf8');
  assert.match(tools, /id: 'canva'/);
  assert.doesNotMatch(planning, /id: 'canva'/);
  assert.match(library, /Material hinzufügen/);
  assert.doesNotMatch(library, /Neues Material<\/span>/);
});

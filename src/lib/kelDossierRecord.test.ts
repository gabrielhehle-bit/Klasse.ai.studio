import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findActiveKelDossierRecordIndex } from './kelDossierRecord';

type Meeting = { id: string; schuelerId: string; schuljahr?: string; datum?: string };
const meetings: Meeting[] = [
  { id: 'old', schuelerId: 'kind-a', schuljahr: '2025/26', datum: '2026-06-03' },
  { id: 'new-a', schuelerId: 'kind-a', schuljahr: '2026/27', datum: '2026-09-10' },
  { id: 'other-child', schuelerId: 'kind-b', schuljahr: '2026/27', datum: '2026-11-10' },
  { id: 'newest-a', schuelerId: 'kind-a', schuljahr: '2026/27', datum: '2026-11-05' },
];

test('KEL dossier chooses the most recent dated meeting of the child within the current school year', () => {
  assert.equal(findActiveKelDossierRecordIndex(meetings, 'kind-a', '2026/27'), 3);
  assert.equal(findActiveKelDossierRecordIndex(meetings, 'kind-a', '2025/26'), 0);
  assert.equal(findActiveKelDossierRecordIndex(meetings, 'kind-b', '2026/27'), 2);
});

test('KEL dossier never selects a previous year or another child as a fallback', () => {
  assert.equal(findActiveKelDossierRecordIndex(meetings, 'kind-a', '2027/28'), -1);
  assert.equal(findActiveKelDossierRecordIndex(meetings, 'kind-c', '2026/27'), -1);
  assert.equal(findActiveKelDossierRecordIndex(undefined, 'kind-a', '2026/27'), -1);
});

test('KEL dossier keeps unassigned legacy meetings separate from school-year records', () => {
  const records: Meeting[] = [
    { id: 'legacy', schuelerId: 'kind-a' },
    { id: 'assigned', schuelerId: 'kind-a', schuljahr: '2026/27' },
  ];
  assert.equal(findActiveKelDossierRecordIndex(records, 'kind-a', '2026/27'), 1);
  assert.equal(findActiveKelDossierRecordIndex(records, 'kind-a', ''), 0);
});

test('KEL dossier selection is deterministic for missing and equal dates and does not mutate input', () => {
  const records: Meeting[] = [
    { id: 'first', schuelerId: 'a', schuljahr: '2026/27' },
    { id: 'second', schuelerId: 'a', schuljahr: '2026/27' },
  ];
  const before = structuredClone(records);
  assert.equal(findActiveKelDossierRecordIndex(records, 'a', '2026/27'), 0);
  assert.deepEqual(records, before);
});

test('KEL quick editing never rewrites the date or ratings of older meetings', () => {
  const source = readFileSync('src/components/dossier/DossierKELReflexion.tsx', 'utf8');
  assert.match(source, /findActiveKelDossierRecordIndex\(records, student\.id, app\.schuljahr\)/);
  assert.match(source, /findActiveKelDossierRecordIndex\(records, student\.id, prev\.schuljahr\)/);
  assert.match(source, /recordIndex === index/);
  assert.doesNotMatch(source, /if \(record\.schuelerId !== student\.id\) return record/);
  assert.match(source, /Preserve the original meeting date/);
  assert.match(source, /Frühere KEL-Gespräche bleiben unverändert/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dossier = readFileSync('src/components/dossier/DossierLeistungen.tsx', 'utf8');

test('Schülerdossier: Fachsterne sind in Übersicht und Fachdetail sichtbar', () => {
  assert.match(dossier, /getStudentSubjectParticipationSummary/);
  assert.match(dossier, /Mitarbeit in \$\{s\.fach\}/);
  assert.match(dossier, /Fachsterne/);
  assert.match(dossier, /Letzte Änderungen/);
  assert.match(dossier, /s\.participation\.recent\.map/);
  assert.match(dossier, /s\.participation\.total === 1 \? 'Fachstern' : 'Fachsterne'/);
});

test('Schülerdossier: Mitarbeit bleibt dieselbe Datenquelle wie die Notenmappe', () => {
  assert.match(dossier, /Derselbe Fachstand, der auch in der Notenmappe geführt wird/);
  assert.match(dossier, /participation: SubjectParticipationSummary/);
});

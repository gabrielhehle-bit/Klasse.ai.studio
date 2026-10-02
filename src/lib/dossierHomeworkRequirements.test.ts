import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dossier = readFileSync('src/components/dossier/DossierLeistungen.tsx', 'utf8');

test('Schülerdossier: Hausübungen sind in Fächerübersicht und Fachdetail sichtbar', () => {
  assert.match(dossier, /getStudentHomeworkSummary/);
  assert.match(dossier, /Hausübungen in \$\{s\.fach\}/);
  assert.match(dossier, /Fehlende HÜ/);
  assert.match(dossier, /nicht erfasst/);
  assert.match(dossier, /Derselbe HÜ-Stand und dieselben Regeln wie in der Notenmappe/);
});

test('Schülerdossier: Bewertungs- und Dokumentationsmodus bleiben unterscheidbar', () => {
  assert.match(dossier, /Nur dokumentiert/);
  assert.match(dossier, /In Bewertung aktiv/);
  assert.match(dossier, /rechnerisch Note/);
  assert.match(dossier, /s\.homework\.percent/);
});

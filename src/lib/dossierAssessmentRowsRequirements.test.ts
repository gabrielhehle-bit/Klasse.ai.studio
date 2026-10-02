import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dossier = readFileSync('src/components/dossier/DossierLeistungen.tsx', 'utf8');

test('Leistungsnachweise: Kategorien sind visuell unterscheidbar und kompakt beschriftet', () => {
  assert.match(dossier, /data-assessment-category=\{cat\.key\}/);
  assert.match(dossier, /Schularbeit \/ Test/);
  assert.match(dossier, /Lernzielkontrolle/);
  assert.match(dossier, /Wochenplan/);
  assert.match(dossier, /Hausübung \/ Aufgabe/);
  assert.match(dossier, /categoryTone/);
  assert.match(dossier, /categoryIcon/);
});

test('Leistungsnachweise: einzelne Zeilen sind kompakt und Bearbeiten ist direkt sichtbar', () => {
  assert.match(dossier, /data-assessment-row/);
  assert.match(dossier, />Bearbeiten</);
  assert.match(dossier, /Klick zum Bearbeiten/);
  assert.match(dossier, /line-clamp-1/);
  assert.match(dossier, /handleOpenEditModal\(item, s\.fach\)/);
});

test('Leistungsnachweise: Punkte und optionale Prozentanzeige bleiben gemeinsam sichtbar', () => {
  assert.match(dossier, /item\.score/);
  assert.match(dossier, /item\.maxScore/);
  assert.match(dossier, /showPointsPercent/);
  assert.match(dossier, /item\.percent\.toLocaleString/);
});

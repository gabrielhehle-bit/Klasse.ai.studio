import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const overview = readFileSync('src/components/dossier/DossierUebersicht.tsx', 'utf8');
const dossier = readFileSync('src/components/StudentDossier.tsx', 'utf8');
const observations = readFileSync('src/components/dossier/DossierBeobachtungenVerlauf.tsx', 'utf8');
const support = readFileSync('src/components/dossier/DossierFoerderung.tsx', 'utf8');

test('Dossierübersicht: vier kompakte Karten ohne gemischten Notenschnitt und ohne erfundene Förderdiagnose', () => {
  for (const label of ['Anwesenheit', 'Lernen', 'Beobachtungen', 'Förderung']) {
    assert.match(overview, new RegExp(`label: '${label}'`));
  }
  assert.match(overview, /assessedSubjects\.length/);
  assert.doesNotMatch(overview, /Notenschnitt/);
  assert.doesNotMatch(overview, /Präsenz unauffällig/);
  assert.doesNotMatch(overview, /Kein Förderbedarf/);
  assert.match(overview, /Noch keine Ziele erfasst/);
});

test('Dossierübersicht: Notenpunkte und Prozentwerte bleiben je Fach getrennt', () => {
  assert.match(overview, /mode === 'percent'/);
  assert.match(overview, /mode === 'points'/);
  assert.match(overview, /mode === 'grades' && endnote/);
  assert.match(overview, /assessedSubjects\.slice\(0, 4\)/);
  assert.match(overview, /Noch keine Bewertungen dokumentiert/);
});

test('Dossierübersicht: aktive Ziele mit beiden vorhandenen Statusschreibweisen; Abschluss im Originaldatensatz', () => {
  assert.match(overview, /String\(goal\.status\) === 'in_arbeit'/);
  assert.match(overview, /goal\.status === 'in Arbeit'/);
  assert.match(overview, /goal\.id === goalId/);
  assert.match(overview, /status: 'erreicht'/);
  assert.match(overview, /Foerderziel/);
  assert.match(overview, /setApp\(previous =>/);
});

test('Dossierübersicht: Eintrag öffnet bestehende Erfassungsformulare für das gewählte Kind', () => {
  assert.match(overview, /\+ Eintrag/);
  assert.match(dossier, /onQuickEntry=\{openOverviewQuickEntry\}/);
  assert.match(dossier, /initialQuickNoteCategory=\{pendingQuickEntry === 'parent' \? 'Eltern'/);
  assert.match(dossier, /initialAddGoal=\{pendingQuickEntry === 'goal'\}/);
  assert.match(dossier, /initialFocusStrength=\{pendingQuickEntry === 'strength'\}/);
  assert.match(observations, /useState\(Boolean\(initialQuickNoteCategory\)\)/);
  assert.match(support, /useState\(Boolean\(initialAddGoal\)\)/);
  assert.match(support, /strengthInputRef\.current\?\.focus/);
});

test('Dossierübersicht: fünf Hauptbereiche, Kinderwechsel, KEL, PDF, Druck und Fokus bleiben verfügbar', () => {
  assert.match(dossier, /getFilteredMainAreas\(\)\.map/);
  assert.match(dossier, /onStudentChange/);
  assert.match(dossier, /KEL für Eltern/);
  assert.match(dossier, /Dossier \(PDF\)/);
  assert.match(dossier, /setPage\?\.\('drucken'\)/);
  assert.match(dossier, /dossierFocusMode: true/);
  assert.match(overview, /Letzte Entwicklungen/);
  assert.match(overview, /Weiter beobachten/);
});
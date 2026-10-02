import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const overview = readFileSync('src/components/dossier/DossierUebersicht.tsx', 'utf8');
const dossier = readFileSync('src/components/StudentDossier.tsx', 'utf8');
const observations = readFileSync('src/components/dossier/DossierBeobachtungenVerlauf.tsx', 'utf8');
const support = readFileSync('src/components/dossier/DossierFoerderung.tsx', 'utf8');

test('Dossierübersicht: Diagramme ersetzen Förderkarten und gemischte Gesamtnoten', () => {
  assert.match(overview, /Alle Fächer auf einen Blick/);
  assert.match(overview, /Verhalten, Befinden & Anwesenheit/);
  assert.match(overview, /getAssessmentMode/);
  assert.match(overview, /berechne/);
  assert.match(overview, /Noch keine Bewertung/);
  assert.doesNotMatch(overview, /Förderbedarf|Kein Förderbedarf|Präsenz unauffällig/);
});

test('Dossierübersicht: Mitarbeit und Hausübungen sind vor der Vertiefung direkt sichtbar', () => {
  assert.match(overview, /Kernüberblick/);
  assert.match(overview, /Mitarbeit & Hausübungen/);
  assert.match(overview, /Fachsterne aus dem Unterrichtsmodus/);
  assert.match(overview, /Fächer mit HÜ-Daten/);
  assert.match(overview, /todayHasDetailedAbsence/);
  assert.match(overview, /getStudentSubjectParticipationSummary/);
  assert.match(overview, /getStudentHomeworkSummary/);
  assert.match(overview, /Fachsterne/);
  assert.match(overview, /fehlende HÜ/);
  assert.match(overview, /Mitarbeit noch nicht erfasst/);
  assert.match(overview, /HÜ noch nicht erfasst/);
  assert.ok(overview.indexOf('Mitarbeit & Hausübungen') < overview.indexOf('Verhalten, Befinden & Anwesenheit'));
});

test('Dossierübersicht: Verläufe sind kompakt, einheitlich und ohne doppelte Großstatus aufgebaut', () => {
  assert.match(overview, />Verläufe</);
  assert.match(overview, /data-dossier-trend-card="behavior"/);
  assert.match(overview, /data-dossier-trend-card="mood"/);
  assert.match(overview, /data-dossier-trend-card="attendance"/);
  assert.match(overview, /['recent','6 Wochen']/);
  assert.match(overview, /['year','Schuljahr']/);
  assert.match(overview, /Details erscheinen beim Darüberfahren/);
  assert.match(overview, /Letzter Eintrag:/);
  assert.doesNotMatch(overview, /Letzte 6 Wochen|Gesamtes Schuljahr/);
});

test('Dossierübersicht: Eintrag öffnet bestehende Erfassungsformulare für das gewählte Kind', () => {
  assert.match(overview, /Eintrag/);
  assert.match(dossier, /onQuickEntry=\{openOverviewQuickEntry\}/);
  assert.match(dossier, /initialQuickNoteCategory=\{pendingQuickEntry === 'parent' \? 'Eltern'/);
  assert.match(dossier, /initialAddGoal=\{pendingQuickEntry === 'goal'\}/);
  assert.match(dossier, /initialFocusStrength=\{pendingQuickEntry === 'strength'\}/);
  assert.match(observations, /useState\(Boolean\(initialQuickNoteCategory\)\)/);
  assert.match(support, /useState\(Boolean\(initialAddGoal\)\)/);
  assert.match(support, /strengthInputRef\.current\?\.focus/);
});

test('Dossierübersicht: vier Hauptbereiche, Kinderwechsel, KEL, PDF, Druck und Fokus bleiben verfügbar', () => {
  assert.match(dossier, /getFilteredMainAreas\(\)\.map/);
  assert.match(dossier, /onStudentChange/);
  assert.match(dossier, /KEL für Eltern/);
  assert.match(dossier, /Dossier \(PDF\)/);
  assert.match(dossier, /setPage\?\.\('drucken'\)/);
  assert.match(dossier, /dossierFocusMode: true/);
  assert.match(overview, /Aktuelle Notizen/);
  assert.match(overview, /onSubjectSelect/);
});
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dossier = readFileSync('src/components/StudentDossier.tsx', 'utf8');
const overview = readFileSync('src/components/dossier/DossierUebersicht.tsx', 'utf8');
const kel = readFileSync('src/components/KELPresentation.tsx', 'utf8');

test('Schülerdossier hat nur noch eine kompakte Schülernavigation und eine Hauptnavigation', () => {
  assert.match(dossier, /COMPACT STUDENT NAVIGATION/);
  assert.match(dossier, /id="student-switcher"/);
  assert.match(dossier, /aria-label="Schülerdossier-Hauptbereiche"/);
  assert.match(dossier, /flex gap-2 overflow-x-auto pb-1 scrollbar-none/);
  assert.doesNotMatch(dossier, /SIDEBAR NAVIGATION/);
  assert.doesNotMatch(dossier, /grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5/);
});

test('Dossierübersicht zeigt vier kompakte Arbeitskarten ohne überladene Fachliste', () => {
  assert.match(overview, /grid grid-cols-2 gap-2 lg:grid-cols-4/);
  assert.match(overview, /quickCards\.map\(card =>/);
  assert.match(overview, /assessedSubjects\.slice\(0, 4\)/);
  assert.doesNotMatch(overview, /xl:grid-cols-6/);
});

test('KEL shows one clear preparation/presentation switch with an explicit choice of visible content', () => {
  assert.match(kel, /Ein Gespräch, keine Datenshow/);
  assert.match(kel, /setView\('prepare'\)/);
  assert.match(kel, /setView\('slides'\)/);
  assert.match(kel, /Weitere Folien wählen/);
  assert.match(kel, /Was soll im Gespräch sichtbar sein\?/);
  assert.match(kel, /Präsentieren/);
  assert.match(kel, /Auswahl für dieses KEL-Gespräch speichern/);
  assert.doesNotMatch(kel, /KEL MODERATIONS-MODUS|PRESENTATION MODE CONTROLLER/);
});

test('KEL retains real presentation, per-student opt-in grades, PPTX, dossier PDF and timer', () => {
  for (const needle of [
    'savePresentationSelection', 'individualGrades', 'chosenAssessments',
    'exportPowerPoint', 'exportSchuelerPDF(student.id, app)',
    'setSelectedLang', 'setTimerActive', 'setTimerSeconds',
    'setIsFullscreen(true)', 'setShowConfig(true)',
    'kelPraesentationAuswahl',
  ]) {
    assert.ok(kel.includes(needle), 'KEL-Funktion fehlt: ' + needle);
  }
  assert.match(kel, /aria-label=.*Folie/);
  assert.match(kel, /Zurück/);
  assert.match(kel, /Weiter/);
});

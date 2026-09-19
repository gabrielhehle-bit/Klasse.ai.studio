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

test('KEL hat eine einzige klare Kommandozeile und keine doppelte Modussteuerung im Präsentationsbereich', () => {
  assert.match(kel, /CLEAN KEL COMMAND BAR/);
  assert.match(kel, /\n\s*Folien\s*\n/);
  assert.match(kel, /\n\s*Gesamtübersicht\s*\n/);
  assert.match(kel, /Folien auswählen/);
  assert.match(kel, /Präsentieren/);
  assert.match(kel, /<summary[^>]*>\s*Mehr\s*<\/summary>/s);
  assert.match(kel, /ONE compact presentation status line/);
  assert.doesNotMatch(kel, /KEL MODERATIONS-MODUS/);
  assert.doesNotMatch(kel, /PRESENTATION MODE CONTROLLER/);
});

test('KEL behält alle wesentlichen Funktionen trotz vereinfachter Oberfläche', () => {
  for (const needle of [
    "setKelMode('einfach')",
    "setKelMode('experte')",
    'setShowConfigDrawer(true)',
    'exportPowerPoint',
    'exportSchuelerPDF(student.id, app)',
    'setSelectedLang',
    'setTimerActive',
    'setTimerSeconds',
    'setIsFullscreen(true)',
    "setPresentationView('dossier')",
  ]) {
    assert.ok(kel.includes(needle), `KEL-Funktion fehlt: ${needle}`);
  }
  assert.match(kel, /aria-label="KEL-Folie auswählen"/);
  assert.match(kel, /Zurück/);
  assert.match(kel, /Weiter/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dossier = readFileSync('src/components/StudentDossier.tsx','utf8');
const observations = readFileSync('src/components/dossier/DossierBeobachtungenVerlauf.tsx','utf8');
const charts = readFileSync('src/components/dossier/DossierObservationCharts.tsx','utf8');

test('Dossier actions are available as a consistent accessible phone menu', () => {
  assert.match(dossier, /data-dossier-actions-menu/);
  assert.match(dossier, /aria-label="Dossieraktionen öffnen"/);
  assert.match(dossier, /<MoreHorizontal size=\{20\}/);
  assert.match(dossier, /max-h-\[70dvh\]/);
  assert.match(dossier, /min-h-11 w-full items-center rounded-xl/);
  assert.match(dossier, /exportSchuelerPDF\(student\.id, app\)/);
  assert.match(dossier, /setPresentationModeActive\(true\)/);
  assert.match(dossier, /activePrintTemplate: 'kel_elternblatt'/);
  assert.match(dossier, /activePrintTemplate: 'schuelerprofil'/);
  assert.match(dossier, /dossierFocusMode:!prev\.dossierFocusMode/);
});

test('Observation navigation keeps all existing areas and announces selection', () => {
  assert.match(observations, /data-dossier-observations-toolbar/);
  assert.match(observations, /role="tablist" aria-label="Beobachtungsbereiche"/);
  assert.match(observations, /aria-selected=\{\(activeSubSection === 'verhalten' \|\| activeSubSection === 'anwesenheit'\)\}/);
  assert.match(observations, /aria-selected=\{activeSubSection === 'beobachtungen'\}/);
  assert.match(observations, /aria-selected=\{activeSubSection === 'kel'\}/);
  assert.match(observations, /min-h-11 shrink-0 items-center/);
  assert.match(observations, /<DossierObservationCharts student=\{student\}/);
  assert.match(observations, /<DossierKELReflexion student=\{student\}/);
});

test('Observation entry fields are labeled, finger-sized and do not change note storage', () => {
  assert.match(observations, /data-dossier-observation-editor/);
  for (const field of ['text','category','context','day','kind']) {
    assert.match(observations, new RegExp('htmlFor="dossier-observation-' + field + '"'));
    assert.match(observations, new RegExp('id="dossier-observation-' + field + '"'));
  }
  assert.match(observations, /type="search"\s+aria-label="Beobachtungen durchsuchen"/);
  assert.match(observations, /aria-label="Beobachtungen nach Kategorie filtern"/);
  assert.match(observations, /aria-label="Beobachtungseingabe schließen"/);
  assert.match(observations, /aria-label="Beobachtung löschen"/);
  assert.match(observations, /min-h-11 min-w-11 items-center/);
  assert.match(observations, /logObservation\(\s*setApp,/);
  assert.match(observations, /notes: \(prev\.notes \|\| \[\]\)\.map\(patch\)/);
  assert.match(observations, /journal: \(prev\.journal \|\| \[\]\)\.map\(patch\)/);
  assert.match(observations, /notizen: \(prev\.notizen \|\| \[\]\)\.map\(patch\)/);
  assert.match(observations, /if \(confirm\('Möchten Sie diese Beobachtung wirklich entfernen\?'\)\)/);
});

test('Dossier charts preserve real dated observations, existing routes and print-safe data', () => {
  assert.match(charts, /getDossierObservationStats\(app,student\.id,period\)/);
  assert.match(charts, /role="group" aria-label="Beobachtungszeitraum"/);
  assert.match(charts, /aria-pressed=\{period===key\}/);
  assert.match(charts, /aria-pressed=\{detail===key\}/);
  assert.match(charts, /data-observation-chart-scroll="mood"/);
  assert.match(charts, /data-observation-behavior-editor/);
  assert.match(charts, /data-observation-behavior-save/);
  assert.match(charts, /setPage\('verhalten'\)/);
  assert.match(charts, /setPage\('anwesenheit'\)/);
  assert.match(charts, /min-h-11/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { logObservation } from './utils';

test('Fachbezogene Notiz bleibt einem Kind und seinem Bereich zugeordnet', () => {
  let state: any = { notes: [], journal: [], schueler: [{ id: 'test-kind-1' }] };
  const setApp = (update: (before: any) => any) => { state = update(state); };
  logObservation(setApp, 'test-kind-1', 'Übt das Lesen', 'Notiz', 'Notizen-Hauptbereich', undefined, {
    fach: 'Deutsch', teilbereich: 'Lesen',
  });
  assert.equal(state.notes.length, 1);
  assert.equal(state.notes[0].schuelerId, 'test-kind-1');
  assert.equal(state.notes[0].fach, 'Deutsch');
  assert.equal(state.notes[0].teilbereich, 'Lesen');
  assert.equal(state.journal[0].id, state.notes[0].id);

  logObservation(setApp, undefined, 'Allgemeine Klassennotiz', 'Journal',
    'Notizen-Hauptbereich', undefined, { fach: 'Deutsch', teilbereich: 'Schreiben' });
  // New entries are PREPENDED, not appended, in the shared chronicle.
  assert.equal(state.notes[0].fach, undefined,
    'Eine allgemeine Notiz darf kein vorher gewähltes Kinder-Fach erben.');
  assert.equal(state.notes[0].teilbereich, undefined);
});

test('Wochenplanung startet aktuell, ohne Unterrichtsplan oder Noten zu überschreiben', () => {
  const source = readFileSync('src/components/WeeklyPlan.tsx', 'utf8');
  assert.match(source, /const actualKW = getKW\(actualToday\)/);
  assert.match(source, /setApp\(previous => previous\.currentKW === actualKW/);
  assert.match(source, /\{ \.\.\.previous, currentKW: actualKW \}/);
  assert.match(source, /\}, \[\]\);/);
});

test('Eigene Lernziele werden je Kind verschlüsselt gespeichert und beim Bearbeiten nicht neu identifiziert', () => {
  const source = readFileSync('src/components/StudentLernziele.tsx', 'utf8');
  assert.match(source, /pupil\.id !== schuelerId/);
  assert.match(source, /manuelleLernziele/);
  assert.match(source, /existing\?\.id \|\|/);
  assert.match(source, /current\.map\(item => item\.id === existing\.id \? goal : item\)/);
  assert.match(source, /Eigenes Lernziel bearbeiten/);
});

test('Notenmappe und alle Schülerdossier-Ansichten verwenden ersten Bucket als ganzes Schuljahr', () => {
  const sources = [
    'src/components/Gradebook.tsx',
    'src/components/GradeOverview.tsx',
    'src/components/LeistungsAuswertungen.tsx',
    'src/components/StudentDossier.tsx',
    'src/components/dossier/DossierLeistungen.tsx',
    'src/components/dossier/DossierElternReport.tsx',
    'src/components/dossier/DossierLernzielErlaeuterung.tsx',
    'src/components/dossier/DossierErlaeuterungsmatrix.tsx',
    'src/components/VerbalAssessment.tsx',
    'src/components/KELPresentation.tsx',
  ];
  for (const path of sources) {
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(source, />\s*(?:1\.|2\.)\s*(?:Semester|Sem\.)/,
      `${path}: teacher-visible semester control remains`);
    assert.doesNotMatch(source, /id="gradebook-semester"|id="feedback-period"|aria-label="Semester für Elternbericht auswählen"/,
      `${path}: obsolete semester selector remains`);
  }
  const gradebook = readFileSync('src/components/Gradebook.tsx', 'utf8');
  const dossier = readFileSync('src/components/StudentDossier.tsx', 'utf8');
  const overview = readFileSync('src/components/GradeOverview.tsx', 'utf8');
  const criteria = readFileSync('src/components/dossier/DossierErlaeuterungsmatrix.tsx', 'utf8');
  const tracker = readFileSync('src/components/LernzielTracker.tsx', 'utf8');
  assert.match(gradebook, /const sem: '1' \| '2' = '1';/);
  assert.match(dossier, /const sem: '1' \| '2' = '1';/);
  assert.match(overview, /useState<'1' \| '2' \| 'combined'>\('1'\)/);
  assert.match(criteria, /setSemester\('1'\)/);
  assert.match(tracker, /const selectedSemester: "1" \| "2" = "1";/);
  // The change is presentational and write-path based: NEVER erase the old
  // second bucket from an encrypted backup or overwrite it on login.
  assert.doesNotMatch(gradebook, /delete\s+.*\['2'\]/);
  assert.doesNotMatch(dossier, /delete\s+.*\['2'\]/);
});

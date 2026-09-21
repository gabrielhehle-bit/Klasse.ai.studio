import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { faecherFuerKlasse, fachVorschlaege, SEK1_FACHVORSCHLAEGE } from './sek1Subjects';

test('VS-Legacy bleibt unverändert und Sek-I-Fächer bleiben klassenbezogen', () => {
  assert.ok(faecherFuerKlasse({}).includes('Sachunterricht'));
  assert.deepEqual(faecherFuerKlasse({schulart:'mittelschule'}), []);
  assert.deepEqual(faecherFuerKlasse({schulart:'ahs_unterstufe',faecher:['Physik','Deutsch','Physik']}), ['Physik','Deutsch']);
  assert.ok(fachVorschlaege('mittelschule').includes('Digitale Grundbildung'));
  assert.ok(fachVorschlaege('ahs_unterstufe').includes('Geschichte und Politische Bildung'));
  assert.ok(!SEK1_FACHVORSCHLAEGE.includes('Sachunterricht' as never));
});

test('Sek-I-Notenmappe, Dossier und Druckzentrum zeigen eigene Fächer ohne VS-Pflichtfächer', () => {
  const gradebook = readFileSync('src/components/Gradebook.tsx','utf8');
  const dossier = readFileSync('src/components/StudentDossier.tsx','utf8');
  const overview = readFileSync('src/components/GradeOverview.tsx','utf8');
  const print = readFileSync('src/components/PrintCenter.tsx','utf8');
  const setup = readFileSync('src/components/SetupWizardCore.tsx','utf8');
  const gradeUtils = readFileSync('src/lib/GradeUtils.ts','utf8');
  assert.match(gradebook, /faecherFuerKlasse\(app\)/);
  assert.match(dossier, /faecherFuerKlasse\(app\)/);
  assert.match(overview, /faecherFuerKlasse\(app\)/);
  assert.match(print, /faecherFuerKlasse\(app\)/);
  assert.match(setup, /fachVorschlaege\(schulart\)/);
  assert.match(gradeUtils, /secondary \? 0 :/);
});

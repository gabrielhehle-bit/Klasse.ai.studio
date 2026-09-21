import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const studentList = readFileSync('src/components/StudentList.tsx', 'utf8');
const dossier = readFileSync('src/components/StudentDossier.tsx', 'utf8');
const dossierHub = readFileSync('src/components/StudentDossierHub.tsx', 'utf8');
const stammdaten = readFileSync('src/components/dossier/DossierStammdaten.tsx', 'utf8');
const developmentLists = readFileSync('src/components/dossier/DossierDevelopmentLists.tsx', 'utf8');
const sidebar = readFileSync('src/components/Sidebar.tsx', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const appState = readFileSync('src/lib/appState.ts', 'utf8');
const types = readFileSync('src/types.ts', 'utf8');

test('Schülerdaten: Geschlecht wird aus dem bestehenden Feld an allen drei Stellen angezeigt', () => {
  assert.match(studentList, /getStudentGenderLabel\(s\.geschlecht\)/);
  assert.match(dossier, /Geschlecht: \{getStudentGenderLabel\(student\.geschlecht\)\}/);
  assert.match(stammdaten, /getStudentGenderLabel\(student\.geschlecht\)/);
  assert.match(stammdaten, /geschlecht: normalizeStudentGender\(student\.geschlecht\)/);
  assert.doesNotMatch(types, /studentGenderDisplay/);
});

test('Schülernavigation: Klassenliste und Schülerdossier sind getrennte direkte Einstiege', () => {
  assert.match(sidebar, /id: 'schueler', label: 'Klassenliste'/);
  assert.match(sidebar, /id: 'dossier', label: 'Schülerdossier'/);
  // Beim Klassenwechsel wird die Liste neu gemountet, damit kein Dossier aus der
  // vorherigen Klasse offen bleibt. Der direkte Einstieg bleibt unverändert.
  assert.match(app, /case 'schueler': return istSekundarstufe\(app\.schulart\)/);
  assert.match(app, /: <StudentList key=\{app.activeClassId \|\| 'class'\} \/>/);
  assert.match(app, /\\? <Sek1Students key=\{app.activeClassId \|\| 'class'\} \/>/);
  assert.match(app, /case 'dossier': return istSekundarstufe\(app\.schulart\)/);
  assert.match(app, /: <StudentDossierHub \/>/);
  assert.match(app, /\\? <Sek1DossierHub key=\{app.activeClassId \|\| 'class'\} \/>/);
  assert.match(dossierHub, /Wähle ein Kind und öffne direkt das vollständige Dossier/);
});

test('Entwicklungslisten: sind schülerbezogen, chronologisch und flexibel erweiterbar', () => {
  assert.match(types, /interface StudentDevelopmentList/);
  assert.match(types, /schuelerId: string/);
  assert.match(types, /eintraege: StudentDevelopmentListEntry\[\]/);
  assert.match(developmentLists, /Antolin/);
  assert.match(developmentLists, /Lautleseprotokoll/);
  assert.match(developmentLists, /Förderverlauf/);
  assert.match(developmentLists, /Neue Spalte/);
  assert.match(developmentLists, /entry\.datum/);
  assert.match(developmentLists, /b\.datum\.localeCompare\(a\.datum\)/);
  assert.match(dossier, /id: 'entwicklungslisten'/);
});

test('Entwicklungslisten: bleiben beim Klassenwechsel und in Backups im AppState erhalten', () => {
  assert.match(appState, /studentDevelopmentLists: state\.studentDevelopmentLists/);
  assert.match(appState, /studentDevelopmentLists: c\.studentDevelopmentLists \|\| \[\]/);
  assert.match(appState, /parsed\.studentDevelopmentLists = activeClass\.studentDevelopmentLists \|\| \[\]/);
  assert.match(appState, /studentDevelopmentLists: targetClass\.studentDevelopmentLists \|\| \[\]/);
});

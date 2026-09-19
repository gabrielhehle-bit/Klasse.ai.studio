import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const studentList = readFileSync('src/components/StudentList.tsx', 'utf8');
const behavior = readFileSync('src/components/Behavior.tsx', 'utf8');
const voiceNote = readFileSync('src/components/VoiceNote.tsx', 'utf8');
const voiceArchive = readFileSync('src/components/StimmNotizen.tsx', 'utf8');
const dossierNotes = readFileSync('src/components/dossier/DossierBeobachtungenVerlauf.tsx', 'utf8');
const stations = readFileSync('src/components/StationenbetriebManager.tsx', 'utf8');
const kel = readFileSync('src/components/KELGespraeche.tsx', 'utf8');
const utils = readFileSync('src/lib/utils.ts', 'utf8');
const sidebar = readFileSync('src/components/Sidebar.tsx', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');

test('Klassenliste: Interaktionsaktion ist entfernt', () => {
  assert.doesNotMatch(studentList, /InteractionModal/);
  assert.doesNotMatch(studentList, /interactionModalStudent/);
  assert.doesNotMatch(studentList, /Notiz oder Interaktion/);
});

test('Notizen: eigener Hauptbereich ist in der Sidebar sichtbar', () => {
  assert.match(sidebar, /id: 'verhalten', label: 'Notizen'.*section: 'Start'/);
  assert.match(app, /case 'verhalten': return 'Notizen'/);
});

test('Notizen: Hauptbereich zeigt ohne überflüssige Reiter direkt die kompakte Erfassung', () => {
  assert.match(behavior, /Notizen & Beobachtungen/);
  assert.match(behavior, /Allgemeine Notiz/);
  assert.match(behavior, /Notiz zu diesem Kind eingeben/);
  assert.match(behavior, /Allgemeine Notiz für die Klasse eingeben/);
  assert.doesNotMatch(behavior, /id: 'config', label: 'Einstellungen'/);
  assert.doesNotMatch(behavior, /id: 'verhalten', label: 'Beobachtungsstatus'/);
  assert.doesNotMatch(behavior, /id: 'voice', label: 'Diktieren'/);
});

test('Notizen: Einträge können direkt kategorisiert werden', () => {
  assert.match(behavior, /noteCategory/);
  assert.match(behavior, />Notiz<\/option>/);
  assert.match(behavior, />Beobachtung \/ Verhalten<\/option>/);
  assert.match(behavior, />Lob \/ Stärke<\/option>/);
  assert.match(behavior, />Elternkontakt<\/option>/);
  assert.match(behavior, />Klassenjournal<\/option>/);
  assert.match(behavior, /'Notizen-Hauptbereich'/);
});


test('Notizen: Dossier und Hauptbereich schreiben über denselben zentralen notes/journal-Pfad', () => {
  assert.match(utils, /const newNotes = \[newEntry, \.\.\.\(prev\.notes \|\| \[\]\)\]/);
  assert.match(utils, /const newJournal = \[newEntry, \.\.\.\(prev\.journal \|\| \[\]\)\]/);
  assert.match(dossierNotes, /logObservation\(/);
  assert.match(dossierNotes, /'Schülerdossier'/);
  assert.match(dossierNotes, /journal: \(prev\.journal \|\| \[\]\)\.filter/);
});

test('Notizen: Diktat schreibt direkt in die Eingabe; Speichern nutzt einen zentralen Datenweg', () => {
  assert.match(behavior, /useInlineDictation\(appendDictation\)/);
  assert.match(behavior, /aria-label=\{dictation\.status === 'recording' \? 'Diktieren beenden' : 'Notiz diktieren'\}/);
  assert.match(behavior, /setNewEntryText\(previous =>/);
  assert.match(behavior, /logObservation\(/);
  assert.match(behavior, /Notizen-Hauptbereich/);
  assert.doesNotMatch(behavior, /stimmNotizModal: selectedStudentId \|\| true/);
  assert.match(voiceArchive, /Aufnahme starten/);
  assert.match(voiceNote, /SpeechRecognition/);
  assert.match(voiceNote, /logObservation\(/);
});

test('Stationenbetrieb: Schülernotizen verwenden denselben Diktat- und Notizenpfad', () => {
  assert.match(stations, /stimmNotizModal: student\.id/);
  assert.match(stations, /Notiz zu \$\{student\.vorname\} diktieren/);
});

test('KEL: Beobachtungs- und Verhaltensnotizen sind standardmäßig ausgeblendet und bewusst zuschaltbar', () => {
  assert.match(kel, /useState\(false\)/);
  assert.match(kel, /showBehaviorNotesInKel/);
  assert.match(kel, /Notizen einblenden/);
  assert.match(kel, /Beobachtungsnotizen anzeigen/);
  assert.match(kel, /\(app\.notes \|\| \[\]\)\.filter/);
  assert.doesNotMatch(kel, /const studentNotes = \(app\.notizen \|\| \[\]\)/);
  assert.match(kel, /showBehaviorNotesInKel && studentObservations\.length > 0/);
});


test('Notizen: allgemeine Einträge können direkt als persönliche To-Dos angelegt werden', () => {
  assert.match(behavior, /useState<'note' \| 'todo'>\('note'\)/);
  assert.match(behavior, /> To-Do/);
  assert.match(behavior, /dashboardTodos: \[todo, \.\.\.\(prev\.dashboardTodos \|\| \[\]\)\]/);
  assert.match(behavior, /Meine To-Do-Liste/);
  assert.match(behavior, /togglePersonalTodo/);
  assert.match(behavior, /deletePersonalTodo/);
  assert.match(behavior, /To-Do speichern/);
});

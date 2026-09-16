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

test('Notizen: Hauptbereich öffnet direkt die fertige Notizerfassung', () => {
  assert.match(behavior, /useState<'verhalten' \| 'config' \| 'chronik' \| 'voice'>\('chronik'\)/);
  assert.match(behavior, /id: 'chronik', label: 'Notizen'/);
  assert.match(behavior, /Allgemeine Notiz/);
  assert.match(behavior, /Notiz zu diesem Kind eingeben/);
  assert.match(behavior, /Allgemeine Notiz für die Klasse eingeben/);
});

test('Notizen: Einträge können direkt kategorisiert werden', () => {
  assert.match(behavior, /noteCategory/);
  assert.match(behavior, />Notiz<\/option>/);
  assert.match(behavior, />Beobachtung \/ Verhalten<\/option>/);
  assert.match(behavior, />Erfolg \/ Stärke<\/option>/);
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

test('Notizen: Diktat führt über Transkript und Korrektur in den zentralen Hub', () => {
  assert.match(behavior, /aria-label="Notiz diktieren"/);
  assert.match(behavior, /id: 'voice', label: 'Diktieren'/);
  assert.match(behavior, /<StimmNotizen \/>/);
  assert.match(voiceArchive, /Aufnahme starten/);
  assert.match(voiceArchive, /stimmNotizModal: true/);
  assert.match(voiceNote, /SpeechRecognition/);
  assert.match(voiceNote, /Transkription erscheint hier und kann vor dem Speichern korrigiert werden/);
  assert.match(voiceNote, /KI-Verbesserung/);
  assert.match(voiceNote, /logObservation\(/);
  assert.match(voiceNote, /'Sprachnotiz \/ Transkription'/);
  assert.match(voiceNote, /gespeichertAls: 'Notizen-Hauptbereich'/);
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

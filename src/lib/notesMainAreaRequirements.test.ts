import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const studentList = readFileSync('src/components/StudentList.tsx', 'utf8');
const behavior = readFileSync('src/components/Behavior.tsx', 'utf8');
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
  assert.match(behavior, /useState<'verhalten' \| 'config' \| 'chronik'>\('chronik'\)/);
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

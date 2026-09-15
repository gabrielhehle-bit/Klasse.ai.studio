import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const wirGefuehl = readFileSync('src/components/WirGefuehl.tsx', 'utf8');
const appState = readFileSync('src/lib/appState.ts', 'utf8');
const behavior = readFileSync('src/components/Behavior.tsx', 'utf8');
const appContext = readFileSync('src/context/AppContext.tsx', 'utf8');

test('Wir-Gefuehl: Befinden kommt kanonisch aus dem Ich-bin-da-Check-in', () => {
  assert.match(wirGefuehl, /computeKidAttendanceMoodSummary\(app\.schueler \|\| \[\], app, todayKey\)/);
  assert.match(wirGefuehl, /Das Wir-Gefühl übernimmt das freiwillige Befinden direkt aus dem „Ich bin da!“-Widget/);
  assert.match(wirGefuehl, /setPage\('cockpit'\)/);
  assert.match(wirGefuehl, /5 Smileys · freiwillig/);

  for (const obsolete of [
    'barometer_history_v1',
    'currentMood',
    'MOODS_META',
    'Wähle in Sekunden das kollektive Energiebild',
  ]) {
    assert.doesNotMatch(wirGefuehl, new RegExp(obsolete));
  }
});

test('Wir-Gefuehl: Verhalten und Beobachtungen werden aus dem zentralen Verhalten-Modul gespiegelt', () => {
  assert.match(wirGefuehl, /app\.journal \|\| \[\]/);
  assert.match(wirGefuehl, /entry\?\.kategorie === 'Verhalten'/);
  assert.match(wirGefuehl, /app\.statusLog \|\| \[\]/);
  assert.match(wirGefuehl, /setPage\('verhalten'\)/);
  assert.match(wirGefuehl, /Wir-Gefühl führt kein zweites Tagebuch/);

  assert.doesNotMatch(wirGefuehl, /klassengemeinschaft_year_klima_v1/);
  assert.doesNotMatch(wirGefuehl, /Klassen-Energie Formel/);
  assert.doesNotMatch(wirGefuehl, /hehle_v3_wir_gefuehl_config/);
});

test('Wir-Gefuehl: keine erfundenen produktiven Startdaten für Vertrag oder Klassenrat', () => {
  assert.doesNotMatch(wirGefuehl, /Mia hat mir heute beim Aufräumen geholfen/);
  assert.doesNotMatch(wirGefuehl, /Klassenrat-Team/);
  assert.doesNotMatch(wirGefuehl, /Toller Zusammenhalt bei der Gruppenarbeit/);
  assert.match(wirGefuehl, /Array\.isArray\(app\.classContracts\) \? app\.classContracts : \[\]/);
  assert.match(wirGefuehl, /Array\.isArray\(app\.councilNotes\) \? app\.councilNotes : \[\]/);
});

test('Wir-Gefuehl: alte Klartextdaten werden nur migriert, neue Daten nicht in localStorage geschrieben', () => {
  assert.match(wirGefuehl, /migrateLegacyArray\('class_contracts_v1'/);
  assert.match(wirGefuehl, /migrateLegacyArray\('council_notes_v1'/);
  assert.doesNotMatch(wirGefuehl, /localStorage\.setItem/);
  assert.doesNotMatch(wirGefuehl, /game_checked_steps_v1/);
});

test('Wir-Gefuehl: Vertrag und Klassenrat sind klassenlokal im App-State', () => {
  assert.match(appState, /classContracts: state\.classContracts \? JSON\.parse\(JSON\.stringify\(state\.classContracts\)\) : \[\]/);
  assert.match(appState, /councilNotes: state\.councilNotes \? JSON\.parse\(JSON\.stringify\(state\.councilNotes\)\) : \[\]/);
  assert.match(appState, /parsed\.classContracts = activeClass\.classContracts \|\| \[\]/);
  assert.match(appState, /parsed\.councilNotes = activeClass\.councilNotes \|\| \[\]/);
  assert.match(appContext, /classContracts: nextClass\.classContracts/);
  assert.match(appContext, /councilNotes: nextClass\.councilNotes/);
});

test('Verhalten: Tageswerte verwenden denselben lokalen Kalendertag wie Wir-Gefuehl', () => {
  assert.match(behavior, /formatLocalDateKey\(new Date\(\)\)/);
  assert.match(behavior, /formatLocalDateKey\(d\)/);
  assert.doesNotMatch(behavior, /toISOString\(\)\.split\('T'\)\[0\]/);
});

test('Wir-Gefuehl: Verlauf basiert auf realen Check-in-Daten statt erfundenem Klima-Score', () => {
  assert.match(wirGefuehl, /moodTrendData/);
  assert.match(wirGefuehl, /computeKidAttendanceMoodSummary\(app\.schueler \|\| \[\], app, key\)/);
  assert.match(wirGefuehl, /1 = sehr gut, 5 = schlecht/);
  assert.doesNotMatch(wirGefuehl, /score: 50/);
  assert.doesNotMatch(wirGefuehl, /positiveInteractionsWeight/);
});

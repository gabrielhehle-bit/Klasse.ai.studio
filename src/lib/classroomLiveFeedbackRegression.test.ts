import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const list = readFileSync('src/components/StudentList.tsx', 'utf8');
const map = readFileSync('src/components/StudentMap.tsx', 'utf8');
const weekly = readFileSync('src/components/WeeklyPlan.tsx', 'utf8');
const teaching = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const dossier = readFileSync('src/components/dossier/DossierBeobachtungenVerlauf.tsx', 'utf8');

test('Klassenliste druckt ausschließlich über das Druckzentrum', () => {
  assert.doesNotMatch(list, /<span>Liste drucken<\/span>/);
  assert.match(list, /setViewMode\('map'\)/);
  assert.match(list, /<StudentMap students=\{filteredStudents\} \/>/);
});

test('Karte meldet anstatt weißer Fläche Geocoder- oder Kartenkachelfehler und erlaubt Wiederholen', () => {
  assert.match(map, /map\.invalidateSize\(\)/);
  assert.match(map, /AbortSignal\.timeout\(8000\)/);
  assert.match(map, /tileerror: \(\) => setTilesUnavailable\(true\)/);
  assert.match(map, /Erneut versuchen/);
  assert.doesNotMatch(map, /student\.anschrift/);
});

test('Wochenplan: separate vorbereitete und erledigte Stunden werden korrekt beschriftet', () => {
  assert.match(weekly, /isWeeklyLessonPrepared\(item\)/);
  assert.match(weekly, /\{weekMetrics\.prepared\}\/\{weekMetrics\.total\} vorbereitet/);
  assert.match(weekly, /\{progress\.prepared\}\/\{progress\.total\} vorbereitet · \{progress\.completed\} erledigt/);
  assert.match(weekly, /item\.erledigt = newErledigt/);
});

test('Verhaltens-Tagesabschluss: pro Kind idempotent, im Dossier je Tag nur ein Eintrag', () => {
  assert.match(teaching, /dailyBehaviorEntries\(prev\.statusLog \|\| \[\], student\.id, todayStr\)\.length\) return/);
  assert.match(teaching, /if \(newEntries\.length === 0\) return prev/);
  assert.match(teaching, /if \(behaviorSavedToday\) return/);
  assert.match(dossier, /collapseDailyBehaviorHistory\(app\.statusLog \|\| \[\], student\.id\)/);
});
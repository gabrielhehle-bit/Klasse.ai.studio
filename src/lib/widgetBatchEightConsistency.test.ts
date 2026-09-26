import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  cockpitWidgetSupportsSettings,
  getCockpitWidgetDisplayLabel,
} from './cockpitWidgetCatalog';

const surface = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const stopwatch = readFileSync('src/components/cockpit/widgets/StopwatchWidget.tsx', 'utf8');
const weekly = readFileSync('src/components/cockpit/widgets/ClassroomWeeklyPlanWidget.tsx', 'utf8');
const contents = readFileSync('src/components/cockpit/CockpitWidgetContents.tsx', 'utf8');

const wordclockStart = contents.indexOf('export const WordclockWidgetContent');
const wordclockEnd = contents.indexOf('// NEW WIDGET 16:', wordclockStart);
const wordclock = contents.slice(wordclockStart, wordclockEnd);

test('Batch 8: Zeit- und Wochenplan-Widgets behalten kanonische Titel', () => {
  assert.equal(getCockpitWidgetDisplayLabel('stopwatch'), '⏱️ Stoppuhr');
  assert.equal(getCockpitWidgetDisplayLabel('wordclock'), '⏰ Deutsche Wort-Uhr');
  assert.equal(getCockpitWidgetDisplayLabel('classweeklyplan'), '📋 Wochenplan der Kinder');

  assert.doesNotMatch(wordclock, />\s*Deutsche Wort-Uhr\s*</);
  assert.doesNotMatch(weekly, /📋 Unser Wochenplan/);
});

test('Batch 8: gemeinsames Zahnrad steuert Stoppuhr, Wort-Uhr und Kinder-Wochenplan', () => {
  for (const id of ['stopwatch', 'wordclock', 'classweeklyplan']) {
    assert.equal(cockpitWidgetSupportsSettings(id), true);
  }

  assert.match(stopwatch, /showSettings = false/);
  assert.match(stopwatch, /Stoppuhr-Einstellungen/);
  assert.match(stopwatch, /Zehntelsekunden/);

  assert.match(wordclock, /showSettings = false/);
  assert.match(wordclock, /Wort-Uhr einstellen/);
  assert.match(wordclock, /wordclockPracticeMode/);

  assert.match(weekly, /showSettings = false/);
  assert.match(weekly, /Wochenplan-Einstellungen/);
  assert.match(weekly, /showMaterials/);

  assert.match(
    surface,
    /<StopwatchWidgetContent[\s\S]{0,900}showSettings=\{widgetSettingsOpenId === widget\.id\}[\s\S]{0,250}onCloseSettings=\{\(\) => setWidgetSettingsOpenId\(null\)\}/,
  );
  assert.match(
    surface,
    /<WordclockWidgetContent[\s\S]{0,900}showSettings=\{widgetSettingsOpenId === widget\.id\}[\s\S]{0,250}onCloseSettings=\{\(\) => setWidgetSettingsOpenId\(null\)\}/,
  );
  assert.match(
    surface,
    /<ClassroomWeeklyPlanWidget[\s\S]{0,900}showSettings=\{widgetSettingsOpenId === widget\.id\}[\s\S]{0,250}onCloseSettings=\{\(\) => setWidgetSettingsOpenId\(null\)\}/,
  );
});

test('Batch 8: neutrale Bedienung folgt der Profil-Akzentfarbe', () => {
  assert.doesNotMatch(stopwatch, /indigo-/);
  assert.match(stopwatch, /text-accent/);
  assert.match(stopwatch, /bg-accent hover:bg-accent-hover/);

  assert.doesNotMatch(wordclock, /indigo-/);
  assert.match(wordclock, /bg-accent text-accent-text/);
  assert.match(wordclock, /text-accent accent-current/);

  assert.doesNotMatch(weekly, /indigo-/);
  assert.match(weekly, /bg-accent text-accent-text/);
  assert.match(weekly, /text-accent/);
});

test('Batch 8: direkte Unterrichtsaktionen und semantische Farben bleiben erhalten', () => {
  assert.match(stopwatch, /bg-emerald-600/);
  assert.match(stopwatch, /bg-amber-500/);
  assert.match(stopwatch, /bg-rose-600/);

  assert.match(weekly, /✅ Ich bin fertig mit einer Aufgabe/);
  assert.match(weekly, /border-2 border-amber-400 bg-amber-100/);
  assert.match(wordclock, /Übungszeit über das Zahnrad verändern/);
});

test('Batch 8: Wochenplan schützt private Kinder-Rückmeldungen weiterhin', () => {
  assert.match(weekly, /Never project an individual child's difficulty or help status on the board/);
  assert.match(weekly, /updateChildWeeklyFeedback/);
  assert.doesNotMatch(weekly, /getChildTaskProgress\(pupil, task\.id\)/);
  assert.doesNotMatch(weekly, /progress\?\.difficulty/);
});

test('Batch 8: wichtige Touch-Ziele bleiben mindestens 44 px hoch', () => {
  assert.match(stopwatch, /min-h-11/);
  assert.match(wordclock, /min-h-11/);
  assert.match(weekly, /min-h-11/);
});

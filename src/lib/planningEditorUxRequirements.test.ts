import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const weekly = fs.readFileSync('src/components/WeeklyPlan.tsx', 'utf8');
const yearly = fs.readFileSync('src/components/YearlyPlan.tsx', 'utf8');
const sync = fs.readFileSync('src/lib/planningSync.ts', 'utf8');

test('Wochenplanung: großer Arbeitsbereich mit klaren Reitern statt Formularwand', () => {
  assert.match(weekly, /w-\[calc\(100vw-0\.5rem\)\]/);
  assert.match(weekly, /sm:w-\[calc\(100vw-1rem\)\]/);
  assert.match(weekly, /max-w-none/);
  assert.match(weekly, /h-\[calc\(100vh-0\.5rem\)\]/);
  assert.match(weekly, /plannerEditorTab/);
  assert.match(weekly, /1 · Inhalt & Fach/);
  assert.match(weekly, /2 · Unterrichtsrahmen/);
  assert.match(weekly, /3 · Material/);
  assert.match(weekly, /<DailyHomeworkButton day=\{tag\} date=\{dateStr\}/);
  assert.doesNotMatch(weekly, /placeholder="Hausaufgabe notieren/);
  assert.match(weekly, /4 · Ablauf & Optionen/);
  assert.match(weekly, /Einheit planen/);
});

test('Wochenplanung: Stunde halbieren ist direkt auf der ersten Seite Inhalt & Fach verfügbar', () => {
  const firstPage = weekly.indexOf("plannerEditorTab === 'inhalt'");
  const splitControl = weekly.indexOf('Unterrichtseinheit halbieren');
  const secondPage = weekly.indexOf("plannerEditorTab === 'rahmen'");
  assert.ok(firstPage >= 0);
  assert.ok(splitControl > firstPage);
  assert.ok(splitControl < secondPage);
  assert.match(weekly, /Erste Hälfte/);
  assert.match(weekly, /Zweite Hälfte/);
  assert.match(weekly, /setTempSplitLesson/);
});

test('Wochenplanung: geplante Stunde öffnet Übersicht und wird erst bewusst bearbeitet', () => {
  assert.match(weekly, /viewingCell/);
  assert.match(weekly, /Geplante Einheit/);
  assert.match(weekly, /openWeeklyCell/);
  assert.match(weekly, /> Bearbeiten/);
  assert.match(weekly, /hasWeeklyPlanningDetails/);
});

test('Jahresplanung: bestehende Planung öffnet Übersicht und großer Editor ist klar gegliedert', () => {
  assert.match(yearly, /viewingCell/);
  assert.match(yearly, /Jahresplanung · Übersicht/);
  assert.match(yearly, /openYearPlanEditor/);
  assert.match(yearly, /w-\[calc\(100vw-0\.5rem\)\]/);
  assert.match(yearly, /sm:w-\[calc\(100vw-1rem\)\]/);
  assert.match(yearly, /max-w-none/);
  assert.match(yearly, /h-\[calc\(100vh-0\.5rem\)\]/);
  assert.match(yearly, /yearPlannerTab/);
  assert.match(yearly, /1 · Inhalt/);
  assert.match(yearly, /2 · Rahmen/);
  assert.match(yearly, /3 · Weitere Inhalte/);
  assert.match(yearly, /> Bearbeiten/);
});

test('Wochenplanung kann freie Jahresplan-Zelle hinzufügen ohne vorhandene Planung zu überschreiben', () => {
  assert.match(weekly, /In Jahresplan übernehmen/);
  assert.match(weekly, /addWeeklyLessonToYearPlan/);
  assert.match(sync, /status: 'occupied'/);
  assert.match(sync, /isYearPlanCellFree/);
  assert.doesNotMatch(sync, /overwrite/i);
});

test('Planungs-UX führt keinen Reset oder Datenmodellwechsel für bestehende Lehrpersonen ein', () => {
  assert.doesNotMatch(weekly, /factoryReset|Werksreset|clearAppData/);
  assert.doesNotMatch(yearly, /factoryReset|Werksreset|clearAppData/);
  assert.match(sync, /existingPlan/);
});

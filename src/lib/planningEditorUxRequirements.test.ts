import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const weekly = fs.readFileSync('src/components/WeeklyPlan.tsx', 'utf8');
const yearly = fs.readFileSync('src/components/YearlyPlan.tsx', 'utf8');
const sync = fs.readFileSync('src/lib/planningSync.ts', 'utf8');

test('Wochenplanung: große Arbeitsfläche statt kleinem Scroll-Dialog', () => {
  assert.match(weekly, /max-w-\[1500px\]/);
  assert.match(weekly, /h-\[94vh\]/);
  assert.match(weekly, /xl:grid-cols-2/);
  assert.match(weekly, /Einheit planen/);
});

test('Wochenplanung: geplante Stunde öffnet Übersicht und wird erst bewusst bearbeitet', () => {
  assert.match(weekly, /viewingCell/);
  assert.match(weekly, /Geplante Einheit/);
  assert.match(weekly, /openWeeklyCell/);
  assert.match(weekly, /> Bearbeiten/);
  assert.match(weekly, /hasWeeklyPlanningDetails/);
});

test('Jahresplanung: bestehende Planung öffnet Übersicht und großer Editor bleibt separat', () => {
  assert.match(yearly, /viewingCell/);
  assert.match(yearly, /Jahresplanung · Übersicht/);
  assert.match(yearly, /openYearPlanEditor/);
  assert.match(yearly, /max-w-\[1400px\]/);
  assert.match(yearly, /lg:grid-cols-2/);
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

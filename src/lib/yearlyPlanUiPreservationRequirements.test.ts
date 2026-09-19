import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const yearly = readFileSync('src/components/YearlyPlan.tsx','utf8');
const weekly = readFileSync('src/components/WeeklyPlan.tsx','utf8');
const printing = readFileSync('src/components/PrintCenter.tsx','utf8');
const importer = readFileSync('src/components/JahresplanExcelModal.tsx','utf8');
const appState = readFileSync('src/lib/appState.ts','utf8');

test('Jahresplanung behält alle vorhandenen Ansichten, Fächer, KI, Lernziel-Tracker und mehrwöchige Inhalte', () => {
 for(const marker of ['LernzielTracker', 'Themen-Assistent (KI)', 'Lehrplan', 'Monatsübersicht',
   'Tabelle', 'planWeeksCount', 'subCategories', 'showLehrplanDrawer', 'showSettings']) {
   assert.ok(yearly.includes(marker), `fehlende Jahresplan-Funktion: ${marker}`);
 }
 assert.match(yearly, /Weitere Werkzeuge/);
 assert.match(yearly, /Wochen geplant/);
 assert.doesNotMatch(yearly, /changeDensityMode\(|Dichte:/);
});
test('Druck- und Exportaktionen für die Jahresplanung liegen im Druckzentrum; Import bleibt in der Planung', () => {
 assert.match(yearly, /activePrintTemplate: 'jahresplanung'/);
 assert.doesNotMatch(yearly, /window\.print\(\)|generateJahresplanTemplate\(|downloadCSV\(/);
 assert.match(printing, /generateJahresplanTemplate\(app\)/);
 assert.match(printing, /downloadYearlyPlanCsv\(/);
 assert.match(yearly, /<JahresplanExcelModal/);
 assert.doesNotMatch(importer, /generateJahresplanTemplate\(/);
});
test('Jahresplan und Wochenplan behalten denselben Klassen- und JSON-Datenweg', () => {
 assert.match(yearly, /jahresplanung: updatedPlanning/);
 assert.match(yearly, /conflictingYearWeeks/);
 assert.match(yearly, /occupiedYearPlanCell/);
 assert.match(yearly, /applyYearPlanImportRows/);
 assert.match(weekly, /yearPlanCellEntries\(data\)/);
 assert.match(weekly, /mergeYearlySuggestionIntoEmptyWeeklySlot\(/);
 assert.match(appState, /jahresplanung/);
 assert.match(appState, /wochenplanung/);
 assert.match(yearly, /currentPage: 'wochenplanung'/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const week = readFileSync('src/components/WeeklyPlan.tsx', 'utf8');
const printing = readFileSync('src/components/PrintCenter.tsx', 'utf8');
const projection = readFileSync('src/lib/weeklyClassbookProjection.ts', 'utf8');

test('Wochenplan: Stunde anklicken statt redundantem Planen-Button; bisheriger Editor bleibt', () => {
  assert.doesNotMatch(week, /<span>\+ Planen<\/span>/);
  assert.match(week, /const openWeeklyCell =/);
  assert.match(week, /handleEditCell\(tag, idx\)/);
  assert.match(week, /saveCell\(/);
  assert.match(week, /setTempSplitLesson/);
});

test('Materialfrei bedeutet weder fehlend noch unvorbereitet', () => {
  assert.doesNotMatch(week, /weekMetrics\.missingMat|ohne Material<\/span>/);
  assert.doesNotMatch(week, /let missingMat = 0/);
  assert.match(week, /setTempMaterial\(current\.material \|\| ''\)/);
  assert.match(projection, /add\('Material', lesson\.material/);
});

test('Wochenplan, Tagesansicht, Klassenbuch und Druckzentrum verwenden dieselben Klassen-Unterrichtseinträge', () => {
  assert.match(week, /viewMode === 'day'/);
  assert.match(week, /onClick=\{\(\) => openWeeklyCell\(selectedDay, idx\)\}/);
  assert.match(week, /plan\[selectedDay\]\?\.\[idx\]/);
  assert.match(week, /const getKlassenbuchData = \(\) => projectWeeklyPlanToClassbook/);
  assert.match(printing, /const compileKlassenbuchData = \(targetKW: number\) => projectWeeklyPlanToClassbook/);
  assert.match(projection, /const WEEKDAYS = \['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'\]/);
  assert.match(projection, /Verknüpfte Materialien/);
  assert.doesNotMatch(projection, /new Set\(data\[key\]/);
});

test('Wochenplan: nur Excel-Import und Vorlagen-Erstellung für Kinder im Planer, Ausgaben im Druckzentrum', () => {
  assert.match(week, /<WochenplanExcelModal/);
  assert.match(week, /setShowSchuelerWochenplanModal\(true\)/);
  assert.doesNotMatch(week, /generateWochenplanTemplate\(/);
  assert.doesNotMatch(week, /downloadKlassenbuchDocx/);
  assert.match(printing, /generateWochenplanTemplate\(app, wpKW\)/);
  assert.match(printing, /downloadKlassenbuchPdf/);
  assert.match(printing, /downloadKlassenbuchDocx/);
  for(const range of ['week', 'month', 'semester', 'schoolyear']) assert.ok(printing.includes(`['${range}',`));
});

test('Stundeneditor: importierte Lernziele, Erledigtstatus und Hausübungen überleben erneutes Speichern', () => {
  assert.match(week, /\.\.\.\(kwPlan\[tag\]\[idx\] \|\| \{\}\)/);
  assert.match(week, /setTempHUE\(current\.housework \|\| current\.hue \|\| ''\)/);
});

test('Schüler-Wochenplan: Erstellung bleibt im Wochenplan; Druck und PDF laufen nur über das Druckzentrum', () => {
  const generator = readFileSync('src/components/wochenplan/WochenplanGeneratorModal.tsx', 'utf8');
  assert.match(generator, /schuelerWochenplaene: \{/);
  assert.match(generator, /activePrintTemplate: 'schueler_wochenplan'/);
  assert.doesNotMatch(generator, /window\.print\(/);
  assert.doesNotMatch(generator, /hidden print:block schueler-wochenplan-print-sheet/);
  assert.match(printing, /case 'schueler_wochenplan':/);
  assert.match(printing, /SchuelerWochenplanA4Sheet plan=\{selectedChildPlan\}/);
  assert.match(printing, /activeTemplate === 'schueler_wochenplan'/);
  assert.match(printing, /selectedChildPlan\?\.orientierung/);
});

test('Klassenbuch-PDF behält eigene Fachinhalte auch bei ausgeschalteten Terminen und erlaubt A4-Folgeseiten', () => {
  const pdf = readFileSync('src/lib/klassenbuchPdf.ts', 'utf8');
  assert.match(pdf, /pageSize: 'A4'/);
  assert.match(pdf, /unbreakable: fitsOnePage/);
  assert.match(pdf, /dontBreakRows: fitsOnePage/);
  assert.match(pdf, /const categories = Object\.entries\(week\.categories\)/);
  assert.doesNotMatch(pdf, /options\.includeOccurrences !== false \|\| name !== 'Besondere Vorkommnisse'/);
});

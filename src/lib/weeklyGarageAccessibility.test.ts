import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const weekly = readFileSync('src/components/WeeklyPlan.tsx', 'utf8');
const picker = readFileSync('src/components/wochenplan/GarageRestorePicker.tsx', 'utf8');

test('Parkgarage: jede Karte bietet sichtbares Einsetzen statt Drag-only', () => {
  const ui = weekly.slice(weekly.indexOf('PARKGARAGE */'), weekly.indexOf('WOCHENEND CHECK-IN CARD'));
  assert.match(ui, /data-garage-restore-start/);
  assert.match(ui, /<GarageRestorePicker/);
  assert.match(ui, /startGarageRestore\(pIdx, item\)/);
  assert.match(ui, /draggable=\{!selection\}/);
  assert.match(ui, /Zum Wiederverwenden/);
  assert.match(ui, /Alternativ per Ziehen/);
});

test('Touch- und Tastatur-Einsetzen wählt Tag und Stunde, prüft sichere Belegung und hat Abbrechen', () => {
  assert.match(picker, /aria-label="Zieltag für geparkte Stunde"/);
  assert.match(picker, /aria-label="Zielstunde für geparkte Stunde"/);
  assert.match(picker, /onDayChange\(Number\(event\.target\.value\)\)/);
  assert.match(picker, /onHourChange\(Number\(event\.target\.value\)\)/);
  assert.match(picker, /disabled=\{!canRestore\}/);
  assert.match(picker, /onClick=\{onConfirm\}/);
  assert.match(picker, /onClick=\{onCancel\}/);
  assert.match(picker, /role="status"/);
  assert.match(picker, /min-h-11/);
});

test('Bestätigtes Einsetzen überprüft die aktuelle Woche erneut und löscht nie ungeprüft die Garage', () => {
  const handler = weekly.slice(weekly.indexOf('const confirmGarageRestore'),
    weekly.indexOf('const incompleteWeeklySlots'));
  assert.match(handler, /choice\.kw !== activeKW/);
  assert.match(handler, /choice\.classId !== app\.activeClassId/);
  assert.match(handler, /prev\.activeClassId !== app\.activeClassId/);
  assert.match(handler, /restoreParkedWeeklyLessonSafely\(/);
  assert.match(handler, /if \(result\.status !== 'restored'\) return prev/);
  assert.match(handler, /reconcileCopiedLessonYearlyStatus\(/);
  assert.match(handler, /parkgarage: result\.garage/);
  assert.doesNotMatch(handler, /\.splice\(/);
});

test('Parkgarage: Löschen verlangt Bestätigung und prüft den Eintrag im aktuellen State', () => {
  const ui = weekly.slice(weekly.indexOf('data-garage-restore-start'), weekly.indexOf('WOCHENEND CHECK-IN CARD'));
  assert.match(ui, /window\.confirm\(/);
  assert.match(ui, /candidate\?\.id === parkedId/);
  assert.match(ui, /if \(!sameItem\) return prev/);
  assert.doesNotMatch(ui, /\.splice\(/);
});

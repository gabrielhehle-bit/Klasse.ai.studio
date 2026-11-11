import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findNextFreeSeatPosition } from './seatingPlanPlacement';

const plan = readFileSync('src/components/SeatingPlan.tsx', 'utf8');

test('Sitzplan 2.0 zeigt Platzierungsleiste außerhalb der Zeichenfläche', () => {
  assert.match(plan, /data-seating-workspace/);
  assert.match(plan, /data-seating-edit-dock/);
  assert.match(plan, /Noch nicht platziert: \{unplacedStudents\.length\}/);
  assert.match(plan, /freeStandingStudents/);
  assert.match(plan, /Einzel- \/ freie Plätze/);
  assert.match(plan, /placeUnplacedStudent\(student\.id\)/);
  assert.match(plan, /onClick=\{\(\) => addObject\('rectangle'\)\}/);
});

test('Sitzplan 2.0 erlaubt klickweisen Platztausch und sichert die vorhandene Ziehfunktion', () => {
  assert.match(plan, /const handleSeatSelection = \(studentId: string\) =>/);
  assert.match(plan, /handleSwap\(selectedSeatStudentId, studentId\)/);
  assert.match(plan, /setSelectedSeatStudentId\(null\)/);
  assert.match(plan, /lastSeatDragAtRef\.current = Date\.now\(\)/);
  assert.match(plan, /isSelectedForSwap=\{editMode && selectedSeatStudentId === s\.id\}/);
  assert.match(plan, /onClick=\{\(e: any\) => \{\s*if \(editMode\)/);
  assert.match(plan, /drag=\{editMode\}/);
  assert.match(plan, /role=\{editMode \|\| showPrivateDetails/);
  assert.match(plan, /event\.key === 'Enter'/);
});

test('Freier Tischplatz wird vor Einzelplatz gesucht, ohne bestehende Daten zu verändern', () => {
  const occupied = { a: { x: 100, y: 200 } };
  const desks = [{ type: 'rectangle', x: 100, y: 200, w: 240, h: 80 }];
  const suggested = findNextFreeSeatPosition(occupied, desks);
  assert.deepEqual(suggested, { x: 224, y: 204 });
  assert.deepEqual(occupied, { a: { x: 100, y: 200 } });
  const full = { a: { x: 100, y: 204 }, b: { x: 224, y: 204 } };
  const next = findNextFreeSeatPosition(full, desks);
  assert.notDeepEqual(next, full.a);
  assert.notDeepEqual(next, full.b);
});

test('Gespeicherte Sitzordnungen und Rückgängig bleiben unverändert angebunden', () => {
  assert.match(plan, /saveCurrentArrangement/);
  assert.match(plan, /resolveSeatingLayout\(/);
  assert.match(plan, /pushState\(\)/);
  assert.match(plan, /handleUndo/);
  assert.doesNotMatch(plan, /localStorage\.setItem\('seating_plan_layouts/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const seatingPlan = readFileSync('src/components/SeatingPlan.tsx', 'utf8');

test('Sitzplan: Alltag und Planen sind als sichtbare Modi benannt', () => {
  assert.match(seatingPlan, /aria-label="Sitzplan-Modus"/);
  assert.match(seatingPlan, /> Alltag\s*<\/button>/);
  assert.match(seatingPlan, /> Planen\s*<\/button>/);
  assert.match(seatingPlan, /title="Sitzplan bearbeiten, Möbel verschieben, Schüler neu platzieren"/);
});

test('Sitzplan: Kinder sind im Planen-Modus direkt verschiebbar', () => {
  assert.match(seatingPlan, /drag=\{editMode\}/);
  assert.match(seatingPlan, /onDrag=\{onDrag\}/);
  assert.match(seatingPlan, /onDragEnd=\{onDragEnd\}/);
  assert.match(seatingPlan, /Sitzplatz verschieben/);
});

test('Sitzplan: Tische können verschoben werden und nehmen zugeordnete Kinder mit', () => {
  assert.match(seatingPlan, /const studentsOnTable = getStudentsOnTable\(obj, app\.sitzplan_schueler\)/);
  assert.match(seatingPlan, /tableDragRef\.current =/);
  assert.match(seatingPlan, /activeTableDrag\?\.studentIds\.includes\(s\.id\)/);
  assert.match(seatingPlan, /newSchueler\[sid\] = \{ x: stX, y: stY \}/);
});

test('Sitzplan: nicht platzierte und außerhalb liegende Kinder bleiben erreichbar', () => {
  assert.match(seatingPlan, /Noch nicht platziert:/);
  assert.match(seatingPlan, /UserPlus/);
  assert.match(seatingPlan, /außerhalb \(Zurückholen\)/);
  assert.match(seatingPlan, /handleBringOutOfBoundsToRoom/);
});


test('Sitzplan: Niveauanzeige deckt 1 bis 5 ab und nutzt keine schwach/stark-Etiketten', () => {
  assert.match(seatingPlan, /orderStudentsByComplementaryLevels/);
  for (const level of ['L1', 'L2', 'L3', 'L4', 'L5']) {
    assert.ok(seatingPlan.includes(level), `Niveau-Legende fehlt: ${level}`);
  }
  assert.doesNotMatch(seatingPlan, />\s*schwach\s*</i);
  assert.doesNotMatch(seatingPlan, />\s*stark\s*</i);
});

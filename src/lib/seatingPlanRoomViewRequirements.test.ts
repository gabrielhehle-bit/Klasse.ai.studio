import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const plan = readFileSync('src/components/SeatingPlan.tsx', 'utf8');
const printCenter = readFileSync('src/components/PrintCenter.tsx', 'utf8');

test('Sitzplan: Ansicht wird unabhängig von gespeicherten Tisch- und Sitzpositionen automatisch eingepasst', () => {
  assert.match(plan, /fitSeatingPlanViewport\(/);
  assert.match(plan, /<Locate size=\{13\} className="inline mr-1" \/> Einpassen/);
  assert.match(plan, /ResizeObserver/);
  assert.match(plan, /viewOffset\.x/);
  assert.match(plan, /translate3d\(/);
  assert.match(plan, /autoFitAllowed\.current = false/);
});

test('Sitzplan: neutrale Bildschirmansicht zeigt nur Namen und blendet pädagogische Zusatzangaben aus', () => {
  assert.match(plan, /useState\(false\);\n  const \[showMoreTools/);
  assert.match(plan, /showPrivateDetails \&\& isHovered \&\& !editMode/);
  assert.match(plan, /showPrivateDetails \&\& isAbsent/);
  assert.match(plan, /showPrivateDetails \&\& showEmojis/);
  assert.match(plan, /showPrivateDetails \&\& pinnedStudentId/);
  assert.match(plan, /setOverlayFilter\('standard'\)/);
  assert.match(plan, /Lehrpersonenansicht/);
  assert.match(plan, /Nur Namen/);
});

test('Sitzplan: Planen, bestehende Raumvorlagen, Regeln, Zufall, Analyse, Emojis und Rückgängig bleiben erreichbar', () => {
  for (const item of [
    'aria-label="Sitzplan-Modus"', 'title="Sitzplan bearbeiten, Möbel verschieben, Schüler neu platzieren"',
    'applyRoomPreset', 'handleShuffleRules', 'setShowRulesModal(true)',
    'setShowAnalysisPanel(!showAnalysisPanel)', 'toggleEmojis', 'handleUndo',
    'setShowGenerator', 'pushState()', 'activeTableDrag',
  ]) {
    assert.ok(plan.includes(item), `Bestehende Funktion fehlt: ${item}`);
  }
});

test('Sitzplan: Druckausgabe wird ausschließlich vom vorhandenen Druckzentrum angeboten', () => {
  assert.match(printCenter, /case 'sitzplan':/);
  assert.match(printCenter, /renderSeatingPlanView\(\)/);
  assert.doesNotMatch(plan, /handlePrint/);
  assert.doesNotMatch(plan, /activePrintTemplate: 'sitzplan'/);
  assert.doesNotMatch(plan, /@page \{ size: A4 landscape/);
});

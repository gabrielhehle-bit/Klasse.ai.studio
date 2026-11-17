import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/components/Gradebook.tsx', 'utf8');
const begin = source.indexOf('id="gradebook-tools-menu"');
const end = source.indexOf('</motion.aside>', begin);
const drawer = source.slice(begin, end);

test('Notenmappe groups existing tools by teacher task with readable touch targets', () => {
  assert.ok(begin >= 0 && end > begin);
  for (const heading of [
    'gradebook-tools-assessment-heading',
    'gradebook-tools-views-heading',
    'gradebook-tools-display-heading',
  ]) assert.match(drawer, new RegExp(heading));
  assert.match(source, /const gradebookToolActionClass = 'flex min-h-11 w-full/);
  assert.match(source, /focus-visible:outline-offset-2/);
  assert.match(drawer, /aria-label="Größe der Notenmappe"/);
  assert.match(drawer, /aria-pressed=\{zoomLevel === lvl\}/);
  assert.doesNotMatch(drawer, /🧮|⚖️|📊|🌡️|🖨️/);
});

test('Every existing tool keeps the same action and grade records stay untouched', () => {
  for (const action of [
    'setShowGradeCalculator(true)', 'setShowWeights(true)', 'setShowStats(!showStats)',
    'setShowDetailedAnalysis(true)', 'setShowFeedback(true)', 'setShowOverview(true)',
    'setSimpleDashboardMode(prev => !prev)', 'setHeatmapMode(!heatmapMode)',
    'handleExport()', 'changeZoomLevel(lvl)', "setupInitialStepMode: 'Fächer'",
  ]) assert.ok(drawer.includes(action), action + ' remains reachable');
  assert.match(source, /berechne\(app, s\.id, activeFach, sem\)/);
  assert.match(source, /onCommit=\{\(val\) => setNote\(s\.id, 'lzk', idx, val\)\}/);
  assert.doesNotMatch(drawer, /noten:\s*\{/);
});

test('The compact header keeps one subject selector and mobile primary actions', () => {
  assert.equal((source.match(/<select id="gradebook-active-subject"/g) || []).length, 1);
  assert.match(source, /flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between/);
  assert.match(source, /flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end/);
  assert.match(source, /id="gradebook-add-assessment-trigger"/);
  assert.match(source, /aria-haspopup="dialog"/);
  assert.match(source, /id="gradebook-tools-menu"/);
});

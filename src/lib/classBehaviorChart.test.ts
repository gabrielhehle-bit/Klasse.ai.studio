import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { behaviorChartCoordinate } from './classBehaviorChart';

const dossier = readFileSync('src/components/ClassDossier.tsx', 'utf8');

test('Klassendossier: Verhalten 1 ist grafisch oben, 5 unten', () => {
  // The default Recharts Y axis maps high numeric coordinates to the TOP.
  // Plot raw rank 1 as coordinate 5 and raw rank 5 as coordinate 1.
  const plotted = [1, 2, 3, 4, 5].map(rank => behaviorChartCoordinate(rank, 5));
  assert.deepEqual(plotted, [5, 4, 3, 2, 1]);
  assert.equal(behaviorChartCoordinate(1, 5), 5);
  assert.equal(behaviorChartCoordinate(5, 5), 1);
  assert.equal(behaviorChartCoordinate(3.5, 5), 2.5);
  assert.equal(behaviorChartCoordinate(null, 5), null);
  assert.equal(behaviorChartCoordinate(Number.NaN, 5), null);
  assert.equal(behaviorChartCoordinate(1, 1), null);
  for (const rank of [1, 2, 3, 4, 5]) {
    assert.equal(behaviorChartCoordinate(behaviorChartCoordinate(rank, 5), 5), rank,
      'Tick label and tooltip always return the actual feedback stage');
  }
  assert.deepEqual([1, 3, 5, 7].map(rank => behaviorChartCoordinate(rank, 7)), [7, 5, 3, 1],
    'custom stage counts are handled without changing saved ranks');
});

test('Klassendossier: diagram reverses only coordinates, not source behavior or tooltip', () => {
  assert.match(dossier, /behavior: metrics\.behaviorAverage/);
  assert.match(dossier, /behaviorPlot: behaviorChartCoordinate\(metrics\.behaviorAverage, behaviorScaleMax\)/);
  assert.match(dossier, /<Line type="monotone" dataKey="behaviorPlot"/);
  assert.match(dossier, /tickFormatter=\{value => String\(behaviorChartCoordinate\(Number\(value\), behaviorScaleMax\)\)\}/);
  assert.match(dossier, /<Tooltip formatter=\{\(value: any\) => \[fmt\(behaviorChartCoordinate\(Number\(value\), behaviorScaleMax\)\), 'Verhalten'\]\}/);
  assert.match(dossier, /1 = sehr positiv \(oben\)/);
  assert.match(dossier, /Unterstützungsbedarf \(unten\)/);
  assert.doesNotMatch(dossier, /<YAxis reversed interval=\{0\}/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SORTING_WIDGET_SETTINGS,
  describeSortingMistake,
  formatSortingNumber,
  generateSortingNumbers,
  getSortingTarget,
  normalizeSortingWidgetSettings,
} from './sortingWidgetModel';

test('sorting settings normalize to classroom-safe defaults', () => {
  assert.deepEqual(normalizeSortingWidgetSettings(null), DEFAULT_SORTING_WIDGET_SETTINGS);
  assert.deepEqual(normalizeSortingWidgetSettings({
    rangeKey: 'negative',
    direction: 'desc',
    count: 7,
    soundEnabled: false,
  }), {
    rangeKey: 'negative',
    direction: 'desc',
    count: 7,
    soundEnabled: false,
  });
});

test('sorting numbers stay unique and inside the configured range', () => {
  let cursor = 0;
  const samples = [0, 0.11, 0.25, 0.49, 0.7, 0.9, 0.99];
  const numbers = generateSortingNumbers({
    rangeKey: '20',
    direction: 'asc',
    count: 7,
    soundEnabled: true,
  }, () => samples[cursor++ % samples.length]);

  assert.equal(numbers.length, 7);
  assert.equal(new Set(numbers).size, 7);
  assert.ok(numbers.every(value => value >= 1 && value <= 20));
});

test('sorting target respects both directions', () => {
  assert.deepEqual(getSortingTarget([7, 2, 9, 4], 'asc'), [2, 4, 7, 9]);
  assert.deepEqual(getSortingTarget([7, 2, 9, 4], 'desc'), [9, 7, 4, 2]);
});

test('decimal display and mistake feedback are child-readable', () => {
  assert.equal(formatSortingNumber(4.5), '4,5');
  assert.equal(describeSortingMistake(12, 7, 'asc'), '12 ist noch zu groß. Suche eine kleinere Zahl.');
  assert.equal(describeSortingMistake(4, 9, 'desc'), '4 ist noch zu klein. Suche eine größere Zahl.');
});

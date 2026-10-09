import test from 'node:test';
import assert from 'node:assert/strict';
import { createWordgrid, readWordgridSelection, type WordgridDifficulty } from './wordgridGame';

test('Every requested word is actually reachable in every difficulty, including nine-letter words', () => {
  for (const difficulty of ['easy', 'medium', 'hard'] as WordgridDifficulty[]) {
    for (const random of [() => 0, () => 0.999999, Math.random]) {
      for (let repeat = 0; repeat < 30; repeat++) {
        const { grid, words } = createWordgrid(difficulty, random);
        assert.equal(words.length, difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 5);
        for (const word of words) {
          const lines = [...grid.map(row => row.join('')), ...grid[0].map((_, col) => grid.map(row => row[col]).join(''))];
          assert.ok(lines.some(line => line.includes(word)), `${difficulty}: missing ${word}`);
        }
      }
    }
  }
});

test('A selection must form a contiguous straight line, not arbitrary matching letters', () => {
  const grid = [['B', 'A', 'U', 'M'], ['A', 'X', 'X', 'X'], ['U', 'X', 'X', 'X'], ['M', 'X', 'X', 'X']];
  assert.equal(readWordgridSelection(grid, ['0-3', '0-2', '0-1', '0-0']), 'BAUM');
  assert.equal(readWordgridSelection(grid, ['3-0', '2-0', '1-0', '0-0']), 'BAUM');
  assert.equal(readWordgridSelection(grid, ['0-0', '0-1', '2-0', '0-3']), null);
  assert.equal(readWordgridSelection(grid, ['0-0', '0-0']), null);
  assert.equal(readWordgridSelection(grid, ['8-8']), null);
});

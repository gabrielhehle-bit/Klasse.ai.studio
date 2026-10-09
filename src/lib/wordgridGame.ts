export type WordgridDifficulty = 'easy' | 'medium' | 'hard';

export const WORDGRID_POOLS = {
  easy: ['BUCH', 'KIND', 'HEFT', 'TAFEL', 'MAUS', 'TIER', 'BAUM'],
  medium: ['SCHULE', 'LERNEN', 'SPIEL', 'KLASSE', 'STIFT', 'HEUTE', 'TINTE'],
  hard: ['SCHREIBEN', 'RECHNEN', 'FERIEN', 'LEHRER', 'WISSEN', 'FREUNDE', 'ZEICHNEN'],
};

export function createWordgrid(difficulty: WordgridDifficulty, random = Math.random) {
  const size = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 6 : 9;
  const count = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 5;
  const shuffle = <T,>(values: T[]) => {
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.min(i, Math.floor(Math.max(0, random()) * (i + 1)));
      [values[i], values[j]] = [values[j], values[i]];
    }
    return values;
  };
  const words = shuffle([...WORDGRID_POOLS[difficulty]]).slice(0, count);
  const lanes = shuffle(Array.from({ length: size }, (_, i) => i));
  const vertical = random() < 0.5;
  const grid = Array.from({ length: size }, () => Array<string>(size).fill(''));
  // A separate row/column for each word guarantees placement even for a
  // constant random source. Padding and unused lanes remain random letters.
  words.forEach((word, index) => {
    const start = Math.min(size - word.length, Math.floor(Math.max(0, random()) * (size - word.length + 1)));
    [...word].forEach((letter, offset) => {
      grid[vertical ? start + offset : lanes[index]][vertical ? lanes[index] : start + offset] = letter;
    });
  });
  for (const row of grid) {
    for (let col = 0; col < size; col++) {
      if (!row[col]) row[col] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.min(25, Math.floor(Math.max(0, random()) * 26))];
    }
  }
  return { grid, words };
}

export function readWordgridSelection(grid: string[][], keys: string[]): string | null {
  if (!keys.length || new Set(keys).size !== keys.length) return null;
  const cells = keys.map(key => key.split('-').map(Number)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (cells.some(([r, c]) => !Number.isInteger(r) || !Number.isInteger(c) || !grid[r]?.[c])) return null;
  const horizontal = cells.every(([r, c], i) => r === cells[0][0] && c === cells[0][1] + i);
  const vertical = cells.every(([r, c], i) => r === cells[0][0] + i && c === cells[0][1]);
  return horizontal || vertical ? cells.map(([r, c]) => grid[r][c]).join('') : null;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { numberLineValueAtClick, parseWholeNumberAnswer } from './mathWidgetInteraction';

const zahlenraum = readFileSync('src/components/cockpit/widgets/ZahlenraumStudio.tsx', 'utf8');
const kopfrechnen = readFileSync('src/components/cockpit/widgets/KopfrechenStudio.tsx', 'utf8');
const brueche = readFileSync('src/components/cockpit/widgets/FractionVisualizer.tsx', 'utf8');

 test('17 Zahlenraum: number line ignores tiny widths and clamps both ends', () => {
  assert.equal(numberLineValueAtClick(50, 80, 0, 100), null);
  assert.equal(numberLineValueAtClick(50, 0, 0, 100), null);
  assert.equal(numberLineValueAtClick(50, NaN, 0, 100), null);
  assert.equal(numberLineValueAtClick(50, 200, 100, 100), null);
  assert.equal(numberLineValueAtClick(0, 200, 0, 100), 0);
  assert.equal(numberLineValueAtClick(100, 200, 0, 100), 50);
  assert.equal(numberLineValueAtClick(200, 200, 0, 100), 100);
  assert.match(zahlenraum, /persist\\(\\{ range: r, markers: nextMarkers, jumps: safeJumps \\}\\)/);
  assert.match(zahlenraum, /if \\(computedVal === null\\) return/);
});

test('18 Kopfrechnen: strict answers and focused controls do not skip problems', () => {
  for (const invalid of ['', ' ', '12abc', '12.5', '1 2', '-1', 'Infinity', '9007199254740992']) {
    assert.equal(parseWholeNumberAnswer(invalid), null, invalid);
  }
  assert.equal(parseWholeNumberAnswer('0'), 0);
  assert.equal(parseWholeNumberAnswer(' 12 '), 12);
  assert.match(kopfrechnen, /const num = parseWholeNumberAnswer\\(studentInput\\)/);
  assert.match(kopfrechnen, /target\\.closest\\('button, select, textarea, \\[contenteditable="true"\\]'\\)/);
  assert.match(kopfrechnen, /maxLength=\\{5\\}/);
  assert.match(kopfrechnen, /onUpdate\\?\\.\\(\\{ settings: \\{ \\.\\.\\.\\(widget\\?\\.settings \\|\\| \\{\\}\\)/);
});

test('19 Brüche: circle slices work with keyboard and preserve legacy widget fields', () => {
  assert.match(brueche, /role=\\{interactive && onSliceClick \\? 'button' : undefined\\}/);
  assert.match(brueche, /tabIndex=\\{interactive && onSliceClick \\? 0 : -1\\}/);
  assert.match(brueche, /event\\.key === 'Enter' \\|\\| event\\.key === ' '/);
  assert.match(brueche, /aria-pressed=\\{interactive && onSliceClick \\? isFilled : undefined\\}/);
  assert.match(brueche, /onUpdate\\?\\.\\(\\{ settings: \\{ \\.\\.\\.\\(widget\\?\\.settings \\|\\| \\{\\}\\)/);
});

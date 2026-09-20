import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const board = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const print = readFileSync('src/components/PrintCenter.tsx', 'utf8');

test('Synced board state cannot be overwritten by a delayed local font persistence effect', () => {
  assert.doesNotMatch(board, /Only update app state if font actually changed and differs from app state/);
  assert.doesNotMatch(board, /\}, 50\);\s*return \(\) => clearTimeout\(timeout\);/);
  assert.match(board, /activeFont: tpl\.activeFont \|\| prev\.boardSettings\?\.activeFont/);
});

test('Print Center classbook option changes do not silently revert selected print font', () => {
  const start = print.indexOf("if (activeTemplate === 'klassenbuch') {");
  assert.ok(start >= 0);
  const block = print.slice(start, start + 360);
  assert.doesNotMatch(block, /setPrintFontSize/);
  assert.match(print, /onClick=\{\(\) => setPrintFontSize\(sz\.id as any\)\}/);
});

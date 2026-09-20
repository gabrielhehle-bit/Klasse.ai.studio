import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const printCenter = readFileSync('src/components/PrintCenter.tsx', 'utf8');

test('Vier globale Farbschemata ändern Vorschau und echten Browserdruck, nicht nur den Auswahlbutton', () => {
  assert.match(printCenter, /data-print-theme=\{printTheme\}/);
  assert.match(printCenter, /kl-print-sheet bg-white font-sans/);
  assert.match(printCenter, /kl-print-sheet print-center-overlay hidden print:block/);
  for (const palette of ['monochrome', 'slate', 'indigo', 'emerald']) {
    assert.match(printCenter, new RegExp(`data-print-theme="${palette}"`));
  }
  assert.match(printCenter, /\.kl-print-sheet\s*\{\s*background-color:\s*var\(--kl-print-paper\)\s*!important/);
  assert.match(printCenter, /@media print\s*\{\s*body\.print-center-active \.print-center-overlay-parent\[data-print-theme\]/);
});

test('Tischschilder übernehmen die gewählte Papier- und Schriftfarbe in Bildschirmvorschau und Druck', () => {
  assert.match(printCenter, /kl-print-tisch w-full aspect-\[297\/210\]/);
  assert.match(printCenter, /\.kl-print-sheet \.kl-print-tisch\s*\{\s*background-color:\s*var\(--kl-print-soft\)\s*!important/);
  assert.match(printCenter, /\.kl-print-tisch h3,\s*\.print-center-overlay-parent\[data-print-theme\] \.kl-print-sheet \.kl-print-tisch h4/);
  assert.match(printCenter, /print-color-adjust:\s*exact\s*!important/);
});

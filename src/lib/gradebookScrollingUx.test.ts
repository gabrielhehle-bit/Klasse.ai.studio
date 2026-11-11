import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gradebook = readFileSync('src/components/Gradebook.tsx', 'utf8');

test('gradebook table keeps a visible, keyboard-accessible two-axis scroll region', () => {
  assert.match(gradebook, /data-gradebook-scroll-container role="region" tabIndex=\{0\}/);
  assert.match(gradebook, /gradebook-scroll-area w-full max-h-\[72dvh\] overflow-auto/);
  assert.match(gradebook, /ref=\{gradebookScrollRef\} onScroll=\{updateGradebookScrollEdges\}/);
  assert.doesNotMatch(gradebook, /overflow-x-auto relative no-scrollbar rounded-2xl border border-slate-200 shadow-sm bg-white/);
  assert.match(gradebook, /\.gradebook-scroll-area thead \{ position: sticky; top: 0; z-index: 55; \}/);
  assert.match(gradebook, /\.gradebook-scroll-area \{ max-height: none !important; overflow: visible !important/);
});

test('scroll controls reflect actual horizontal overflow and are keyboard reachable', () => {
  assert.match(gradebook, /data-gradebook-scroll-controls/);
  assert.match(gradebook, /element\.scrollLeft \+ element\.clientWidth < element\.scrollWidth - 2/);
  assert.match(gradebook, /ResizeObserver\(updateGradebookScrollEdges\)/);
  assert.match(gradebook, /aria-label="Notentabelle nach links scrollen"/);
  assert.match(gradebook, /aria-label="Notentabelle nach rechts scrollen"/);
  assert.match(gradebook, /disabled=\{!gradebookScrollEdges\.left\}/);
  assert.match(gradebook, /disabled=\{!gradebookScrollEdges\.right\}/);
});

test('compact row control is view-only and original grade calculations remain in place', () => {
  assert.match(gradebook, /const \[denseGradebookRows, setDenseGradebookRows\] = useState\(true\)/);
  assert.match(gradebook, /setDenseGradebookRows\(value => !value\)/);
  assert.match(gradebook, /gradebook-table--dense tbody td/);
  assert.match(gradebook, /berechne\(app, s\.id, activeFach, sem\)/);
  const displayControl = gradebook.split('data-gradebook-scroll-controls')[1].split('data-gradebook-scroll-container')[0];
  assert.doesNotMatch(displayControl, /setApp\(/);
});

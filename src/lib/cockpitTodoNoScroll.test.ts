import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getTodoRowsPerPage, getTodoPageWindow } from '../components/cockpit/todoLayout';

const todo = readFileSync('src/components/cockpit/widgets/TodoWidget.tsx', 'utf8');
const sizes = readFileSync('src/components/cockpit/widgetLayout.ts', 'utf8');

test('To-do sizing retains one page item on a compact board and budgets for controls', () => {
  assert.equal(getTodoRowsPerPage(360, true, false, false), 1);
  assert.equal(getTodoRowsPerPage(500, false, false, false), 3);
  assert.equal(getTodoRowsPerPage(500, false, true, false), 1);
  assert.equal(getTodoRowsPerPage(180, true, false, false), 1);
  assert.match(sizes, /todo: \{ minW: 340, minH: 360, prefW: 460, prefH: 500 \}/);
});

test('All To-do items remain addressable using previous/next pages', () => {
  const rows = 3;
  const pages = Array.from({ length: 9 }, (_, page) => getTodoPageWindow(25, rows, page));
  assert.equal(pages[0].pageCount, 9);
  assert.deepEqual(pages.map(page => page.firstVisibleItem), [0, 3, 6, 9, 12, 15, 18, 21, 24]);
  assert.deepEqual(getTodoPageWindow(25, rows, 100), pages[8]);
  assert.deepEqual(getTodoPageWindow(25, rows, -12), pages[0]);
  assert.deepEqual(getTodoPageWindow(0, rows, 3), { pageCount: 1, visiblePage: 0, firstVisibleItem: 0 });
});

test('To-do task area pages instead of invisibly scrolling or truncating tasks', () => {
  assert.match(todo, /getTodoPageWindow\(state\.items\.length, rowsPerPage, page\)/);
  assert.match(todo, /state\.items\.slice\(firstVisibleItem, firstVisibleItem \+ rowsPerPage\)/);
  assert.match(todo, /aria-label="Aufgabenseiten"/);
  assert.match(todo, /aria-label="Vorherige Aufgabenseite"/);
  assert.match(todo, /aria-label="Nächste Aufgabenseite"/);
  assert.doesNotMatch(todo, /flex-1 overflow-y-auto min-h-0 space-y-2 pr-1 my-1/);
  assert.match(todo, /cursor-pointer break-words whitespace-normal leading-snug/);
});

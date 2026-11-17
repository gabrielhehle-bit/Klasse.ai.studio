import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name: string) => readFileSync('src/components/' + name, 'utf8');
const button = read('ui/Button.tsx');
const iconButton = read('ui/IconButton.tsx');
const segmented = read('ui/SegmentedControl.tsx');
const input = read('ui/Input.tsx');
const select = read('ui/Select.tsx');
const textarea = read('ui/Textarea.tsx');
const chip = read('ui/Chip.tsx');
const empty = read('EmptyState.tsx');

test('Shared KLASSIO buttons keep the same semantic theme and phone-size touch target', () => {
  assert.match(button, /min-h-\[44px\] px-3 py-1\.5 text-sm sm:min-h-\[34px\]/);
  assert.match(button, /md: 'min-h-\[44px\]/);
  assert.match(button, /focus-visible:ring-2 focus-visible:ring-\[var\(--focus-ring,var\(--accent\)\)\]/);
  assert.match(button, /type = 'button'/);
  assert.match(iconButton, /'aria-label': string/);
  assert.match(iconButton, /sm: 'w-11 h-11 min-w-\[44px\] min-h-\[44px\]/);
  assert.match(iconButton, /disabled=\{isDisabled\}/);
});

test('Shared small forms are readable on mobile without changing controlled values', () => {
  assert.match(input, /min-h-\[44px\].*text-base sm:min-h-\[36px\] sm:text-xs/);
  assert.match(select, /min-h-\[44px\].*text-base sm:min-h-\[36px\] sm:text-xs/);
  assert.match(textarea, /text-base sm:text-sm/);
  for (const component of [input, select, textarea]) {
    assert.match(component, /aria-invalid=\{isError \? true : undefined\}/);
    assert.match(component, /aria-describedby=\{/);
    assert.match(component, /focus:outline-none/);
  }
});

test('Shared segmented tabs support both touch and keyboard without selecting disabled items', () => {
  assert.match(segmented, /min-h-11 px-3 py-1 text-sm rounded-lg sm:min-h-\[34px\]/);
  assert.match(segmented, /min-h-11 px-4 py-1\.5/);
  assert.match(segmented, /role="tablist"/);
  assert.match(segmented, /role="tab"/);
  assert.match(segmented, /tabIndex=\{isSelected \? 0 : -1\}/);
  assert.match(segmented, /ArrowRight.*ArrowLeft.*ArrowDown.*ArrowUp.*Home.*End/);
  assert.match(segmented, /options\.filter\(candidate => !candidate\.disabled\)/);
  assert.match(segmented, /enabledTabs\?\.\[nextIndex\]\?\.focus\(\)/);
  assert.match(segmented, /onChange\(enabledOptions\[nextIndex\]\.value\)/);
});

test('Dismissible chips and shared empty states keep meaningful, accessible actions', () => {
  assert.match(chip, /aria-label=\{dismissAriaLabel\}/);
  assert.match(chip, /min-h-11 min-w-11 items-center justify-center/);
  assert.match(chip, /onDismiss\(\)/);
  assert.match(empty, /data-klassio-empty-state/);
  assert.match(empty, /border-\[var\(--border\)\] bg-\[var\(--surface2\)\]/);
  assert.match(empty, /actionLabel && onAction/);
  assert.match(empty, /min-h-11 items-center justify-center/);
  assert.match(empty, /focus-visible:outline-2/);
  assert.doesNotMatch(empty, /animate-pulse|group-hover:scale-110|text-\[10px\]/);
});

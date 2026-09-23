import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeClassTimerSeconds, MAX_CLASS_TIMER_SECONDS } from './classTimerInput';
import { instructionTextPages, instructionChecklistWindow } from './instructionPaging';

const timer = readFileSync('src/components/cockpit/widgets/TimerWidget.tsx', 'utf8');
const timeline = readFileSync('src/components/cockpit/widgets/TimelineWidget.tsx', 'utf8');
const instruction = readFileSync('src/components/cockpit/widgets/InstructionWidget.tsx', 'utf8');

test('Widget 5 Zeit accepts safe values only; never starts an invalid or unbounded countdown', () => {
  assert.equal(normalizeClassTimerSeconds('0', '1'), 1);
  assert.equal(normalizeClassTimerSeconds('5', '30'), 330);
  assert.equal(normalizeClassTimerSeconds('720', '0'), MAX_CLASS_TIMER_SECONDS);
  for (const values of [['', '0'], ['0', '0'], ['5', '60'], ['1.5', '0'],
    ['-1', '30'], ['Infinity', '0'], ['99999', '1'], ['5', 'hello']]) {
    assert.throws(() => normalizeClassTimerSeconds(values[0], values[1]));
  }
  assert.match(timer, /classTimerOwnsShortcut\(containerRef\.current, target\)/);
  assert.match(timer, /tabIndex=\{0\}/);
  assert.match(timer, /customTimeError && <p role="alert"/);
  assert.match(timer, /persistSettings\(\{ preferredDuration: total \}\)/);
});

test('Widget 6 Tagesablauf stays readable with explicit pages and class-aware updates', () => {
  assert.match(timeline, /visibleUnits\.map/);
  assert.match(timeline, /Vorheriger Tagesabschnitt/);
  assert.match(timeline, /Nächster Tagesabschnitt/);
  assert.match(timeline, /app\?\.activeClassId/);
  assert.match(timeline, /currentUnit\?\.label \|\| 'Pause'/);
  assert.doesNotMatch(timeline, /overflow-x-auto/);
});

test('Widget 7 Arbeitsauftrag pages text without cutting content or hiding work steps', () => {
  for (const value of ['Kurz', 'Lies S. 30.\nSchreibe 5 Sätze.\nArbeite mit deinem Partner.',
    'EinSchwierigesWort'.repeat(35), 'eins '.repeat(400)]) {
    for (const limit of [24, 60, 175, 310]) {
      const pages = instructionTextPages(value, limit);
      assert.equal(pages.join(''), value);
      assert.ok(pages.every(page => page.length > 0 && page.length <= limit));
    }
  }
  assert.deepEqual(instructionTextPages('', 60), ['']);
  assert.deepEqual(instructionChecklistWindow(12, 0, 3),
    { page: 0, pageCount: 4, start: 0, end: 3 });
  assert.deepEqual(instructionChecklistWindow(12, 99, 3),
    { page: 3, pageCount: 4, start: 9, end: 12 });
  assert.deepEqual(instructionChecklistWindow(0, 0, 3),
    { page: 0, pageCount: 1, start: 0, end: 0 });
  assert.match(instruction, /assignmentPages\[safeTextPage\]/);
  assert.match(instruction, /draftChecklist\.slice\(checklistWindow\.start, checklistWindow\.end\)/);
  assert.match(instruction, /createPortal\(/);
  assert.match(instruction, /aria-label="Arbeitsauftrag bearbeiten"/);
  assert.match(instruction, /document\.body/);
  assert.match(instruction, /onUpdate\(\{ settings: updatedSettings \}\)/);
  assert.match(instruction, /handleToggleCheckItem/);
});

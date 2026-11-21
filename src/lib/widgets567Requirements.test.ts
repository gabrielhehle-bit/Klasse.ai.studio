import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getInstructionCountdownMinutes, normalizeClassTimerSeconds, MAX_CLASS_TIMER_SECONDS } from './classTimerInput';
import { instructionTextPages, instructionChecklistWindow } from './instructionPaging';
import { hasInstructionReference, normalizeInstructionReference } from './instructionReference';

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

test('Arbeitsauftrag starts the selected whole-minute duration and leaves free-text estimates display-only', () => {
  assert.equal(getInstructionCountdownMinutes(''), 5);
  assert.equal(getInstructionCountdownMinutes('  '), 5);
  assert.equal(getInstructionCountdownMinutes('2 Min.'), 2);
  assert.equal(getInstructionCountdownMinutes(' 10 Minuten '), 10);
  assert.equal(getInstructionCountdownMinutes('7'), 7);
  assert.equal(getInstructionCountdownMinutes('1 Minute'), 1);
  assert.equal(getInstructionCountdownMinutes('720 min'), 720);
  for (const estimate of ['0 Minuten', '-5 Min.', '2,5 Minuten', '10–15 Minuten', 'nach Bedarf', '721 Min.']) {
    assert.equal(getInstructionCountdownMinutes(estimate), null);
  }
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

test('assignment references accept optional fields and preserve school page and exercise notation', () => {
  for (const value of [undefined, null, {}, 'TRAX S. 12', { page: 12, color: 'unknown' }]) {
    assert.equal(hasInstructionReference(normalizeInstructionReference(value)), false);
  }
  const reference = normalizeInstructionReference({ material: ' TRAX-Arbeitsheft ', color: 'green', page: '12–13', exercises: '1a, 2–3' });
  assert.deepEqual(reference, { material: 'TRAX-Arbeitsheft', color: 'green', page: '12–13', exercises: '1a, 2–3' });
  assert.equal(hasInstructionReference(reference), true);
  assert.equal(hasInstructionReference(normalizeInstructionReference({ color: 'navy' })), true);
});

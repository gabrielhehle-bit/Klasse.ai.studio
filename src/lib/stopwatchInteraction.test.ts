import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const widget = readFileSync('src/components/cockpit/widgets/StopwatchWidget.tsx', 'utf8');
const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');

test('stopwatch actions update the immediate ref before persistence', () => {
  assert.match(widget, /const commitState = useCallback\([\s\S]*stateRef\.current = next;[\s\S]*setState\(next\);[\s\S]*persistState\(next\)/);
  assert.match(widget, /const handleLap = useCallback\([\s\S]*recordLap\(stateRef\.current, now\)[\s\S]*commitState\(next, now\)/);
  assert.match(widget, /const handlePause = useCallback\([\s\S]*pauseStopwatch\(stateRef\.current, now\)[\s\S]*commitState\(next, now\)/);
});

test('stopwatch does not persist from a rerender cleanup effect', () => {
  assert.doesNotMatch(widget, /Auto-Persist beim Unmounten/);
  assert.match(widget, /const onUpdateRef = useRef\(onUpdate\)/);
  assert.match(widget, /onUpdateRef\.current\(\{/);
});

test('cockpit merges stopwatch settings instead of replacing concurrent settings snapshots', () => {
  assert.match(cockpit, /w\.type === "stopwatch" && updates\.settings/);
  assert.match(cockpit, /settings: \{ \.\.\.\(w\.settings \|\| \{\}\), \.\.\.updates\.settings \}/);
});

test('running stopwatch exposes clear Runde and Stopp actions', () => {
  assert.match(widget, /data-stopwatch-action="lap"[\s\S]*<span>Runde<\/span>/);
  assert.match(widget, /data-stopwatch-action="stop"[\s\S]*<span>Stopp<\/span>/);
  assert.match(widget, /setShowCompactLaps\(true\)/);
});

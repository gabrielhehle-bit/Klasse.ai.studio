import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PLANNED_COCKPIT_WIDGETS } from '../components/cockpit/plannedCockpitCatalog';

const read = (name: string) => readFileSync('src/components/cockpit/widgets/' + name + '.tsx', 'utf8');
const sounds = read('SoundsWidget');
const reward = read('ClassRewardWidget');
const timer = read('TimerWidget');
const frame = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');
const viewport = readFileSync('src/lib/widgetViewport.ts', 'utf8');

test('All 20 selected cockpit widgets are still served by the measured and scroll-reachable frame', () => {
  assert.equal(PLANNED_COCKPIT_WIDGETS.length, 20);
  assert.equal(new Set(PLANNED_COCKPIT_WIDGETS.map(w => w.id)).size, 20);
  assert.match(frame, /ref=\{contentViewportRef\}/);
  assert.match(frame, /data-widget-content=\{widget\.type\}/);
  assert.match(frame, /overflow: WIDGET_VIEWPORT_OVERFLOW/);
  assert.match(viewport, /WIDGET_VIEWPORT_OVERFLOW = 'auto'/);
});

test('All six classroom sounds remain visible on compact widgets and use available grid height', () => {
  assert.match(sounds, /compactGrid = size\.width < 410 \|\| size\.height < 300/);
  assert.match(sounds, /grid h-full min-h-0 w-full grid-cols-3 grid-rows-2/);
  assert.match(sounds, /CLASSROOM_SOUNDS\.map\(\(sound\) =>/);
  assert.doesNotMatch(sounds, /CLASSROOM_SOUNDS\.slice\(/);
  assert.match(sounds, /min-h-11 min-w-0 flex-col/);
  assert.match(sounds, /aria-label=\{sound\.label\}/);
  assert.match(sounds, /showDescriptions = size\.width >= 550 && size\.height >= 360/);
});

test('Class goal visualizations grow with inner width and height rather than fixed 160px ceilings', () => {
  assert.match(reward, /visualSize = Math\.max\(84, Math\.min\(size\.width \* 0\.68, size\.height - 142, 480\)\)/);
  assert.match(reward, /style=\{\{ width: visualSize, maxWidth: '100%', maxHeight: '100%' \}\}/);
  assert.match(reward, /width: Math\.max\(32, Math\.min\(72, size\.width \* 0\.13\)\)/);
  assert.match(reward, /width: visualSize, height: visualSize/);
  assert.doesNotMatch(reward, /max-h-\[160px\]/);
  assert.match(reward, /id="reward-add-btn"/);
  assert.match(reward, /id="reward-correction-btn"/);
});

test('Timer uses its measured content rectangle for the ring and digits without resizing controls', () => {
  assert.match(timer, /ringPixels = Math\.max\(92, Math\.min\(size\.width \* 0\.68, size\.height - 214, 440\)\)/);
  assert.match(timer, /style=\{\{ width: ringPixels, height: ringPixels/);
  assert.match(timer, /style=\{\{ fontSize: clockTextPixels \}\}/);
  assert.doesNotMatch(timer, /w-36 h-36 max-h-\[38vh\]/);
  assert.match(timer, /veryCompactTimer \? 'min-h-\[40px\]' : 'min-h-\[44px\]'/);
});

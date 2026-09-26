import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PLANNED_COCKPIT_WIDGETS } from '../components/cockpit/plannedCockpitCatalog';

const read = (name: string) => readFileSync('src/components/cockpit/widgets/' + name + '.tsx', 'utf8');
const frame = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');
const css = readFileSync('src/index.css', 'utf8');
const wheel = read('WheelWidget');
const homework = read('HomeworkWidget');
const stars = read('StarsReviewWidget');

test('Every current and legacy widget uses the same measured and theme-safe cockpit frame', () => {
  assert.equal(PLANNED_COCKPIT_WIDGETS.length, 20);
  assert.match(frame, /data-widget-ux="v3"/);
  assert.match(frame, /data-widget-density=\{viewportDensity\}/);
  assert.match(frame, /data-widget-content=\{widget\.type\}/);
  assert.match(frame, /ref=\{contentViewportRef\}/);
  assert.match(frame, /observer\.observe\(viewport\)/);
  assert.match(frame, /viewportDensity === "tight" && !isFreeMascot/);
  assert.match(frame, /viewportDensity !== "tight"/);
  assert.match(css, /button\.text-white:not\(:disabled\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /-webkit-text-fill-color: #ffffff !important;/);
  // This PR must not rename widget types, reinterpret old settings, or mutate
  // persisted class layouts while implementing presentation changes.
  assert.match(frame, /!WIDGET_MIN_SIZES\[widget\.type\]/);
  assert.match(frame, /transform: `scale\(\$\{contentScale\}\)`/);
});

test('Wheel measures real drawing area and keeps controls finger-sized', () => {
  assert.match(wheel, /const wheelAreaRef = useRef<HTMLDivElement>\(null\)/);
  assert.match(wheel, /observer\.observe\(wheelArea\)/);
  assert.match(wheel, /ref=\{wheelAreaRef\}/);
  assert.match(wheel, /wheelAreaSize\.width \|\| containerSize\.width - 16/);
  assert.match(wheel, /wheelAreaSize\.height \|\| containerSize\.height - 108/);
  assert.ok(wheel.includes("min-h-11 min-w-11 p-1 rounded-lg border"));
  assert.ok(wheel.includes("min-h-11 min-w-11 px-1.5 rounded-lg border"));
  assert.ok(wheel.includes("className={`w-full ${isXL ? 'min-h-14 text-lg' : isLarge ? 'min-h-12 text-base' : 'min-h-11 text-xs sm:text-sm'} rounded-lg font-black"));
  assert.match(wheel, /availableIndices\.map\(index => baseItems\[index\]\)/);
  assert.doesNotMatch(wheel, /containerSize\.height - 93/);
});

test('Homework shows one wide task column in compact widgets, and retains private notes exclusion', () => {
  assert.match(homework, /const compact = size\.width < 760 \|\| size\.height < 400/);
  assert.match(homework, /const roomy = size\.width >= 980 && size\.height >= 520/);
  assert.match(homework, /const columns = size\.width >= 1280 \? 3 : size\.width >= 760 \? 2 : 1/);
  assert.match(homework, /<HomeworkList items=\{items\} compact=\{compact\} roomy=\{roomy\} columns=\{columns\} \/>/);
  assert.match(homework, /overflow-y-auto overscroll-contain/);
  assert.match(homework, /classroom-homework-widget/);
  assert.match(css, /html body \.classroom-homework-widget > header/);
  assert.match(homework, /Read-only pupil-safe rendering: no names, grades or private teacher notes/);
});

test('Star presentation keeps full pupil names without changing opt-in privacy or values', () => {
  assert.match(stars, /const compact = size\.width < 620 \|\| size\.height < 420/);
  assert.match(stars, /min-w-0 break-words \[overflow-wrap:anywhere\] font-extrabold/);
  assert.doesNotMatch(stars, /min-w-0 truncate text-base font-extrabold/);
  assert.match(stars, /const \[presenting, setPresenting\] = useState\(false\)/);
  assert.match(stars, /onClick=\{\(\) => setPresenting\(true\)\}/);
  assert.match(stars, /aggregateStarsReview\(children, logs, settings, today\)/);
});

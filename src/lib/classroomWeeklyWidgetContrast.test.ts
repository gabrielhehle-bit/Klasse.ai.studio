import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const widget = readFileSync('src/components/cockpit/widgets/ClassroomWeeklyPlanWidget.tsx', 'utf8');
const css = readFileSync('src/index.css', 'utf8');

// Both the user-selected profile accent and dark app themes may recolor generic
// Tailwind text utilities. The children's primary action needs its own
// contrast-safe foreground, including Chromium/WebKit text painting.
test('Wochenplan: finished button keeps white text on dark blue under every app theme', () => {
  assert.match(widget, /className=\{\`weekly-plan-dark-action w-full/);
  assert.match(widget, /<span className="weekly-plan-action-label">✅ Ich bin fertig mit einer Aufgabe<\/span>/);
  assert.match(css, /html body \[data-style\] \.classroom-weekly-plan button\.weekly-plan-dark-action \{/);
  assert.match(css, /-webkit-text-fill-color: #ffffff !important;/);
  assert.match(css, /button\.weekly-plan-dark-action :is\(span, svg\)/);
  assert.doesNotMatch(widget, /disabled:opacity-45/);
});

test('Wochenplan: disabled finish action has a legible distinct state', () => {
  assert.match(widget, /disabled=\{!tasks\.length \|\| !pupils\.length\}/);
  assert.match(css, /button\.weekly-plan-dark-action:disabled \{/);
  assert.match(css, /background-color: #e0e7ff !important;/);
  assert.match(css, /-webkit-text-fill-color: #312e81 !important;/);
  assert.match(css, /button\.weekly-plan-dark-action:disabled :is\(span, svg\)/);
});

test('Wochenplan: narrow or short widgets prioritize task space and keep the action reachable', () => {
  assert.match(widget, /const compactBoard = !isExpanded && \(size\.width < 760 \|\| size\.height < 560\)/);
  assert.match(widget, /aria-label="Aufgaben dieser Woche"/);
  assert.match(widget, /overflow-y-auto overscroll-contain/);
  assert.match(widget, /compactBoard \? "p-1\.5" : "p-3 sm:p-4"/);
  assert.match(widget, /compactBoard \? "p-1\.5" : "p-3 sm:px-5"/);
  assert.match(widget, /aria-label="Wochenplan groß anzeigen"/);
  assert.match(widget, /aria-label="Aktuelle Woche anzeigen"/);
  assert.match(widget, /className=\{\`weekly-plan-dark-action w-full w-full/);
  assert.match(widget, /size\.width >= 860 && size\.height >= 470/);
  assert.match(widget, /selectionScope === scope/);
  assert.match(widget, /updateChildWeeklyFeedback\(previous\.schueler, savedStudent, currentTask, feedback\)/);
});

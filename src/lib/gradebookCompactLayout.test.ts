import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/components/Gradebook.tsx', 'utf8');

test('gradebook uses a table-first compact workspace instead of stacking multiple full-width toolbars', () => {
  assert.match(source, /data-gradebook data-gradebook-fullscreen=\{isFullscreen\} className=\{\`min-w-0 space-y-2 pb-6/);
  assert.match(source, /data-gradebook-header className="rounded-xl border border-slate-200 bg-white px-3 py-2\.5/);
  assert.match(source, /data-gradebook-compact-toolbar/);
  assert.match(source, /data-gradebook-assessment-filters/);
  assert.match(source, /data-gradebook-grading-summary/);
  assert.match(source, /data-gradebook-scroll-controls/);
  assert.equal((source.match(/data-gradebook-scroll-controls/g) || []).length, 1,
    'row density and table arrows belong to the same single compact toolbar');
  assert.doesNotMatch(source, /Tabelle scrollen · Namen und Überschriften bleiben sichtbar<\/span>/);
});

test('weight explanations stay available without permanently occupying the gradebook', () => {
  assert.match(source, /<details data-gradebook-weight-details/);
  assert.match(source, /Gewichtung &amp; Punkte einstellen/);
  assert.match(source, /Das ist kein amtlicher Notenschlüssel/);
  assert.match(source, /data-gradebook-compact-toolbar className="relative z-\[80\]/);
  const toolbar = source.split('data-gradebook-compact-toolbar')[1].split('{isolatedCol && (() => {')[0];
  assert.doesNotMatch(toolbar, /setApp\(/, 'display controls cannot rewrite persisted assessment records');
});

test('names are single line and extra row actions remain reachable with mouse and keyboard', () => {
  assert.match(source, /\{s\.nachname\} \{s\.vorname\}<\/span>/);
  assert.match(source, /min-w-0 truncate whitespace-nowrap text-slate-900/);
  assert.match(source, /\[data-gradebook-row-actions\]/);
  assert.match(source, /tbody tr:focus-within \[data-gradebook-row-actions\]/);
  assert.match(source, /countsInClassAverage\(app, s, activeFach\)/);
  assert.match(source, /setSelectedTrendStudentId\(s\.id\)/);
  assert.match(source, /aria-label=\{\`\$\{nd\.freitext/);
});

test('visible assessment fields are still genuine saved-grade inputs with keyboard navigation', () => {
  assert.match(source, /\.gradebook-table--dense input\[data-col\] \{/);
  assert.match(source, /\.gradebook-table--dense input\[data-col\]:focus/);
  assert.match(source, /data-gradebook-scroll-container role="region" tabIndex=\{0\}/);
  assert.match(source, /aria-describedby="gradebook-keyboard-hint"/);
  assert.match(source, /getAssessmentItemMode\(app, activeFach, 'lzk', idx\)/);
  assert.match(source, /onCommit=\{\(val\) => setNote\(s\.id, 'lzk', idx, val\)\}/);
  assert.match(source, /berechne\(app, s\.id, activeFach, sem\)/);
  assert.match(source, /disabled=\{!gradebookScrollEdges\.left\}/);
  assert.match(source, /disabled=\{!gradebookScrollEdges\.right\}/);
});

test('assessment columns show entry coverage and keep points/weights read only', () => {
  const from = source.indexOf('const renderColHeader = ');
  const to = source.indexOf('if (showDetailedAnalysis)', from);
  assert.ok(from >= 0 && to > from);
  const header = source.slice(from, to);
  assert.match(header, /summarizeAssessmentColumnCoverage\(/);
  assert.match(header, /value: values\?\.\[i\]/);
  assert.match(header, /exempt: typ === 'lzk' && nd\?\.lzkParticipation\?\.\[i\] === false/);
  assert.match(header, /data-gradebook-column-coverage/);
  assert.match(header, /\$\{coverage.entered\}\/\$\{coverage.expected\} erfasst/);
  assert.match(header, /coverage.missing > 0/);
  assert.match(header, /coverage.exempt/);
  assert.match(header, /getMaxPoints\(app, activeFach, typ, i\)/);
  assert.match(header, /getAssessmentItemMode\(app, activeFach, typ, i\)/);
  assert.doesNotMatch(header, /setApp\(/);
  assert.doesNotMatch(header, /setNote\(/);
});

test('gradebook treats old placeholder x consistently as a missing assessment', () => {
  const from = source.indexOf('const hasAnyAssessment = ');
  const to = source.indexOf('const getHighlightClass = ', from);
  assert.ok(from >= 0 && to > from);
  const detection = source.slice(from, to);
  assert.match(detection, /!isAssessmentValueMissing\(value\)/);
  assert.doesNotMatch(detection, /value !== "x"/);
});

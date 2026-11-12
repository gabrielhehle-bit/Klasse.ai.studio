import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sheet = readFileSync('src/components/KELParentReport.tsx', 'utf8');
const print = readFileSync('src/components/PrintCenter.tsx', 'utf8');

test('KEL sheet title and pupil remain visible under the global print header rule', () => {
  // Print Center's global rule hides semantic header elements while printing.
  assert.match(print, /body\.print-center-active header,/);
  assert.match(sheet, /<div data-kel-report-head/);
  assert.doesNotMatch(sheet, /<header\b/);
  assert.match(sheet, /Lern- &amp; Entwicklungsübersicht/);
  assert.match(sheet, /\{student\.vorname\} \{student\.nachname\}/);
});

test('KEL sheet has readable body type rather than 6pt labels', () => {
  assert.doesNotMatch(sheet, /text-\[8px\]|text-\[9px\]/);
  assert.match(sheet, /text-\[11px\]/);
  assert.match(sheet, /text-\[12px\]/);
});

test('preview does not claim one page when approved long notes can wrap to another', () => {
  assert.match(print, /activeTemplate !== 'schueler_wochenplan' && activeTemplate !== 'kel_elternblatt' && <div className="mt-8/);
  assert.match(print, /Bei vielen Lernbereichen oder ausführlichen Notizen kann eine zweite Seite entstehen/);
  assert.match(sheet, /break-inside-avoid/);
});

test('private note choices are not carried to another child or another print template', () => {
  assert.match(print, /setElternblattSelectedStudentId\(event\.target\.value\);\s*setElternblattShowNotes\(false\);\s*setElternblattSharedNoteIds\(\[\]\)/);
  assert.match(print, /if \(activeTemplate === 'kel_elternblatt'\)/);
  assert.match(print, /A previous print session must never carry parent-approved private notes/);
  assert.match(print, /setElternblattShowNotes\(false\);\s*setElternblattSharedNoteIds\(\[\]\);/);
});

test('behavior bars use SVG so the global printed div height reset cannot collapse them', () => {
  assert.match(print, /body\.print-center-active \.print-center-overlay div,/);
  assert.match(sheet, /<svg data-kel-behavior-bar/);
  assert.match(sheet, /<rect x="0" y="0" width=\{row.count \/ behaviorTotal \* 100\}/);
  assert.doesNotMatch(sheet, /className="mt-0\.5 h-1\.5 overflow-hidden/);
});

test('KEL printing hides every generic PrintHeader and preserves its own heading', () => {
  assert.match(print, /print-center-kel-parent-active/);
  assert.match(print, /print-center-kel-parent-active \.global-print-header \{/);
  assert.match(print, /print-center-kel-parent-active \[data-kel-report-head\] \{/);
  assert.match(print, /data-kel-parent-print-sheet=\{activeTemplate === 'kel_elternblatt' \? true : undefined\}/);
  assert.match(sheet, /<div data-kel-report-head/);
  assert.match(sheet, /Lern- &amp; Entwicklungsübersicht/);
});

test('Chrome print preview retains the KEL report until afterprint', () => {
  assert.match(print, /const isParentSheet = activeTemplate === 'kel_elternblatt'/);
  assert.match(print, /window.addEventListener\('afterprint', closeParentPrint, \{ once: true \}\)/);
  assert.match(print, /if \(!isParentSheet\) \{\s*setTimeout\(\(\) => setPrintModeActive\(false\), 500\)/);
  assert.match(print, /document.body.classList.toggle\('print-center-kel-parent-active', printModeActive && activeTemplate === 'kel_elternblatt'\)/);
});

test('KEL charts and odd card count remain readable in the print preview', () => {
  assert.match(print, /\[data-kel-summary-grid\] > section:last-child:nth-child\(odd\)/);
  assert.match(print, /\[data-kel-behavior-bar\] \{/);
  assert.match(print, /\[data-kel-mood-bar\],/);
  assert.match(sheet, /data-kel-summary-grid/);
  assert.match(sheet, /data-kel-mood-distribution/);
  assert.match(sheet, /\{row.total === 1 \? 'Punkt' : 'Punkte'\}/);
});

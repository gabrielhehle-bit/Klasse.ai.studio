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
  assert.match(print, /Bei langen freigegebenen Notizen kann eine zweite Seite entstehen/);
  assert.match(sheet, /break-inside-avoid/);
});

test('private note choices are not carried to another child or another print template', () => {
  assert.match(print, /setElternblattSelectedStudentId\(event\.target\.value\); setElternblattShowNotes\(false\); setElternblattSharedNoteIds\(\[\]\)/);
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

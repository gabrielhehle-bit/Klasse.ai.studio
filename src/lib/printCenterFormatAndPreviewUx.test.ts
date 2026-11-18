import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const print = readFileSync('src/components/PrintCenter.tsx', 'utf8');
const moreStart = print.indexOf('id="print-center-more-panel"');
const moreEnd = print.indexOf('{/* Quick access is not a second list of search results.', moreStart);
const quickPanel = print.slice(moreStart, moreEnd);
const formatStart = print.indexOf('data-testid="print-center-advanced-format"');
const formatEnd = print.indexOf('{/*', formatStart + 200);
const zoomStart = print.indexOf('data-testid="print-preview-zoom-controls"');
const zoomEnd = print.indexOf('<span className="text-[0.625rem] text-indigo-700', zoomStart);
const zoomControls = print.slice(zoomStart, zoomEnd);

test('top quick-presets panel never duplicates portrait, landscape or document-head settings', () => {
  assert.ok(moreStart > 0 && moreEnd > moreStart);
  assert.match(print, /aria-expanded=\{showMoreMenu\}/);
  assert.match(print, /aria-controls="print-center-more-panel"/);
  assert.match(print, /Vorlagen &amp; Tipps/);
  assert.match(quickPanel, /applyPreset\('klassisch'\)/);
  assert.match(quickPanel, /applyPreset\('raster'\)/);
  assert.match(quickPanel, /applyPreset\('ausflug'\)/);
  assert.match(quickPanel, /applyPreset\('kel'\)/);
  assert.doesNotMatch(quickPanel, /setPrintOrientation\('portrait'\)|setPrintOrientation\('landscape'\)/);
  assert.doesNotMatch(quickPanel, /setShowMainHeader\(e\.target\.checked\)/);
});

test('one optional format area keeps the real controls and is reachable from help', () => {
  assert.ok(formatStart > 0 && formatEnd > formatStart);
  assert.match(print, /data-testid="print-center-advanced-format"/);
  assert.match(print, /data-testid="print-open-format-settings"/);
  assert.match(print, /document\.querySelector<HTMLDetailsElement>\('\[data-testid="print-center-advanced-format"\]'\)/);
  assert.match(print, /settings\.open = true/);
  assert.match(print, /settings\.scrollIntoView\(\{ behavior: 'smooth', block: 'start' \}\)/);
  assert.match(print, /Papier-Ausrichtung/);
  assert.match(print, /Dokumentkopf drucken/);
  assert.match(print, /setPrintOrientation\('portrait'\)/);
  assert.match(print, /setPrintOrientation\('landscape'\)/);
  assert.match(print, /setShowMainHeader\(e\.target\.checked\)/);
  assert.match(print, /setPrintMargin\(parseInt\(e\.target\.value\)\)/);
  assert.match(print, /setPrintTheme\(pal\.id as any\)/);
});

test('the preview offers two teacher-friendly sizes with fine zoom collapsed by default', () => {
  assert.ok(zoomStart > 0 && zoomEnd > zoomStart);
  assert.match(zoomControls, /Seite einpassen/);
  assert.match(zoomControls, /100 % Zoom/);
  assert.match(zoomControls, /data-testid="print-preview-fine-zoom"/);
  assert.match(zoomControls, /<details/);
  assert.doesNotMatch(zoomControls, /<details[^>]*\sopen(?:\s|>)/);
  assert.match(zoomControls, /aria-pressed=\{previewZoomOverride === 1\}/);
  assert.match(zoomControls, /aria-pressed=\{fitPreview\}/);
  assert.match(zoomControls, /border-indigo-700 bg-indigo-700 text-white/);
  assert.match(print, /Seitenränder \(mm\)/);
  assert.doesNotMatch(print, /Seitenränder \(Zoll\/mm\)/);
  assert.match(zoomControls, /id="print-preview-zoom-slider"/);
  assert.match(zoomControls, /min="0\.2"/);
  assert.match(zoomControls, /max="1\.2"/);
  assert.match(zoomControls, /onChange=\{\(event\) => setPreviewZoom\(parseFloat\(event\.target\.value\)\)\}/);
  assert.match(zoomControls, /Nur die Ansicht – nicht die Druckgröße/);
  assert.doesNotMatch(zoomControls, /Vorschau verkleinern \(-5%\)|Vorschau vergrößern \(\+5%\)|Auto-Fit/);
});

test('print output and existing KEL safeguards are not moved behind zoom settings', () => {
  assert.match(print, /data-testid="print-center-primary-print"/);
  assert.match(print, /onClick=\{handleTriggerPrint\}/);
  assert.match(print, /activeTemplate === 'kel_elternblatt' && !selectedParentStudent/);
  assert.match(print, /window\.print\(\)/);
  assert.match(print, /data-kel-parent-print-sheet=\{activeTemplate === 'kel_elternblatt' \? true : undefined\}/);
  assert.match(print, /renderPreviewTemplate\(\)/);
  assert.match(print, /data-testid="print-center-advanced-format"/);
});

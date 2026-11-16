import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/components/PrintCenter.tsx', 'utf8');

test('printing has exactly one place to change paper orientation and school header', () => {
  assert.equal((source.match(/onClick=\{\(\) => setPrintOrientation\('portrait'\)\}/g) || []).length, 1);
  assert.equal((source.match(/onClick=\{\(\) => setPrintOrientation\('landscape'\)\}/g) || []).length, 1);
  assert.equal((source.match(/onChange=\{\(e\) => setShowMainHeader\(e\.target\.checked\)\}/g) || []).length, 1);
  assert.match(source, /data-testid="print-center-advanced-format"/);
  assert.match(source, /id="print-center-advanced-format"/);
  assert.match(source, /Seitenränder \(mm\)/);
  assert.match(source, /aria-label="Seitenränder in Millimetern"/);
});

test('top optional menu opens the one real advanced print-format section', () => {
  assert.match(source, /data-testid="print-format-single-entry"/);
  assert.match(source, /data-testid="print-open-format-settings"/);
  assert.match(source, /document\.getElementById\('print-center-advanced-format'\) as HTMLDetailsElement \| null/);
  assert.match(source, /details\.open = true/);
  assert.match(source, /details\.scrollIntoView\(\{ behavior: 'smooth', block: 'start' \}\)/);
  assert.match(source, /aria-expanded=\{showMoreMenu\}/);
  assert.match(source, /aria-controls="print-center-more-panel"/);
  assert.match(source, /id="print-center-more-panel"/);
  assert.match(source, /Vorlagen &amp; Tipps/);
  assert.match(source, /Schnell-Presets/);
  assert.match(source, /Drucktipp & Datenschutz/);
});

test('preview shows two primary choices and a discoverable optional fine zoom', () => {
  assert.match(source, /data-testid="print-preview-size-controls"/);
  assert.match(source, /onClick=\{\(\) => setPreviewZoom\(fitPreviewZoom\)\}/);
  assert.match(source, /aria-pressed=\{previewZoom === fitPreviewZoom\}/);
  assert.match(source, /Seite einpassen/);
  assert.match(source, /onClick=\{\(\) => setPreviewZoom\(1\)\}/);
  assert.match(source, /aria-pressed=\{previewZoom === 1\}/);
  assert.match(source, /data-testid="print-preview-custom-zoom"/);
  assert.match(source, /id="print-preview-zoom-range"/);
  assert.match(source, /htmlFor="print-preview-zoom-range"/);
  assert.doesNotMatch(source, /Vorschau verkleinern \(-5%\)|Vorschau vergrößern \(\+5%\)/);
  assert.match(source, /Math\.round\(previewZoom \* 100\)/);
  assert.match(source, /fitPreviewZoom = isTischPreview && tischPreviewMode === 'detail' \? 0\.85 : printOrientation === 'portrait' \? 0\.7 : 0\.55/);
});

test('preview controls do not alter real printing or student report safeguards', () => {
  assert.match(source, /data-testid="print-center-primary-print"/);
  assert.match(source, /onClick=\{handleTriggerPrint\}/);
  assert.match(source, /const isParentSheet = activeTemplate === 'kel_elternblatt'/);
  assert.match(source, /if \(activeTemplate === 'kel_elternblatt' && !selectedParentStudent\) return/);
  assert.match(source, /height: 34mm !important/);
  assert.match(source, /data-testid="kel-parent-print-preflight"/);
  assert.match(source, /const \[printMargin, setPrintMargin\] = useState<number>\(12\)/);
  assert.match(source, /const \[printTheme, setPrintTheme\]/);
  assert.match(source, /print-center-kel-parent-active/);
});

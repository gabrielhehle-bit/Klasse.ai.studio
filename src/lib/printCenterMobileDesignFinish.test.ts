import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const print = readFileSync('src/components/PrintCenter.tsx', 'utf8');

test('print centre exposes all document categories in one phone picker and keeps desktop filters', () => {
  assert.match(print, /data-testid="print-mobile-category-filter"/);
  assert.match(print, /htmlFor="print-mobile-category"/);
  assert.match(print, /id="print-mobile-category"/);
  assert.match(print, /min-h-12 w-full/);
  assert.match(print, /value=\{activeTaskCategory\}/);
  assert.match(print, /setActiveTaskCategory\(event\.target\.value as typeof activeTaskCategory\)/);
  assert.match(print, /<option key=\{cat\.id\} value=\{cat\.id\}>/);
  assert.match(print, /className="hidden sm:flex flex-wrap gap-2 text-xs"/);
  assert.match(print, /data-testid="print-template-category"/);
  const list = print.match(/const printTaskCategories = useMemo\(\(\) => \[([\s\S]*?)\] as const, \[ALL_TEMPLATES\]\)/);
  assert.ok(list, 'mobile and desktop filters should be derived from the same catalogue');
  for (const category of ['all', 'klasse', 'schueler', 'leistung', 'planung', 'orga']) {
    assert.match(list[1], new RegExp("id: '" + category + "'"));
  }
});

test('mobile document cards are full-width readable buttons with active selection', () => {
  assert.match(print, /data-testid="print-template-grid" className="grid grid-cols-1 sm:grid-cols-2/);
  assert.match(print, /group min-h-20 rounded-xl border p-3 text-left flex items-center/);
  assert.match(print, /text-sm font-semibold leading-snug tracking-tight sm:text-xs/);
  assert.match(print, /line-clamp-2 sm:line-clamp-1/);
  assert.match(print, /aria-pressed=\{isSel\}/);
  assert.match(print, /\{isSel && <Check size=\{18\} aria-hidden="true"/);
  assert.match(print, /document\.getElementById\('print-center-configuration'\)\?\.scrollIntoView/);
});

test('printing is explained in three real locations and disabled print action explains why', () => {
  assert.match(print, /1\. Dokument auswählen/);
  assert.match(print, /2\. Angaben auswählen/);
  assert.match(print, /SCHRITT 3: Vorschau &amp; Druck/);
  assert.match(print, /data-testid="print-center-primary-print"/);
  assert.match(print, /onClick=\{handleTriggerPrint\}/);
  assert.match(print, /Bitte zuerst eine Klasse mit Kindern auswählen/);
  assert.match(print, /Bitte zuerst ein Kind für das Elternblatt auswählen/);
  assert.match(print, /Bitte die benötigten Angaben für die Materialabholung vervollständigen/);
  assert.match(print, /min-h-12 w-full items-center justify-center/);
  assert.match(print, /A4-Vorschau ansehen/);
  assert.match(print, /data-testid="print-center-advanced-format"/);
});

test('editor changes do not replace KEL report sheets or alter actual print rendering', () => {
  assert.match(print, /data-kel-parent-print-sheet=\{activeTemplate === 'kel_elternblatt' \? true : undefined\}/);
  assert.match(print, /renderPreviewTemplate\(true\)/);
  assert.match(print, /renderPreviewTemplate\(\)/);
  assert.match(print, /window\.print\(\)/);
  assert.match(print, /hidden print:block/);
  assert.match(print, /activeTemplate === 'kel_elternblatt' && !selectedParentStudent/);
});

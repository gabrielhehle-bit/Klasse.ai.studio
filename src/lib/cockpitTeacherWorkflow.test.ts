import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COCKPIT_PAPERS, getCockpitPaperStyle, normalizeCockpitPaperSpacing } from './cockpitPaper';

test('cockpit paper offers white, lined, grid and handwriting without modifying data', () => {
  assert.deepEqual(COCKPIT_PAPERS.map(item => item.id), ['blank', 'lined', 'grid', 'handwriting']);
  assert.equal(getCockpitPaperStyle('blank').backgroundColor, '#ffffff');
  assert.equal(getCockpitPaperStyle('blank').backgroundImage, 'none');
  for (const paper of ['lined', 'grid', 'handwriting'] as const) {
    assert.match(String(getCockpitPaperStyle(paper).backgroundImage), /linear-gradient/);
  }
});

test('Canva image is shown on the board itself and paper patterns never cover it', () => {
  const url = 'data:image/png;base64,iVBORw0KGgo=';
  const background = getCockpitPaperStyle('grid', url);
  assert.match(String(background.backgroundImage), /data:image\/png;base64/);
  assert.equal(background.backgroundSize, 'contain');
  assert.equal(getCockpitPaperStyle('lined', 'https://untrusted.test').backgroundSize, '100% 32px');
});

test('20 primary widget entries expose legacy widget variants without deleting original renderers', () => {
  const source = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  assert.match(source, /useState<string>\("core"\)/);
  assert.match(source, /PLANNED_COCKPIT_WIDGETS\.map\(\(group\)/);
  assert.match(source, /label: "▦ Alle Widgets"/);
  assert.match(source, /label: "🕘 Zuletzt verwendet"/);
  assert.match(source, /group\.sources/);
  assert.match(source, /handleOpenWidgetInCockpitLayout\(variant\.type/);
  assert.match(source, /aria-label="Papierart der Unterrichtsfläche"/);
  assert.match(source, /getCockpitPaperStyle\(cockpitPaper, currentBgId === "canva"/);
  assert.match(source, /boardSettings:\s*\{[\s\S]*?cockpitPaperByClass/);
  assert.match(source, /<BoardTextEditor/);
  // Historical ink remains visible and restorable but cannot steal focus or be edited in the new TEXT-only cockpit.
  assert.match(source, /<BoardInk/);
  assert.match(source, /cockpitInkByClass/);
  assert.match(source, /aria-label="Schreiben und Papier"/);
  assert.match(source, /cockpitPaperSpacingByClass/);
  assert.match(source, /setCockpitPaperSpacing\(Number\(event\.target\.value\)\)/);
  assert.doesNotMatch(source, /setBoardTool\('pen'\)|setBoardTool\('erase'\)/);
});


test('adjustable paper spacing remains clamped, defaults safely and keeps house guidance on every row', () => {
  assert.equal(normalizeCockpitPaperSpacing(undefined), 32);
  assert.equal(normalizeCockpitPaperSpacing('not a number'), 32);
  assert.equal(normalizeCockpitPaperSpacing(2), 16);
  assert.equal(normalizeCockpitPaperSpacing(900), 80);
  assert.equal(getCockpitPaperStyle('lined', null, 48).backgroundSize, '100% 48px');
  assert.equal(getCockpitPaperStyle('grid', null, 40).backgroundSize, '40px 40px');
  const house = getCockpitPaperStyle('handwriting', null, 48);
  assert.equal(house.backgroundRepeat, 'repeat-y, repeat');
  assert.match(String(house.backgroundImage), /data:image\/svg\+xml/);
  assert.equal(house.backgroundSize, '44px 96px, 100% 96px');
  const canva = getCockpitPaperStyle('handwriting', 'data:image/png;base64,aGVsbG8=', 48);
  assert.equal(canva.backgroundSize, 'contain');
});

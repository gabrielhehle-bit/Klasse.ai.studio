import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COCKPIT_PAPERS, getCockpitPaperStyle } from './cockpitPaper';

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
  assert.match(source, /label: "Weitere Widgets"/);
  assert.match(source, /group\.sources/);
  assert.match(source, /handleOpenWidgetInCockpitLayout\(variant\.type/);
  assert.match(source, /aria-label="Papierart der Unterrichtsfläche"/);
  assert.match(source, /getCockpitPaperStyle\(cockpitPaper, currentBgId === "canva"/);
  assert.match(source, /boardSettings:\s*\{[\s\S]*?cockpitPaperByClass/);
  assert.match(source, /<BoardTextEditor/);
  // The productive cockpit includes the requested direct pen on the SAME
  // board; restoring old app versions must not erase saved ink strokes.
  assert.match(source, /<BoardInk/);
  assert.match(source, /cockpitInkByClass/);
  assert.match(source, /aria-label="Unterrichtsfläche: Text und Papier"/);
  assert.match(source, /cockpitPaperSpacingByClass/);
  assert.match(source, /setCockpitPaperSpacing\(Number\(event\.target\.value\)\)/);
  assert.doesNotMatch(source, /setBoardTool\('pen'\)|setBoardTool\('erase'\)/);
});

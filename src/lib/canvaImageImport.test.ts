import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addCanvaImageWidget, canSaveCanvaMaterial, createCanvaMaterial } from './canvaImageImport';

const image = 'data:image/webp;base64,' + Buffer.from('image bytes').toString('base64');

test('Canva import creates an optional, existing-library-compatible image material', () => {
  const material = createCanvaMaterial('  Meine Tafel  ', image);
  assert.equal(material.typ, 'datei');
  assert.equal(material.titel, 'Meine Tafel');
  assert.equal(material.dateiTyp, 'image/webp');
  assert.equal(material.dateiInhalt, image);
  assert.equal(material.quelleModul, 'canva');
  assert.ok(canSaveCanvaMaterial([], material));
});

test('Canva image import rejects exceeding the existing 5 MB library limit', () => {
  const material = createCanvaMaterial('Groß', 'data:image/webp;base64,' + 'a'.repeat(5 * 1024 * 1024));
  assert.equal(canSaveCanvaMaterial([], material), false);
});

test('Canva insertion adds an independent movable image widget without changing existing layout', () => {
  const layout = [{
    id: 'widget-drawing', type: 'drawing' as const, x: 0, y: 0, w: 100, h: 100, visible: true,
    settings: { boardMode: 'whiteboard', text: 'Bestand bleibt' },
  }];
  const result = addCanvaImageWidget(layout, image, 'Canva-Blatt', 'canva-material-1');
  assert.equal(layout.length, 1);
  assert.equal(result.length, 2);
  assert.deepEqual(result[0], layout[0]);
  assert.equal(result[1].type, 'image');
  assert.equal(result[1].settings.materialId, 'canva-material-1');
  assert.equal(result[1].settings.imageUrl, image);
  assert.equal(result[1].visible, true);
  assert.ok(result[1].w < 100);
  const again = addCanvaImageWidget(result, image, 'Zweites Blatt');
  assert.equal(again.length, 3);
  assert.notEqual(again[1].id, again[2].id);
});

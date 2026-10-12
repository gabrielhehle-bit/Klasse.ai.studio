import test from 'node:test';
import assert from 'node:assert/strict';
import { getImageMaterials, isPersistentImageSource } from './imageAlgorithm';
test('material image picker tolerates damaged and old library records without a render crash', () => {
  assert.deepEqual(getImageMaterials(null), []);
  assert.deepEqual(getImageMaterials({}), []);
  const valid = { id: 'local', typ: 'datei', dateiInhalt: 'data:image/png;base64,fixture' };
  const old = { id: 'old', typ: 'bild' };
  assert.deepEqual(getImageMaterials([null, false, 12, {}, {dateiInhalt:12}, valid, old]), [valid, old]);
});
test('new image sources accept persistent image data and HTTPS, reject ephemeral or invalid locations', () => {
  assert.equal(isPersistentImageSource('data:image/png;base64,fixture'), true);
  assert.equal(isPersistentImageSource('https://example.org/image.png'), true);
  for (const value of [null, 12, '', 'https://', 'http://example.org/x.png', 'blob:session-only', 'file:///x', 'data:text/html,x', 'javascript:alert(1)']) assert.equal(isPersistentImageSource(value), false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { canPrivacyOptimizePhotoType, optimizedPhotoName } from './photoUploadPreparation';

test('parent-photo privacy optimization is limited to browser-safe raster formats', () => {
  assert.equal(canPrivacyOptimizePhotoType('image/jpeg'), true);
  assert.equal(canPrivacyOptimizePhotoType('image/png'), true);
  assert.equal(canPrivacyOptimizePhotoType('image/webp'), true);
  assert.equal(canPrivacyOptimizePhotoType('image/heic'), false);
  assert.equal(canPrivacyOptimizePhotoType('image/gif'), false);
});

test('optimized parent-photo filenames use the re-encoded extension', () => {
  assert.equal(optimizedPhotoName('Ausflug.JPEG', 'image/jpeg'), 'Ausflug-optimiert.jpg');
  assert.equal(optimizedPhotoName('Klasse.png', 'image/png'), 'Klasse-optimiert.png');
  assert.equal(optimizedPhotoName('Foto.webp', 'image/webp'), 'Foto-optimiert.webp');
});

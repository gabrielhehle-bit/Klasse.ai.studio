import test from 'node:test';
import assert from 'node:assert/strict';
import { canPrivacyOptimizePhotoType } from './photoUploadPreparation';

test('parent-photo privacy optimization is limited to browser-safe raster formats', () => {
  assert.equal(canPrivacyOptimizePhotoType('image/jpeg'), true);
  assert.equal(canPrivacyOptimizePhotoType('image/png'), true);
  assert.equal(canPrivacyOptimizePhotoType('image/webp'), true);
  assert.equal(canPrivacyOptimizePhotoType('image/heic'), false);
  assert.equal(canPrivacyOptimizePhotoType('image/gif'), false);
});

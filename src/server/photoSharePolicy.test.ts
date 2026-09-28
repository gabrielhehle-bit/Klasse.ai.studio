import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePhotoSharePermission } from './photoSharePolicy';

const now = Date.parse('2026-09-28T12:00:00.000Z');
const requested = '2026-10-28T12:00:00.000Z';

test('accepts a read-only anonymous OneDrive link only with confirmed expiry', () => {
  const result = validatePhotoSharePermission({
    id: 'permission-1',
    expirationDateTime: requested,
    link: {
      type: 'view',
      scope: 'anonymous',
      webUrl: 'https://example.sharepoint.com/share',
    },
  }, requested, now);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.permissionId, 'permission-1');
    assert.equal(result.expirationDateTime, requested);
  }
});

test('rejects a link when Microsoft does not confirm an expiry', () => {
  const result = validatePhotoSharePermission({
    id: 'permission-1',
    link: {
      type: 'view',
      scope: 'anonymous',
      webUrl: 'https://example.sharepoint.com/share',
    },
  }, requested, now);

  assert.equal(result.ok, false);
});

test('rejects a link with the wrong link type or scope', () => {
  assert.equal(validatePhotoSharePermission({
    id: 'permission-1',
    expirationDateTime: requested,
    link: { type: 'edit', scope: 'anonymous', webUrl: 'https://example.test' },
  }, requested, now).ok, false);

  assert.equal(validatePhotoSharePermission({
    id: 'permission-1',
    expirationDateTime: requested,
    link: { type: 'view', scope: 'organization', webUrl: 'https://example.test' },
  }, requested, now).ok, false);
});

test('rejects a returned expiry that is materially later than requested', () => {
  const tooLate = '2026-10-28T12:10:01.000Z';
  const result = validatePhotoSharePermission({
    id: 'permission-1',
    expirationDateTime: tooLate,
    link: { type: 'view', scope: 'anonymous', webUrl: 'https://example.test' },
  }, requested, now);

  assert.equal(result.ok, false);
});

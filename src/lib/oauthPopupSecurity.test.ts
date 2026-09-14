import test from 'node:test';
import assert from 'node:assert/strict';
import { isTrustedOAuthPopupMessage } from './oauthPopupSecurity';

test('OAuth popup messages require both the Klassio origin and the exact popup window', () => {
  const popup = {};
  assert.equal(isTrustedOAuthPopupMessage('https://klassio.example', popup, 'https://klassio.example', popup), true);
  assert.equal(isTrustedOAuthPopupMessage('https://evil.example', popup, 'https://klassio.example', popup), false);
  assert.equal(isTrustedOAuthPopupMessage('https://klassio.example', {}, 'https://klassio.example', popup), false);
  assert.equal(isTrustedOAuthPopupMessage('https://klassio.example', popup, 'https://klassio.example', null), false);
});

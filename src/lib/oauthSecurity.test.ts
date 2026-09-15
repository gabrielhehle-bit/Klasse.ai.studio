import test from 'node:test';
import assert from 'node:assert/strict';
import { createOAuthState, verifyOAuthState, scriptJson, escapeHtml } from './oauthSecurity';

test('OAuth state is short-lived, unpredictable and bound to browser cookie and server secret', () => {
  const secret = 'test-only-secret';
  const state = createOAuthState(secret, 1000);
  assert.equal(verifyOAuthState(state, state, secret, 1000), true);
  assert.notEqual(createOAuthState(secret, 1000), state);
  assert.equal(verifyOAuthState(state, undefined, secret, 1000), false);
  assert.equal(verifyOAuthState(state, state, 'other-secret', 1000), false);
  assert.equal(verifyOAuthState(state, state, secret, 601000), false);
  assert.equal(verifyOAuthState([state], state, secret, 1000), false);
});

test('untrusted text cannot close its HTML or inline-script container', () => {
  const input = '</script><script>evil()</script>&"';
  assert.ok(!escapeHtml(input).includes('<'));
  const encoded = scriptJson(input);
  assert.ok(!encoded.includes('<'));
  assert.equal(JSON.parse(encoded), input);
});

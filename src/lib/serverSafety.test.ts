import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHTML, scriptJSON, createOAuthState, verifyOAuthState } from './serverSafety';

test('HTML and inline script output preserve text without interpreting markup', () => {
  const input = '</script><img src=x onerror=alert(1)>&"';
  assert.ok(!escapeHTML(input).includes('<'));
  assert.ok(!scriptJSON(input).includes('<'));
  assert.equal(JSON.parse(scriptJSON(input)), input);
});

test('OneDrive OAuth requires a matching cookie and signed state; errors are escaped', async t => {
  process.env.IS_TEST_RUNNER = 'true';
  const previousClient = process.env.MICROSOFT_CLIENT_ID;
  process.env.MICROSOFT_CLIENT_ID = 'test-client';
  const { createApp } = await import('../../server');
  const app = await createApp({ isTest: true });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const unauthenticated = await fetch(url + '/api/onedrive/callback?code=test');
    assert.equal(unauthenticated.status, 400);
    const auth = await fetch(url + '/api/onedrive/auth-url');
    const cookie = auth.headers.get('set-cookie')!.split(';')[0];
    const state = new URL((await auth.json()).url).searchParams.get('state');
    assert.match(state!, /^\d+\.[a-f0-9]{64}\.[a-f0-9]{64}$/);
    const marker = '</script><b>audit</b>';
    const callback = url + '/api/onedrive/callback?state=' + state + '&error=' + encodeURIComponent(marker);
    assert.equal((await fetch(callback)).status, 400);
    const result = await fetch(callback, { headers: { Cookie: cookie } });
    const html = await result.text();
    assert.equal(result.status, 200);
    assert.ok(!html.includes(marker));
    assert.ok(html.includes('&lt;b&gt;audit&lt;/b&gt;'));
    assert.ok(!html.includes("}, '*')"));
    assert.ok(result.headers.get('set-cookie')!.includes('Expires=Thu, 01 Jan 1970'));
    assert.equal((await fetch(callback)).status, 400);
  } finally {
    server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
    if (previousClient === undefined) delete process.env.MICROSOFT_CLIENT_ID; else process.env.MICROSOFT_CLIENT_ID = previousClient;
  }
});

test('Production rejects missing credentials before starting the app', async () => {
  const previous = { NODE_ENV: process.env.NODE_ENV, SESSION_SECRET: process.env.SESSION_SECRET };
  process.env.NODE_ENV = 'production'; delete process.env.SESSION_SECRET;
  try {
    const { createApp } = await import('../../server');
    await assert.rejects(createApp({ isTest: true }), /SESSION_SECRET/);
  } finally {
    for (const [key, value] of Object.entries(previous)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

test('OAuth state rejects tampering, expiry and cross-browser callbacks', () => {
  const state = createOAuthState('test-secret', 1000);
  assert.ok(verifyOAuthState(state, state, 'test-secret', 2000));
  assert.ok(!verifyOAuthState(state, 'another-cookie', 'test-secret', 2000));
  assert.ok(!verifyOAuthState(state, state, 'other-secret', 2000));
  assert.ok(!verifyOAuthState(state, state, 'test-secret', 601001));
});

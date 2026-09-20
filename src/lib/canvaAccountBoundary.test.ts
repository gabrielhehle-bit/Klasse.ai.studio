import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';


test('Canva HTTP status is safe for code guests, while all data and OAuth actions require a signed-in email account', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'klassio-canva-http-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  process.env.IS_TEST_RUNNER = 'true';
  process.env.NODE_ENV = 'test';
  process.env.SESSION_SECRET = 'synthetic-canva-http-secret-at-least-32-chars';
  process.env.LEHRERAPP_ACCESS_TEAM = 'synthetic-canva-code';
  process.env.KLASSIO_DATA_DIR = dir;
  process.env.CANVA_CLIENT_ID = 'synthetic-client';
  process.env.CANVA_CLIENT_SECRET = 'synthetic-client-secret';
  // Only import the server after setting the test-only boot guard.
  const { createApp } = await import('../../server.ts');
  const app = await createApp({ isTest: true });
  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));
  t.after(() => server.close());
  const addr = server.address();
  assert.ok(addr && typeof addr !== 'string');
  const base = `http://127.0.0.1:${addr.port}`;

  const guest = await fetch(base + '/api/access/verify', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: process.env.LEHRERAPP_ACCESS_TEAM }),
  });
  assert.equal(guest.status, 200);
  const cookie = guest.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie?.startsWith('lehrerapp_access_token='));
  const request = (route: string, init: RequestInit = {}) => fetch(base + route, {
    ...init, headers: { Cookie: cookie!, ...Object.fromEntries(new Headers(init.headers)) },
  });

  const anonymous = await fetch(base + '/api/canva/status');
  assert.equal(anonymous.status, 401);
  const status = await request('/api/canva/status');
  assert.equal(status.status, 200);
  const data = await status.json();
  assert.equal(data.configured, true);
  assert.equal(data.connected, false);
  assert.equal(data.requiresEmailLogin, true);
  assert.equal(data.access_token, undefined);
  assert.equal(data.refresh_token, undefined);

  for (const [route, method] of [
    ['/api/canva/auth-url', 'GET'],
    ['/api/canva/designs', 'GET'],
    ['/api/canva/designs', 'POST'],
    ['/api/canva/exports', 'POST'],
    ['/api/canva/exports/job', 'GET'],
    ['/api/canva/exports/job/image', 'GET'],
    ['/api/canva/disconnect', 'POST'],
  ]) {
    const res = await request(route, { method });
    assert.equal(res.status, 403, `${method} ${route} must require a valid user-bound email account`);
    assert.equal((await res.json()).requiresEmailLogin, true);
  }
  const forged = await request('/api/canva/designs', {
    headers: { Cookie: cookie + '; klassio_email_account=fake; klassio_canva_session=forged' },
  });
  assert.equal(forged.status, 403);
  const staleCallback = await request('/api/canva/callback?code=forged&state=forged', {
    headers: { Cookie: cookie + '; klassio_canva_flow=forged' },
  });
  assert.equal(staleCallback.status, 400);
});

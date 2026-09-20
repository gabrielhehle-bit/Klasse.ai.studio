import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createCanvaTokenStore } from '../server/canvaTokenStore';

test('Canva HTTP sessions survive a fresh app instance and are inaccessible to a different Klassio email account', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'klassio-canva-http-persist-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const previous = {
    KLASSIO_DATA_DIR: process.env.KLASSIO_DATA_DIR,
    SESSION_SECRET: process.env.SESSION_SECRET,
    CANVA_CLIENT_ID: process.env.CANVA_CLIENT_ID,
    CANVA_CLIENT_SECRET: process.env.CANVA_CLIENT_SECRET,
    LEHRERAPP_ACCESS_TEAM: process.env.LEHRERAPP_ACCESS_TEAM,
    NODE_ENV: process.env.NODE_ENV,
  };
  t.after(() => {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  });
  process.env.IS_TEST_RUNNER = 'true';
  process.env.NODE_ENV = 'test';
  process.env.LEHRERAPP_ACCESS_TEAM = 'synthetic-canva-team-code';
  process.env.KLASSIO_DATA_DIR = dir;
  const secret = 'synthetic-canva-http-session-secret-over-32-characters';
  process.env.SESSION_SECRET = secret;
  process.env.CANVA_CLIENT_ID = 'synthetic-test-client';
  process.env.CANVA_CLIENT_SECRET = 'synthetic-test-client-secret';

  const emailA = 'teacher-a@example.test';
  const emailB = 'teacher-b@example.test';
  const owner = (email: string) => crypto.createHash('sha256').update('klassio-account:' + email).digest('hex').slice(0, 24);
  const accountCookie = (email: string) => {
    const payload = { userId: owner(email), email, displayName: 'Synthetic Test', handle: 'test', v: 1, exp: Date.now() + 600_000 };
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update('klassio-account:' + encoded).digest('hex');
    return 'klassio_email_account=' + encoded + '.' + signature;
  };
  const sessionId = crypto.randomBytes(32).toString('base64url');
  const store = createCanvaTokenStore(dir, secret);
  await store.put(owner(emailA), sessionId, {
    access_token: 'SYNTHETIC_ACCESS_A', refresh_token: 'SYNTHETIC_REFRESH_A', expires_at: Date.now() + 3600_000,
  });

  const { createApp } = await import('../../server.ts');
  const servers: http.Server[] = [];
  t.after(async () => {
    await Promise.all(servers.map(async server => {
      server.closeAllConnections();
      await new Promise<void>(resolve => server.close(() => resolve()));
    }));
  });
  const start = async () => {
    const app = await createApp({ isTest: true });
    const server = http.createServer(app);
    servers.push(server);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}`;
    const gate = await fetch(base + '/api/access/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: process.env.LEHRERAPP_ACCESS_TEAM }),
    });
    assert.equal(gate.status, 200);
    const access = gate.headers.get('set-cookie')!.split(';')[0];
    return { base, access };
  };
  const first = await start();
  const cookies = (app: Awaited<ReturnType<typeof start>>, email: string) =>
    [app.access, accountCookie(email), 'klassio_canva_session=' + sessionId].join('; ');
  const request = (app: Awaited<ReturnType<typeof start>>, email: string, route: string) =>
    fetch(app.base + route, { headers: { Cookie: cookies(app, email) } });
  const firstStatus = await request(first, emailA, '/api/canva/status');
  assert.equal(firstStatus.status, 200);
  assert.equal((await firstStatus.json()).connected, true);
  assert.equal((await (await request(first, emailB, '/api/canva/status')).json()).connected, false);

  // Fresh express instance has no in-memory OAuth-session map to reuse.
  const restarted = await start();
  const afterRestart = await request(restarted, emailA, '/api/canva/status');
  assert.equal(afterRestart.status, 200);
  assert.equal((await afterRestart.json()).connected, true);
  const otherStatus = await request(restarted, emailB, '/api/canva/status');
  assert.equal((await otherStatus.json()).connected, false);
  const wrongUser = await request(restarted, emailB, '/api/canva/designs');
  assert.equal(wrongUser.status, 401);
  const missingAccess = await fetch(restarted.base + '/api/canva/designs', {
    headers: { Cookie: accountCookie(emailA) + '; klassio_canva_session=' + sessionId },
  });
  assert.equal(missingAccess.status, 401);
});

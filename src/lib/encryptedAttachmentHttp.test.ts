import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

test('encrypted material API stays OFF until backup migration is approved', async t => {
  const prev = process.env.KLASSIO_ENCRYPTED_ATTACHMENTS_ENABLED;
  t.after(() => prev === undefined
    ? delete process.env.KLASSIO_ENCRYPTED_ATTACHMENTS_ENABLED
    : process.env.KLASSIO_ENCRYPTED_ATTACHMENTS_ENABLED = prev);
  delete process.env.KLASSIO_ENCRYPTED_ATTACHMENTS_ENABLED;
  const { createApp } = await import('../../server.ts');
  const app = await createApp({ isTest: true });
  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));
  t.after(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); });
  const addr = server.address();
  assert.ok(addr && typeof addr !== 'string');
  const res = await fetch(`http://127.0.0.1:${addr.port}/api/material-attachments/status`);
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.match(body.error, /nicht freigegeben/);
});

test('opt-in ciphertext transport enforces email account ownership and immutable binary blobs', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'klassio-encrypted-http-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const envNames = ['KLASSIO_DATA_DIR', 'KLASSIO_ENCRYPTED_ATTACHMENTS_ENABLED', 'LEHRERAPP_ACCESS_TEAM', 'SESSION_SECRET'] as const;
  const previous = Object.fromEntries(envNames.map(name => [name, process.env[name]]));
  t.after(() => envNames.forEach(name => previous[name] === undefined ? delete process.env[name] : process.env[name] = previous[name]));
  process.env.IS_TEST_RUNNER = 'true';
  process.env.NODE_ENV = 'test';
  process.env.LEHRERAPP_ACCESS_TEAM = 'synthetic-attachment-access-code';
  const secret = 'synthetic-attachment-http-secret-at-least-32-characters';
  process.env.SESSION_SECRET = secret;
  process.env.KLASSIO_DATA_DIR = dir;
  process.env.KLASSIO_ENCRYPTED_ATTACHMENTS_ENABLED = 'true';
  const { createApp } = await import('../../server.ts');
  const app = await createApp({ isTest: true });
  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));
  t.after(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); });
  const addr = server.address();
  assert.ok(addr && typeof addr !== 'string');
  const base = `http://127.0.0.1:${addr.port}`;
  const login = await fetch(base + '/api/access/verify', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: process.env.LEHRERAPP_ACCESS_TEAM }),
  });
  assert.equal(login.status, 200);
  const access = login.headers.get('set-cookie')?.split(';')[0];
  assert.ok(access?.startsWith('lehrerapp_access_token='));
  const account = (email: string) => {
    const identity = {
      userId: crypto.createHash('sha256').update('klassio-account:' + email).digest('hex').slice(0, 24),
      email, displayName: 'Synthetic Teacher', handle: 'test', v: 1, exp: Date.now() + 60_000,
    };
    const value = Buffer.from(JSON.stringify(identity), 'utf8').toString('base64url');
    return 'klassio_email_account=' + value + '.' + crypto.createHmac('sha256', secret).update('klassio-account:' + value).digest('hex');
  };
  const request = (route: string, email?: string, init: RequestInit = {}) => fetch(base + route, {
    ...init,
    headers: { Cookie: [access, email && account(email)].filter(Boolean).join('; '), ...Object.fromEntries(new Headers(init.headers)) },
  });
  const ownerA = 'owner-a@example.test', ownerB = 'owner-b@example.test';
  const id = crypto.randomBytes(16).toString('hex');
  const bytes = crypto.randomBytes(201); // synthetic ciphertext incl. GCM tag, no teacher data
  assert.equal((await request('/api/material-attachments/status')).status, 403);
  assert.equal((await fetch(base + '/api/material-attachments/status')).status, 401);
  assert.equal((await request('/api/material-attachments/status', ownerA)).status, 200);
  const created = await request('/api/material-attachments/' + id, ownerA, {
    method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: bytes,
  });
  assert.equal(created.status, 201);
  assert.equal((await created.json()).attachmentId, id);
  assert.equal((await request('/api/material-attachments/' + id, ownerB)).status, 404);
  const retrieved = await request('/api/material-attachments/' + id, ownerA);
  assert.equal(retrieved.status, 200);
  assert.equal(retrieved.headers.get('content-type'), 'application/octet-stream');
  assert.deepEqual(Buffer.from(await retrieved.arrayBuffer()), bytes);
  assert.equal((await request('/api/material-attachments/' + id, ownerA, {
    method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: bytes,
  })).status, 409);
  assert.equal((await request('/api/material-attachments/' + id, ownerB, { method: 'DELETE' })).status, 404);
  assert.equal((await request('/api/material-attachments/' + id, ownerA, { method: 'DELETE' })).status, 204);
  assert.equal((await request('/api/material-attachments/' + id, ownerA)).status, 404);
});

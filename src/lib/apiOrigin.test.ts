import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import nodemailer from 'nodemailer';
import { isAllowedApiOrigin } from '../server/apiOrigin.ts';

test('Public API accepts apex and www, but rejects unrelated origins', () => {
  for (const appUrl of ['https://klassio.at', 'https://www.klassio.at/']) {
    for (const origin of ['https://klassio.at', 'https://www.klassio.at']) {
      assert.equal(isAllowedApiOrigin(origin, appUrl), true);
    }
    for (const origin of ['null', 'http://klassio.at', 'https://klassio.at:8443',
      'https://evil.klassio.at', 'https://klassio.at.evil.invalid',
      'https://evil.invalid', 'https://klassio.at/', 'https://user@klassio.at']) {
      assert.equal(isAllowedApiOrigin(origin, appUrl), false, origin);
    }
  }
});

test('Email login accepts school and private domains on www with an apex APP_URL', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'klassio-login-origin-'));
  const env = { ...process.env };
  const createTransport = nodemailer.createTransport;
  const recipients: string[] = [];
  // Capture mail in-process: this test never sends real login messages.
  nodemailer.createTransport = (() => ({ sendMail: async (mail: { to: string }) => {
    recipients.push(mail.to);
    return { messageId: 'test-only' };
  } })) as typeof nodemailer.createTransport;
  Object.assign(process.env, {
    IS_TEST_RUNNER: 'true', NODE_ENV: 'production', APP_URL: 'https://klassio.at',
    SESSION_SECRET: 'test-only-origin-secret-at-least-32-characters',
    LEHRERAPP_ACCESS_TEAM: 'test-only-team-code', LEHRERAPP_ACCESS_EXTERNAL: 'test-only-external-code',
    SMTP_HOST: 'capture.invalid', SMTP_FROM: 'noreply@klassio.at', KLASSIO_DATA_DIR: dir,
  });
  const { createApp } = await import('../../server.ts');
  const server = http.createServer(await createApp({ isTest: true }));
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
    nodemailer.createTransport = createTransport;
    for (const key of Object.keys(process.env)) if (!(key in env)) delete process.env[key];
    Object.assign(process.env, env);
    await fs.rm(dir, { recursive: true, force: true });
  });
  const url = `http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}/api/access/email/request`;
  const request = (origin: string, email: string, site = 'same-origin') => fetch(url, {
    method: 'POST', headers: { Origin: origin, Host: 'www.klassio.at',
      'Sec-Fetch-Site': site, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  for (const email of ['test@vslrk.vobs.at', 'test@vsfoa.vobs.at', 'test@vobs.at', 'test@example.org']) {
    const response = await request('https://www.klassio.at', email);
    assert.equal(response.status, 200, JSON.stringify(await response.json()));
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://www.klassio.at');
  }
  assert.equal((await request('https://klassio.at', 'test@another.example')).status, 200);
  assert.equal(recipients.length, 5);
  assert.equal((await request('https://evil.invalid', 'blocked@example.org', 'cross-site')).status, 403);
  assert.equal((await request('https://evil.klassio.at', 'blocked@example.org', 'same-site')).status, 403);
  assert.equal((await request('https://www.klassio.at', 'blocked@example.org', 'cross-site')).status, 403);
  assert.equal(recipients.length, 5);
});

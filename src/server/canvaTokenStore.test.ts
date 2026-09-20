import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createCanvaTokenStore } from './canvaTokenStore';

const secret = 'canva-test-encryption-key-' + 'a'.repeat(64);
const ownerA = 'a'.repeat(24);
const ownerB = 'b'.repeat(24);
const sessionA = crypto.randomBytes(32).toString('base64url');
const sessionB = crypto.randomBytes(32).toString('base64url');
const tokens = { access_token: 'SYNTHETIC_CANVA_ACCESS_TOKEN', refresh_token: 'SYNTHETIC_CANVA_REFRESH_TOKEN', expires_at: Date.now() + 3600_000 };

test('Canva OAuth tokens persist encrypted across restarts without exposing account content or cross-account access', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'klassio-canva-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const one = createCanvaTokenStore(dir, secret);
  await one.put(ownerA, sessionA, tokens);
  const file = path.join(dir, 'canva-tokens', ownerA + '.json');
  const raw = await fs.readFile(file, 'utf8');
  assert.doesNotMatch(raw, /SYNTHETIC_CANVA_ACCESS_TOKEN|SYNTHETIC_CANVA_REFRESH_TOKEN/);
  assert.doesNotMatch(raw, new RegExp(sessionA));
  assert.ok((await fs.stat(file)).mode & 0o777 ? ((await fs.stat(file)).mode & 0o777) === 0o600 : true);
  const afterRestart = createCanvaTokenStore(dir, secret);
  assert.deepEqual(await afterRestart.get(ownerA, sessionA), tokens);
  assert.equal(await afterRestart.get(ownerA, sessionB), null);
  assert.equal(await afterRestart.get(ownerB, sessionA), null);
  await afterRestart.delete(ownerA, sessionB);
  assert.deepEqual(await afterRestart.get(ownerA, sessionA), tokens);
  await afterRestart.delete(ownerA, sessionA);
  assert.equal(await afterRestart.get(ownerA, sessionA), null);
  await assert.rejects(fs.stat(file), { code: 'ENOENT' });
});

test('Canva encrypted tokens reject traversal, tampering, and key changes', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'klassio-canva-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const store = createCanvaTokenStore(dir, secret);
  await assert.rejects(store.put('../other', sessionA, tokens), /INVALID_ACCOUNT/);
  await assert.rejects(store.put(ownerA, '../cookie', tokens), /INVALID_CANVA_SESSION/);
  await store.put(ownerA, sessionA, tokens);
  await assert.rejects(createCanvaTokenStore(dir, 'another-test-key-' + 'b'.repeat(64)).get(ownerA, sessionA));
  const file = path.join(dir, 'canva-tokens', ownerA + '.json');
  const record = JSON.parse(await fs.readFile(file, 'utf8'));
  record.ciphertext = record.ciphertext.slice(0, -2) + 'xx';
  await fs.writeFile(file, JSON.stringify(record));
  await assert.rejects(store.get(ownerA, sessionA));
  // Owner has a verified email session and can always reset a corrupt record.
  await store.clearAccount(ownerA);
  assert.equal(await store.get(ownerA, sessionA), null);
});

test('Canva sessions expire on server, not by trusting a client-side status flag', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'klassio-canva-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const store = createCanvaTokenStore(dir, secret);
  await store.put(ownerA, sessionA, tokens);
  const file = path.join(dir, 'canva-tokens', ownerA + '.json');
  const record = JSON.parse(await fs.readFile(file, 'utf8'));
  record.expiresAt = Date.now() - 1;
  await fs.writeFile(file, JSON.stringify(record));
  assert.equal(await store.get(ownerA, sessionA), null);
});

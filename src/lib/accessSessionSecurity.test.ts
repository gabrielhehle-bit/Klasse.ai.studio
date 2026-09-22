import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AccessSessionStore } from '../server/accessSessionStore';

test('server-side sessions survive restarts but revoked tokens never resurrect', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'klassio-sessions-'));
  const tokenOne = 'test-token-one-secret';
  const tokenTwo = 'test-token-two-secret';
  const tokenOther = 'test-token-other-user';
  const expiry = Date.now() + 600_000;
  try {
    const store = new AccessSessionStore(directory);
    store.issue(tokenOne, expiry, 'teacher-A');
    store.issue(tokenTwo, expiry, 'teacher-A');
    store.issue(tokenOther, expiry, 'teacher-B');
    assert.equal(store.isActive(tokenOne), true);
    assert.equal(store.isActive('unknown-token'), false);

    const serialized = fs.readFileSync(path.join(directory, 'access-sessions.json'), 'utf8');
    assert.equal(serialized.includes(tokenOne), false, 'raw tokens must not be written to disk');
    assert.equal(serialized.includes(tokenOther), false, 'raw tokens must not be written to disk');

    const restarted = new AccessSessionStore(directory);
    assert.equal(restarted.isActive(tokenOne), true);
    restarted.revoke(tokenOne);
    assert.equal(restarted.isActive(tokenOne), false);
    assert.equal(new AccessSessionStore(directory).isActive(tokenOne), false, 'logout must survive server restart');

    restarted.revokeUser('teacher-A');
    const again = new AccessSessionStore(directory);
    assert.equal(again.isActive(tokenTwo), false, 'all-devices logout must revoke every session for the account');
    assert.equal(again.isActive(tokenOther), true, 'other teachers must remain signed in');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

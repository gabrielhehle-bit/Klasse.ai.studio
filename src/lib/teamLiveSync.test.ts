import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ClassCollaborationStore } from '../server/classCollaborationStore';
import type { TeacherIdentity } from '../server/teacherIdentity';

const identity = (userId: string): TeacherIdentity => ({
  userId,
  email: userId + '@school.example',
  schoolId: 'school-id',
  schoolCode: 'school',
  schoolDomain: 'school.example',
  displayName: userId,
  handle: userId,
});
const publicKeyJwk = { kty: 'RSA', n: 'A'.repeat(256), e: 'AQAB' };
const encryptedSnapshot = { version: 1, algorithm: 'AES-GCM-256', iv: 'A'.repeat(16), ciphertext: 'B'.repeat(64) };
const wrappedKey = 'A'.repeat(256);

test('Teamteaching live events notify only after committed class changes, not failed conflicts', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'klassio-team-live-'));
  try {
    const store = new ClassCollaborationStore(dir);
    const owner = identity('owner');
    const colleague = identity('colleague');
    const ownDevice = await store.registerDevice(owner, { deviceId: 'device-owner-123', publicKeyJwk });
    const otherDevice = await store.registerDevice(colleague, { deviceId: 'device-other-123', publicKeyJwk });
    const created = await store.createSharedClass(owner, {
      classLabel: 'Demo-Klasse',
      encryptedSnapshot,
      wrappedKeys: { [ownDevice.deviceId]: wrappedKey },
    });
    const otherClass = await store.createSharedClass(owner, {
      classLabel: 'Andere Klasse',
      encryptedSnapshot,
      wrappedKeys: { [ownDevice.deviceId]: wrappedKey },
    });
    const events: number[] = [];
    const unrelated: number[] = [];
    const off = store.subscribeClass(created.id, revision => events.push(revision));
    const offOther = store.subscribeClass(otherClass.id, revision => unrelated.push(revision));
    const failing = store.subscribeClass(created.id, () => { throw new Error('broken listener'); });

    const saved = await store.updateSnapshot(owner, created.id, { encryptedSnapshot, expectedRevision: 1 });
    assert.equal(saved.revision, 2);
    assert.deepEqual(events, [2]);
    assert.deepEqual(unrelated, []);
    await assert.rejects(
      store.updateSnapshot(owner, created.id, { encryptedSnapshot, expectedRevision: 1 }),
      /REVISION_CONFLICT/,
    );
    assert.deepEqual(events, [2], 'a rejected concurrent edit must never announce a revision');

    await store.addMember(owner, created.id, {
      userId: colleague.userId, displayName: colleague.displayName, role: 'editor',
      wrappedKeys: { [otherDevice.deviceId]: wrappedKey },
    });
    assert.deepEqual(events, [2, 2], 'access changes trigger a safe recheck without sending class data');
    await store.removeMember(owner, created.id, colleague.userId);
    assert.deepEqual(events, [2, 2, 2]);
    await assert.rejects(store.getClass(colleague, created.id), /FORBIDDEN/);
    off(); failing(); offOther();
    await store.updateSnapshot(owner, created.id, { encryptedSnapshot, expectedRevision: 2 });
    assert.deepEqual(events, [2, 2, 2], 'disconnected listeners are not notified');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Teamteaching live subscriptions are scoped, limited and unsubscribe cleanly', async () => {
  const store = new ClassCollaborationStore('/unused-team-live-limit');
  assert.throws(() => store.subscribeClass('../other', () => {}), /INVALID_SHARED_CLASS/);
  const classId = 'a'.repeat(8) + '-' + 'a'.repeat(4) + '-' + 'a'.repeat(4) + '-' + 'a'.repeat(4) + '-' + 'a'.repeat(12);
  const stops = Array.from({ length: 12 }, () => store.subscribeClass(classId, () => {}));
  assert.throws(() => store.subscribeClass(classId, () => {}), /TOO_MANY_LIVE_CONNECTIONS/);
  stops[0]();
  store.subscribeClass(classId, () => {})();
  stops.forEach(stop => stop());
});

test('Teamteaching event payload stays metadata-only and uses the guarded sync path', async () => {
  const { readFileSync } = await import('node:fs');
  const server = readFileSync('server.ts', 'utf8');
  const app = readFileSync('src/context/AppContext.tsx', 'utf8');
  assert.match(server, /\/api\/teamteaching\/classes\/:classId\/events.*requireTeacherIdentity/);
  assert.match(server, /classCollaborationStore\.getClass\(identity, classId\)/);
  assert.match(server, /JSON\.stringify\(\{ revision: Math\.max\(revision, record\.revision\) \}\)/);
  assert.match(app, /new EventSource\(/);
  assert.match(app, /if \(revision === 0 \|\| \(revision as number\) > room\.teamTeaching\.revision\)/);
  assert.match(app, /void syncOnce\(\)/);
  assert.match(app, /window\.setInterval\(\(\) => void syncOnce\(\), 2500\)/);
});

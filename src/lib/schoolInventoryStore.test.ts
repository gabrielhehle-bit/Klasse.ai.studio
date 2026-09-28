import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSchoolInventoryStore } from '../server/schoolInventoryStore';
import type { TeacherIdentity } from '../server/teacherIdentity';

function identity(schoolId: string, userId: string, name: string): TeacherIdentity {
  return {
    userId,
    email: `${userId}@example.edu`,
    schoolId,
    schoolCode: schoolId,
    schoolDomain: 'example.edu',
    schoolName: `School ${schoolId}`,
    displayName: name,
    handle: userId,
  };
}

async function withStore(run: (dir: string) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'klassio-inventory-'));
  try {
    await run(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test('school inventory is strictly separated by verified school id', async () => {
  await withStore(async dir => {
    const store = createSchoolInventoryStore(dir);
    const schoolA = identity('school-a', 'anna', 'Anna A.');
    const schoolB = identity('school-b', 'berta', 'Berta B.');

    await store.createItem(schoolA, { inventoryNumber: '100', name: 'Rechenrahmen' });

    const snapshotA = await store.snapshot(schoolA);
    const snapshotB = await store.snapshot(schoolB);
    assert.equal(snapshotA.items.length, 1);
    assert.equal(snapshotB.items.length, 0);
  });
});

test('borrow and return show the real colleague school-wide', async () => {
  await withStore(async dir => {
    const store = createSchoolInventoryStore(dir);
    const anna = identity('school-a', 'anna', 'Anna A.');
    const ben = identity('school-a', 'ben', 'Ben B.');
    const item = await store.createItem(anna, { inventoryNumber: '2137', name: 'Experimentierbox Magnetismus' });

    await store.borrow(ben, item.id);
    const borrowed = (await store.snapshot(anna)).items[0];
    assert.equal(borrowed.status, 'borrowed');
    assert.equal(borrowed.borrowedByName, 'Ben B.');

    await store.returnItem(anna, item.id);
    const returned = (await store.snapshot(ben)).items[0];
    assert.equal(returned.status, 'available');
    assert.equal(returned.borrowedByName, undefined);
  });
});

test('import creates missing cabinet locations and skips duplicate numbers by default', async () => {
  await withStore(async dir => {
    const store = createSchoolInventoryStore(dir);
    const teacher = identity('school-a', 'anna', 'Anna A.');
    await store.createItem(teacher, { inventoryNumber: '1042', name: 'Altbestand' });

    const result = await store.importItems(teacher, [
      { inventoryNumber: '1042', name: 'Geometriekörper', subject: 'Mathematik', locationName: 'Mathe Kasten 1' },
      { inventoryNumber: '1081', name: 'Rechenrahmen', subject: 'Mathematik', locationName: 'Mathe Kasten 1' },
    ], 'skip');

    assert.equal(result.imported, 1);
    assert.equal(result.skipped, 1);
    const snapshot = await store.snapshot(teacher);
    assert.equal(snapshot.locations.length, 1);
    assert.equal(snapshot.locations[0].name, 'Mathe Kasten 1');
    assert.equal(snapshot.items.length, 2);
  });
});

test('duplicate update mode keeps loan state while correcting inventory metadata', async () => {
  await withStore(async dir => {
    const store = createSchoolInventoryStore(dir);
    const anna = identity('school-a', 'anna', 'Anna A.');
    const ben = identity('school-a', 'ben', 'Ben B.');
    const item = await store.createItem(anna, { inventoryNumber: '9', name: 'Alte Bezeichnung' });
    await store.borrow(ben, item.id);

    const result = await store.importItems(anna, [
      { inventoryNumber: '9', name: 'Neue Bezeichnung', subject: 'Deutsch', locationName: 'Deutsch Kasten' },
    ], 'update');

    assert.equal(result.updated, 1);
    const updated = (await store.snapshot(anna)).items[0];
    assert.equal(updated.name, 'Neue Bezeichnung');
    assert.equal(updated.status, 'borrowed');
    assert.equal(updated.borrowedByUserId, 'ben');
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createInventoryStore } from '../server/inventoryStore';
import type { TeacherIdentity } from '../server/teacherIdentity';

function teacher(schoolId: string, userId: string, displayName: string): TeacherIdentity {
  return {
    userId,
    email: userId + '@school.test',
    schoolId,
    schoolCode: schoolId,
    schoolDomain: 'school.test',
    schoolName: schoolId,
    displayName,
    handle: userId,
  };
}

async function withStore(run: (store: ReturnType<typeof createInventoryStore>) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'klassio-inventory-'));
  try {
    await run(createInventoryStore(dir));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test('trennt Inventar strikt nach verifizierter Schule', async () => {
  await withStore(async store => {
    const schoolA = teacher('school-a', 'anna', 'Anna');
    const schoolB = teacher('school-b', 'bert', 'Bert');

    await store.createItem(schoolA, { inventoryNumber: 'A-1', name: 'Geometriekoffer' });

    const snapshotA = await store.snapshot(schoolA);
    const snapshotB = await store.snapshot(schoolB);

    assert.equal(snapshotA.items.length, 1);
    assert.equal(snapshotB.items.length, 0);
  });
});

test('gleiche Inventarnummer aktualisiert beim Import statt zu duplizieren', async () => {
  await withStore(async store => {
    const user = teacher('school-a', 'anna', 'Anna');
    await store.createItem(user, { inventoryNumber: '231', name: 'Alter Name', quantity: 1 });

    const result = await store.importRecords(user, [
      { inventoryNumber: '231', name: 'Zahlenstrahl magnetisch', quantity: 2, location: 'Mathe · Kasten 4' },
    ]);

    const snapshot = await store.snapshot(user);
    assert.equal(result.updated, 1);
    assert.equal(result.created, 0);
    assert.equal(snapshot.items.length, 1);
    assert.equal(snapshot.items[0].name, 'Zahlenstrahl magnetisch');
    assert.equal(snapshot.items[0].quantity, 2);
    assert.equal(snapshot.locations.length, 1);
    assert.equal(snapshot.locations[0].name, 'Mathe · Kasten 4');
  });
});

test('Ausleihe verhindert Überbuchung und Rückgabe gibt Bestand frei', async () => {
  await withStore(async store => {
    const user = teacher('school-a', 'anna', 'Anna');
    const item = await store.createItem(user, { inventoryNumber: '10', name: 'Experimentierkoffer', quantity: 2 });

    const first = await store.createLoan(user, { itemId: item.id, quantity: 2 });
    await assert.rejects(
      () => store.createLoan(user, { itemId: item.id, quantity: 1 }),
      /ITEM_UNAVAILABLE/,
    );

    await store.returnLoan(user, first.id);
    const second = await store.createLoan(user, { itemId: item.id, quantity: 1 });
    assert.equal(second.quantity, 1);
  });
});

test('Lehrmittel mit offener Ausleihe kann nicht versehentlich gelöscht werden', async () => {
  await withStore(async store => {
    const user = teacher('school-a', 'anna', 'Anna');
    const item = await store.createItem(user, { name: 'Waage' });
    await store.createLoan(user, { itemId: item.id });

    await assert.rejects(() => store.deleteItem(user, item.id), /ITEM_ON_LOAN/);
  });
});

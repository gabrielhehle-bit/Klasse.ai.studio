import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMaterialStorageSize, upsertMaterial } from './materialLibraryUtils';

const material = (id: string, title: string) => ({
  id,
  titel: title,
  beschreibung: '',
  typ: 'notiz',
  faecher: [],
  schulstufen: [],
  tags: [],
  erstelltAm: '2026-09-14T00:00:00.000Z',
}) as any;

test('upsertMaterial replaces an edited material instead of duplicating its id', () => {
  const result = upsertMaterial([material('a', 'Alt'), material('b', 'B')], material('a', 'Neu'));
  assert.equal(result.length, 2);
  assert.equal(result.find(item => item.id === 'a')?.titel, 'Neu');
});

test('upsertMaterial appends genuinely new material', () => {
  const result = upsertMaterial([material('a', 'A')], material('b', 'B'));
  assert.deepEqual(result.map(item => item.id), ['a', 'b']);
});

test('material storage size counts serialized payload only once', () => {
  const item = { ...material('a', 'A'), inhaltText: 'x'.repeat(1024) };
  const size = calculateMaterialStorageSize([item]);
  assert.ok(size > 0);
  assert.ok(size < 0.01);
});

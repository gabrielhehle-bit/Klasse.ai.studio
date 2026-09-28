import test from 'node:test';
import assert from 'node:assert/strict';
import type { Student } from '../types';
import { evaluatePhotoAlbumSharing } from './photoAlbumPolicy';

function student(id: string, fotoFreigabe?: Student['fotoFreigabe']): Student {
  return {
    id,
    vorname: id,
    nachname: 'Test',
    name: id,
    niveau: 1,
    notiz: '',
    fotoFreigabe,
    geburtstag: '',
    staatsbuergerschaft: '',
    religion: '',
    besuchsjahr: '',
    espf: false,
    spf: false,
    erstsprache: '',
    geschlecht: '',
    gruppen: [],
  };
}

test('parent album sharing is allowed only for explicitly allowed selected pupils', () => {
  const result = evaluatePhotoAlbumSharing([
    student('A', 'erlaubt'),
    student('B', 'erlaubt'),
  ]);
  assert.equal(result.canShare, true);
  assert.equal(result.allowedCount, 2);
  assert.deepEqual(result.blocked, []);
});

test('homepage-only and missing consent block a parent album link', () => {
  const result = evaluatePhotoAlbumSharing([
    student('A', 'nur_homepage'),
    student('B'),
  ]);
  assert.equal(result.canShare, false);
  assert.deepEqual(result.blocked.map(item => item.reason), ['homepage_only', 'missing']);
});

test('no pupil selection requires an explicit confirmation that no child is identifiable', () => {
  assert.equal(evaluatePhotoAlbumSharing([]).canShare, false);
  assert.equal(evaluatePhotoAlbumSharing([]).needsSelection, true);
  assert.equal(evaluatePhotoAlbumSharing([], true).canShare, true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import type { Student } from '../types';
import { evaluatePhotoAlbumSharing, isPhotoAlbumShareExpired } from './photoAlbumPolicy';

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


test('photo album share expiry is evaluated against the supplied clock', () => {
  const now = Date.parse('2026-09-28T12:00:00.000Z');
  assert.equal(isPhotoAlbumShareExpired('2026-09-28T11:59:59.000Z', now), true);
  assert.equal(isPhotoAlbumShareExpired('2026-09-28T12:00:01.000Z', now), false);
  assert.equal(isPhotoAlbumShareExpired(undefined, now), false);
});

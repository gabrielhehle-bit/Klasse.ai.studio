import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMaterialStorageSize,
  normalizeMaterialExternalLink,
  removeMaterialReferencesFromClasses,
  removeMaterialReferencesFromWeeklyPlan,
  sanitizeMaterialForType,
  upsertMaterial,
  validateMaterialFile,
} from './materialLibraryUtils';

const material = (id: string, title: string) => ({
  id,
  titel: title,
  beschreibung: '',
  typ: 'notiz',
  faecher: [],
  schulstufen: [],
  tags: [],
  erstelltAm: '2026-09-14T00:00:00.000Z',
  favorit: false,
  kiGeneriert: false,
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

test('material file validation rejects unsupported or oversized files consistently', () => {
  assert.match(
    validateMaterialFile({ size: 10, type: 'text/html' } as File).error || '',
    /Nicht unterstützter Dateityp/,
  );
  assert.match(
    validateMaterialFile({ size: 4 * 1024 * 1024, type: 'application/pdf' } as File).error || '',
    /Datei zu groß/,
  );
  assert.match(
    validateMaterialFile({ size: 2 * 1024 * 1024, type: 'image/png' } as File).warning || '',
    /über 1 MB/,
  );
  assert.equal(
    validateMaterialFile({ size: 1000, type: 'image/jpeg' } as File).error,
    null,
  );
});

test('external material links are restricted to http and https', () => {
  assert.equal(normalizeMaterialExternalLink('example.org'), 'https://example.org/');
  assert.equal(normalizeMaterialExternalLink(' https://schule.example/path '), 'https://schule.example/path');
  assert.equal(normalizeMaterialExternalLink('javascript:alert(1)'), undefined);
  assert.equal(normalizeMaterialExternalLink(''), undefined);
});

test('changing material type removes stale file or link payload', () => {
  const link = sanitizeMaterialForType({
    ...material('a', 'Link'),
    typ: 'link',
    externerLink: 'https://example.org',
    dateiName: 'old.pdf',
    dateiTyp: 'application/pdf',
    dateiInhalt: 'data:application/pdf;base64,AAAA',
  });
  assert.equal(link.dateiInhalt, undefined);
  assert.equal(link.dateiName, undefined);
  assert.equal(link.externerLink, 'https://example.org');

  const note = sanitizeMaterialForType({
    ...material('b', 'Notiz'),
    typ: 'notiz',
    externerLink: 'https://example.org',
  });
  assert.equal(note.externerLink, undefined);
});

test('deleting a material removes only its weekly-plan references', () => {
  const plan = {
    38: {
      Montag: {
        0: { thema: 'A', material: 'Buch', materialIds: ['a', 'b'] },
        1: { thema: 'B', materialIds: ['b'] },
        zeitunabhaengig: [{ thema: 'Termin' }],
      },
    },
  } as any;

  const next = removeMaterialReferencesFromWeeklyPlan(plan, ['a']);
  assert.deepEqual(next[38].Montag[0].materialIds, ['b']);
  assert.deepEqual(next[38].Montag[1].materialIds, ['b']);
  assert.equal(next[38].Montag[0].material, 'Buch');
  assert.deepEqual(next[38].Montag.zeitunabhaengig, [{ thema: 'Termin' }]);
});

test('resetting the library clears all weekly-plan material ids without deleting lesson data', () => {
  const plan = {
    38: {
      Dienstag: {
        8: { fach: 'Deutsch', thema: '9. Stunde', materialIds: ['x', 'y'] },
      },
    },
  } as any;

  const next = removeMaterialReferencesFromWeeklyPlan(plan);
  assert.deepEqual(next[38].Dienstag[8], {
    fach: 'Deutsch',
    thema: '9. Stunde',
    materialIds: [],
  });
});


test('deleting a global material cleans inactive class week plans too', () => {
  const classes = [
    {
      id: 'a',
      wochenplanung: {
        38: { Montag: { 0: { thema: 'A', materialIds: ['shared', 'keep-a'] } } },
      },
    },
    {
      id: 'b',
      wochenplanung: {
        39: { Freitag: { 9: { thema: 'B', materialIds: ['shared', 'keep-b'] } } },
      },
    },
  ];

  const next = removeMaterialReferencesFromClasses(classes, ['shared'])!;
  assert.deepEqual(next[0].wochenplanung?.[38].Montag[0].materialIds, ['keep-a']);
  assert.deepEqual(next[1].wochenplanung?.[39].Freitag[9].materialIds, ['keep-b']);
});

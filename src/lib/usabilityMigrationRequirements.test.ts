import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAppState, syncActiveClass, switchClassState } from './appState';

test('Migration: Entwicklungslisten bleiben bei Klassenwechsel und JSON-Roundtrip getrennt', () => {
  const loaded = normalizeAppState({
    schuljahr: '2026/27',
    activeClassId: 'a',
    classes: [
      {
        id: 'a',
        name: '1a',
        stufe: 1,
        schueler: [{ id: 'a1', vorname: 'A', nachname: 'Kind' }],
        studentDevelopmentLists: [{
          id: 'dev-a',
          schuelerId: 'a1',
          titel: 'Lautlesen',
          spalten: [],
          eintraege: [{ id: 'e-a', datum: '2026-09-16', werte: {} }],
        }],
      },
      {
        id: 'b',
        name: '1b',
        stufe: 1,
        schueler: [{ id: 'b1', vorname: 'B', nachname: 'Kind' }],
        studentDevelopmentLists: [{
          id: 'dev-b',
          schuelerId: 'b1',
          titel: 'Antolin',
          spalten: [],
          eintraege: [{ id: 'e-b', datum: '2026-09-16', werte: {} }],
        }],
      },
    ],
  } as any);

  assert.equal(loaded.studentDevelopmentLists?.[0]?.id, 'dev-a');

  const classB = switchClassState(syncActiveClass(loaded), 'b');
  assert.equal(classB.studentDevelopmentLists?.[0]?.id, 'dev-b');

  const roundtrip = normalizeAppState(JSON.parse(JSON.stringify(syncActiveClass(classB))));
  const backToA = switchClassState(roundtrip, 'a');
  assert.equal(backToA.studentDevelopmentLists?.[0]?.id, 'dev-a');
  assert.equal(roundtrip.classes.find(item => item.id === 'b')?.studentDevelopmentLists?.[0]?.id, 'dev-b');
});

test('Migration: neue Lautlese-Metadaten überleben Klassenwechsel und JSON-Roundtrip unverändert', () => {
  const readingMeta = {
    type: 'lesen',
    rgw: 84,
    accuracy: 96,
    totalWordsRead: 88,
    errorsCount: 4,
    selfCorrections: 2,
    lastReadWordIndex: 87,
    lastReadWord: 'Garten',
    prosodyRating: 'ueberwiegend',
    orientation: {
      value: 85,
      label: 'Orientierung – keine amtliche Norm',
      source: 'Dokumentierte Quelle',
    },
    belowOrientation: true,
  };

  const state = normalizeAppState({
    schuljahr: '2026/27',
    activeClassId: 'a',
    classes: [{
      id: 'a',
      name: '2a',
      stufe: 2,
      schueler: [{ id: 'a1', vorname: 'A', nachname: 'Kind' }],
      diagnostikErhebungen: [{
        id: 'read-a',
        schuelerId: 'a1',
        testId: 'live-lesefluessigkeit',
        datum: '2026-09-16',
        schuljahr: '2026/27',
        schulstufe: 2,
        rohwert: 84,
        ergebniswert: 84,
        kommentar: 'Lautleseprotokoll',
        durchgefuehrtVon: 'Lehrperson',
        foerderbedarfErkannt: false,
        auffaelligkeitErkannt: false,
        meta: readingMeta,
      }],
    }],
  } as any);

  const serialized = JSON.stringify(syncActiveClass(state));
  const restored = normalizeAppState(JSON.parse(serialized));
  const meta = restored.diagnostikErhebungen?.[0]?.meta as any;

  assert.deepEqual(meta, readingMeta);
  assert.equal(meta.lastReadWord, 'Garten');
  assert.equal(meta.prosodyRating, 'ueberwiegend');
  assert.equal(meta.orientation.value, 85);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { getDiagnosticAlert, getDiagnosticClassId, isDiagnosticDateInFuture, validateDiagnosticEntry } from './diagnosticData';

test('diagnostic class id prefers the active class id', () => {
  assert.equal(
    getDiagnosticClassId({
      activeClassId: 'class-a',
      schuljahr: '2026/27',
      klassenbezeichnung: '3a',
    }),
    'class-a',
  );
});

test('diagnostic class id has a stable legacy fallback without an active class', () => {
  assert.equal(
    getDiagnosticClassId({
      activeClassId: '',
      schuljahr: '2026/27',
      klassenbezeichnung: '3a',
    }),
    '2026/27:3a',
  );
});

test('diagnostic validation warns when a record belongs to another class', () => {
  const result = validateDiagnosticEntry(
    {
      activeClassId: 'class-a',
      schuljahr: '2026/27',
      klassenbezeichnung: '3a',
      schueler: [{ id: 'student-a' }] as any,
      diagnostikTests: [{
        id: 'live-test',
        name: 'Lernstandsbeobachtung',
        kategorie: 'sonstige',
        kurzbeschreibung: 'Test',
        einheit: 'punkte',
        schwellenwert: 1,
        schwellenrichtung: 'unter',
        schulstufen: [3],
      }],
    },
    {
      id: 'entry-1',
      schuelerId: 'student-a',
      testId: 'live-test',
      datum: '2026-09-14',
      schuljahr: '2026/27',
      schulstufe: 3,
      rohwert: 4,
      ergebniswert: 4,
      durchgefuehrtVon: 'Lehrperson',
      foerderbedarfErkannt: false,
      classId: 'class-b',
    },
  );

  assert.equal(result.valid, true);
  assert.equal(result.warnings.some(warning => warning.includes('anderen Klasse')), true);
});


test('future-date checks use the local Austrian calendar day instead of UTC', () => {
  const previousTz = process.env.TZ;
  process.env.TZ = 'Europe/Vienna';
  try {
    const justAfterMidnightVienna = new Date('2026-09-13T22:30:00.000Z');
    assert.equal(isDiagnosticDateInFuture('2026-09-14', justAfterMidnightVienna), false);
    assert.equal(isDiagnosticDateInFuture('2026-09-15', justAfterMidnightVienna), true);
  } finally {
    if (previousTz === undefined) delete process.env.TZ;
    else process.env.TZ = previousTz;
  }
});


test('diagnostic alert: non-positive threshold disables automatic warning', () => {
  const testDef = {
    id: 'live-lesefluessigkeit',
    name: '1:1 Lautleseprotokoll',
    kategorie: 'lesen',
    kurzbeschreibung: 'Lernverlaufsbeobachtung',
    einheit: 'rohwert',
    schwellenwert: 0,
    schwellenrichtung: 'unter',
    schulstufen: [1, 2, 3, 4],
  } as any;

  assert.equal(getDiagnosticAlert(testDef, 12), false);
  assert.equal(getDiagnosticAlert(testDef, 0), false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAppState, switchClassState, syncActiveClass } from './appState';
import { parseBackupText, prepareBackupRestore } from './backupRestore';
import { createEncryptedBackup, serializeBackup } from './backupCryptoService';
import { createVault } from './vaultService';

function makeLegacyKlassenBackup() {
  return {
    version: 2,
    activeClassId: 'alt-3a',
    schuljahr: '2025/26',
    klassen: [
      {
        id: 'alt-3a',
        name: '3a',
        stufe: 3,
        klassenvorstand: true,
        schuljahr: '2025/26',
        schueler: [
          { id: 'a1', vorname: 'Anna', nachname: 'Altbestand' },
          { id: 'a2', vorname: 'Ben', nachname: 'Altbestand' },
        ],
        noten: {
          Deutsch: {
            a1: [{ id: 'n1', wert: 2, titel: 'Lesen' }],
          },
        },
        notenMeta: {
          Deutsch: { mode: 'grade', abschnitte: ['Lesen', 'Schreiben'] },
        },
        notenGewichtung: {
          Deutsch: { Lesen: 60, Schreiben: 40 },
        },
        jahresplanung: {
          Deutsch: [{ id: 'jp1', monat: 'September', thema: 'Erzählungen' }],
        },
        wochenplanung: {
          '38': { Montag: { 1: { fach: 'Deutsch', thema: 'Wortarten' } } },
        },
        anwesenheit: {
          '2025-09-15': { a1: true, a2: false },
        },
        anwesenheitDetail: {
          '2025-09-15': { a2: { status: 'krank', entschuldigt: true } },
        },
        sitzplan_schueler: {
          a1: { x: 120, y: 180 },
          a2: { x: 320, y: 180 },
        },
        sitzplan_objekte: [{ id: 'desk-a', type: 'desk', x: 100, y: 140 }],
        diagnostikErgebnisse: [{ id: 'diag-a', schuelerId: 'a1', checkId: 'lesen', wert: 54 }],
      },
      {
        id: 'alt-4b',
        name: '4b',
        stufe: 4,
        klassenvorstand: false,
        schuljahr: '2025/26',
        schueler: [
          { id: 'b1', vorname: 'Clara', nachname: 'Altbestand' },
        ],
        noten: {
          Mathematik: {
            b1: [{ id: 'n2', wert: 87, titel: 'Brüche' }],
          },
        },
        notenMeta: {
          Mathematik: { mode: 'percent', abschnitte: ['Arbeiten'] },
        },
        notenGewichtung: {
          Mathematik: { Arbeiten: 100 },
        },
        jahresplanung: {
          Mathematik: [{ id: 'jp2', monat: 'Oktober', thema: 'Brüche' }],
        },
        wochenplanung: {
          '39': { Mittwoch: { 2: { fach: 'Mathematik', thema: 'Brüche' } } },
        },
        anwesenheit: {
          '2025-09-16': { b1: true },
        },
        sitzplan_schueler: {
          b1: { x: 220, y: 260 },
        },
        sitzplan_objekte: [{ id: 'desk-b', type: 'desk', x: 200, y: 220 }],
        diagnostikErgebnisse: [{ id: 'diag-b', schuelerId: 'b1', checkId: 'zehneruebergang', wert: 9 }],
      },
    ],
  };
}

test('historisches klassen-Mehrklassenbackup bleibt vollständig erhalten', () => {
  const legacy = makeLegacyKlassenBackup();
  const normalized = normalizeAppState(legacy as any);

  assert.equal(normalized.classes.length, 2);
  assert.equal(normalized.activeClassId, 'alt-3a');
  assert.equal(normalized.klassenbezeichnung, '3a');
  assert.equal(normalized.schueler.length, 2);
  assert.equal(normalized.schueler[0].vorname, 'Anna');
  assert.deepEqual(normalized.noten.Deutsch, legacy.klassen[0].noten.Deutsch);
  assert.deepEqual(normalized.notenMeta.Deutsch, legacy.klassen[0].notenMeta.Deutsch);
  assert.deepEqual(normalized.notenGewichtung.Deutsch, legacy.klassen[0].notenGewichtung.Deutsch);
  assert.deepEqual(normalized.jahresplanung.Deutsch, legacy.klassen[0].jahresplanung.Deutsch);
  assert.deepEqual(normalized.wochenplanung['38'], legacy.klassen[0].wochenplanung['38']);
  assert.deepEqual(normalized.anwesenheit['2025-09-15'], legacy.klassen[0].anwesenheit['2025-09-15']);
  assert.deepEqual(normalized.sitzplan_schueler, legacy.klassen[0].sitzplan_schueler);
  assert.deepEqual(normalized.diagnostikErgebnisse, legacy.klassen[0].diagnostikErgebnisse);

  const second = switchClassState(normalized, 'alt-4b');
  assert.equal(second.klassenbezeichnung, '4b');
  assert.equal(second.schueler.length, 1);
  assert.equal(second.schueler[0].vorname, 'Clara');
  assert.deepEqual(second.noten.Mathematik, legacy.klassen[1].noten.Mathematik);
  assert.deepEqual(second.notenMeta.Mathematik, legacy.klassen[1].notenMeta.Mathematik);
  assert.deepEqual(second.notenGewichtung.Mathematik, legacy.klassen[1].notenGewichtung.Mathematik);
  assert.deepEqual(second.jahresplanung.Mathematik, legacy.klassen[1].jahresplanung.Mathematik);
  assert.deepEqual(second.wochenplanung['39'], legacy.klassen[1].wochenplanung['39']);
  assert.deepEqual(second.anwesenheit['2025-09-16'], legacy.klassen[1].anwesenheit['2025-09-16']);
  assert.deepEqual(second.sitzplan_schueler, legacy.klassen[1].sitzplan_schueler);
  assert.deepEqual(second.diagnostikErgebnisse, legacy.klassen[1].diagnostikErgebnisse);
});

test('historisches klassen-Backup wird als JSON und einfache JS-Zuweisung eingelesen', async () => {
  const legacy = makeLegacyKlassenBackup();
  const { vaultKey } = await createVault('Legacy compatibility test password 123!');

  for (const raw of [
    JSON.stringify(legacy),
    '\uFEFF' + JSON.stringify(legacy),
    'const backup = ' + JSON.stringify(legacy) + ';',
    'export default ' + JSON.stringify(legacy) + ';',
  ]) {
    const parsed = parseBackupText(raw);
    const decoded = await prepareBackupRestore(parsed, vaultKey, () => null);
    assert.ok(decoded);
    const normalized = normalizeAppState(decoded);
    assert.equal(normalized.classes.length, 2);
    assert.equal(normalized.classes[0].name, '3a');
    assert.equal(normalized.classes[1].name, '4b');
  }
});

test('historischer Mehrklassenstand überlebt Migration, Verschlüsselung und Restore', async () => {
  const legacy = makeLegacyKlassenBackup();
  const migrated = syncActiveClass(normalizeAppState(legacy as any));
  const vault = await createVault('Legacy encrypted roundtrip password 123!');

  const encrypted = await createEncryptedBackup(migrated, vault.vaultKey, vault.vaultRecord);
  const serialized = serializeBackup(encrypted);

  assert.ok(!serialized.includes('Anna'));
  assert.ok(!serialized.includes('Clara'));
  assert.ok(!serialized.includes('Erzählungen'));
  assert.ok(!serialized.includes('Brüche'));

  const parsed = parseBackupText(serialized);
  const restoredRaw = await prepareBackupRestore(parsed, vault.vaultKey, () => null);
  assert.ok(restoredRaw);

  const restored = normalizeAppState(restoredRaw);
  assert.equal(restored.classes.length, 2);

  const class3a = restored.classes.find(item => item.id === 'alt-3a');
  const class4b = restored.classes.find(item => item.id === 'alt-4b');
  assert.ok(class3a && class4b);

  assert.equal(class3a.schueler[0].vorname, 'Anna');
  assert.deepEqual(class3a.noten, migrated.classes.find(item => item.id === 'alt-3a')?.noten);
  assert.deepEqual(class3a.jahresplanung, migrated.classes.find(item => item.id === 'alt-3a')?.jahresplanung);
  assert.deepEqual(class3a.wochenplanung, migrated.classes.find(item => item.id === 'alt-3a')?.wochenplanung);
  assert.deepEqual(class3a.anwesenheit, migrated.classes.find(item => item.id === 'alt-3a')?.anwesenheit);
  assert.deepEqual(class3a.sitzplan_schueler, migrated.classes.find(item => item.id === 'alt-3a')?.sitzplan_schueler);

  assert.equal(class4b.schueler[0].vorname, 'Clara');
  assert.deepEqual(class4b.noten, migrated.classes.find(item => item.id === 'alt-4b')?.noten);
  assert.deepEqual(class4b.jahresplanung, migrated.classes.find(item => item.id === 'alt-4b')?.jahresplanung);
  assert.deepEqual(class4b.wochenplanung, migrated.classes.find(item => item.id === 'alt-4b')?.wochenplanung);
  assert.deepEqual(class4b.anwesenheit, migrated.classes.find(item => item.id === 'alt-4b')?.anwesenheit);
  assert.deepEqual(class4b.sitzplan_schueler, migrated.classes.find(item => item.id === 'alt-4b')?.sitzplan_schueler);
});

test('beschädigte historische klassen-Listen werden vor der Migration abgelehnt', async () => {
  const { vaultKey } = await createVault('Legacy validation test password 123!');

  for (const invalid of [
    { klassen: 'kaputt' },
    { klassen: [null] },
    { klassen: [{ id: 'x', schueler: {} }] },
  ]) {
    await assert.rejects(
      prepareBackupRestore(invalid, vaultKey, () => null),
      /Klassenliste|gültigen Klassio-Datenbestand/
    );
  }
});

test('aktuelles classes-Feld hat Vorrang vor historischem klassen-Alias', () => {
  const normalized = normalizeAppState({
    activeClassId: 'current',
    classes: [{ id: 'current', name: 'Aktuell', stufe: 4, schueler: [{ id: 'c1', vorname: 'Current' }] }],
    klassen: [{ id: 'legacy', name: 'Alt', stufe: 3, schueler: [{ id: 'l1', vorname: 'Legacy' }] }],
  } as any);

  assert.equal(normalized.classes.length, 1);
  assert.equal(normalized.classes[0].id, 'current');
  assert.equal(normalized.klassenbezeichnung, 'Aktuell');
  assert.equal(normalized.schueler[0].vorname, 'Current');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectInventoryColumns,
  mapInventoryRows,
  parseInventoryText,
  uniqueImportRecords,
} from './inventoryImport';

test('ordnet typische deutsche Inventarspalten automatisch zu', () => {
  const mapping = detectInventoryColumns([
    'Inventar-Nr.',
    'Bezeichnung',
    'Fach',
    'Kasten',
    'Anzahl',
    'Bemerkung',
  ]);

  assert.equal(mapping.inventoryNumber, 'Inventar-Nr.');
  assert.equal(mapping.name, 'Bezeichnung');
  assert.equal(mapping.subject, 'Fach');
  assert.equal(mapping.location, 'Kasten');
  assert.equal(mapping.quantity, 'Anzahl');
  assert.equal(mapping.note, 'Bemerkung');
});

test('liest semikolongetrennte Kastenliste mit Kopfzeile', () => {
  const records = parseInventoryText(
    'Nr.;Lehrmittel;Fach;Kasten;Anzahl\n' +
    '231;Zahlenstrahl magnetisch;Mathematik;Kasten 4;2\n' +
    '232;Rechenrahmen groß;Mathematik;Kasten 4;6'
  );

  assert.equal(records.length, 2);
  assert.equal(records[0].inventoryNumber, '231');
  assert.equal(records[0].name, 'Zahlenstrahl magnetisch');
  assert.equal(records[0].location, 'Kasten 4');
  assert.equal(records[0].quantity, 2);
  assert.equal(records[1].quantity, 6);
});

test('liest einfache alte Liste ohne Kopfzeile pragmatisch', () => {
  const records = parseInventoryText(
    'M-0234  Experimentierkoffer Magnetismus  3 Stk.\n' +
    'M-0235  Balkenwaage'
  );

  assert.equal(records.length, 2);
  assert.equal(records[0].inventoryNumber, 'M-0234');
  assert.equal(records[0].name, 'Experimentierkoffer Magnetismus');
  assert.equal(records[0].quantity, 3);
  assert.equal(records[1].inventoryNumber, 'M-0235');
  assert.equal(records[1].name, 'Balkenwaage');
});

test('mappt Excel-Zeilen und bereinigt Mengen', () => {
  const rows = [
    { Inventarnr: ' 77 ', Bezeichnung: ' Geometriekoffer ', Bestand: '4 Stück', Standort: 'Mathe 2' },
  ];
  const records = mapInventoryRows(rows);

  assert.equal(records[0].inventoryNumber, '77');
  assert.equal(records[0].name, 'Geometriekoffer');
  assert.equal(records[0].quantity, 4);
  assert.equal(records[0].location, 'Mathe 2');
});

test('entfernt doppelte Inventarnummern in einer Importvorschau', () => {
  const records = uniqueImportRecords([
    { inventoryNumber: 'A-1', name: 'Koffer A', subject: '', location: '', room: '', quantity: 1, condition: '', note: '' },
    { inventoryNumber: 'a-1', name: 'Koffer A doppelt', subject: '', location: '', room: '', quantity: 1, condition: '', note: '' },
    { inventoryNumber: '', name: 'Waage', subject: 'SU', location: 'Kasten 1', room: '', quantity: 1, condition: '', note: '' },
    { inventoryNumber: '', name: 'Waage', subject: 'SU', location: 'Kasten 1', room: '', quantity: 1, condition: '', note: '' },
  ]);

  assert.equal(records.length, 2);
  assert.equal(records[0].name, 'Koffer A');
  assert.equal(records[1].name, 'Waage');
});


test('leere Tabellenspalten verschieben nachfolgende Werte nicht', () => {
  const records = parseInventoryText(
    'Nr.;Bezeichnung;Fach;Kasten;Raum;Anzahl\n' +
    '501;Magnettafel;;SU Kasten 2;;3'
  );

  assert.equal(records.length, 1);
  assert.equal(records[0].inventoryNumber, '501');
  assert.equal(records[0].name, 'Magnettafel');
  assert.equal(records[0].subject, '');
  assert.equal(records[0].location, 'SU Kasten 2');
  assert.equal(records[0].room, '');
  assert.equal(records[0].quantity, 3);
});

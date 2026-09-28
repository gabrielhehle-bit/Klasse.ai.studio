import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectInventoryColumnMapping,
  parseInventoryText,
  rowsToInventoryCandidates,
} from './inventoryImport';

test('detects common German school inventory spreadsheet headers', () => {
  const mapping = detectInventoryColumnMapping([
    'Inv. Nr.', 'Bezeichnung', 'Fach', 'Kasten', 'Raum', 'Anzahl', 'Bemerkung',
  ]);
  assert.deepEqual(mapping, {
    inventoryNumber: 0,
    name: 1,
    subject: 2,
    locationName: 3,
    room: 4,
    quantity: 5,
    notes: 6,
  });
});

test('turns spreadsheet rows into clean inventory candidates', () => {
  const rows = rowsToInventoryCandidates([
    ['1042', 'Geometriekörper', 'Mathematik', 'Mathe Kasten 1', '12', 1, 'vollständig'],
  ], {
    inventoryNumber: 0,
    name: 1,
    subject: 2,
    locationName: 3,
    room: 4,
    quantity: 5,
    notes: 6,
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].inventoryNumber, '1042');
  assert.equal(rows[0].locationName, 'Mathe Kasten 1');
});

test('parses a photographed or copied cabinet list after text recognition', () => {
  const rows = parseInventoryText('1042 - Geometriekörper\n1081 - Rechenrahmen groß');
  assert.deepEqual(rows, [
    { inventoryNumber: '1042', name: 'Geometriekörper' },
    { inventoryNumber: '1081', name: 'Rechenrahmen groß' },
  ]);
});

test('parses pasted semicolon lists with a header row', () => {
  const rows = parseInventoryText(
    'Inventar Nr;Bezeichnung;Fach;Kasten\n2137;Experimentierbox Magnetismus;SU;SU Kasten 3'
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].subject, 'SU');
  assert.equal(rows[0].locationName, 'SU Kasten 3');
});

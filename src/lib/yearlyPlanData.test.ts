import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyYearPlanImportRows,
  yearPlanCellDisplayText,
  yearPlanCellEntries,
  shiftYearPlanSubjectForward,
} from './yearlyPlanData';

test('Jahresplanung: mehrere Themen derselben KW und desselben Fachs bleiben erhalten', () => {
  const result = applyYearPlanImportRows({}, [
    { kw: 38, subjectId: 'lesen', thema: 'Leseflüssigkeit', buch: 'S. 10', type: 'standard' },
    { kw: 38, subjectId: 'lesen', thema: 'Sinnerfassung', buch: 'S. 11', type: 'standard' },
  ], 'overwrite');

  const entries = yearPlanCellEntries(result[38].lesen);
  assert.deepEqual(entries.map(entry => entry.thema), ['Leseflüssigkeit', 'Sinnerfassung']);
  assert.equal(result[38].lesen.items?.length, 2);
});

test('Jahresplanung: Ergänzen bewahrt vorhandene Themen und ergänzt neue ohne Duplikate', () => {
  const existing = {
    38: {
      lesen: { thema: 'Vorhandenes Thema', buch: 'Buch A', type: 'standard' },
    },
  };

  const result = applyYearPlanImportRows(existing, [
    { kw: 38, subjectId: 'lesen', thema: 'Vorhandenes Thema', buch: 'Buch A', type: 'standard' },
    { kw: 38, subjectId: 'lesen', thema: 'Neues Thema', buch: 'Buch B', type: 'lzk' },
  ], 'merge');

  assert.deepEqual(
    yearPlanCellEntries(result[38].lesen).map(entry => entry.thema),
    ['Vorhandenes Thema', 'Neues Thema'],
  );
});

test('Jahresplanung: Überschreiben ersetzt nur die tatsächlich importierte Zelle', () => {
  const existing = {
    38: {
      lesen: { thema: 'Alt', type: 'standard' },
      mathe_et: { thema: 'Mathe bleibt', type: 'standard' },
    },
    39: {
      lesen: { thema: 'Andere Woche bleibt', type: 'standard' },
    },
  };

  const result = applyYearPlanImportRows(existing, [
    { kw: 38, subjectId: 'lesen', thema: 'Neu', type: 'sa', completed: true },
  ], 'overwrite');

  assert.equal(result[38].lesen.thema, 'Neu');
  assert.equal(result[38].lesen.type, 'sa');
  assert.equal(result[38].lesen.completed, true);
  assert.equal(result[38].mathe_et.thema, 'Mathe bleibt');
  assert.equal(result[39].lesen.thema, 'Andere Woche bleibt');
});

test('Jahresplanung: Anzeige und Exporttext enthalten alle Mehrfachthemen', () => {
  const cell = {
    thema: '',
    items: [
      { thema: 'Lesen', buch: 'S. 4', type: 'standard' },
      { thema: 'Rechtschreiben', buch: 'S. 8', type: 'standard' },
    ],
  };

  assert.equal(yearPlanCellDisplayText(cell), 'Lesen (S. 4) · Rechtschreiben (S. 8)');
});


test('Jahresplanung: Verschieben folgt der Schulwochen-Reihenfolge über den Jahreswechsel', () => {
  const existing = {
    51: { lesen: { thema: 'A', type: 'standard' } },
    52: { lesen: { thema: 'B', type: 'standard' } },
    2: { lesen: { thema: 'C', type: 'standard' } },
  };

  const shifted = shiftYearPlanSubjectForward(
    existing,
    'lesen',
    51,
    [51, 52, 2, 3],
  );

  assert.equal(shifted[51]?.lesen, undefined);
  assert.equal(shifted[52].lesen.thema, 'A');
  assert.equal(shifted[2].lesen.thema, 'B');
  assert.equal(shifted[3].lesen.thema, 'C');
});

test('Jahresplanung: Verschieben erfindet keine Woche hinter dem Schuljahresende', () => {
  const existing = {
    30: { lesen: { thema: 'Letztes Thema', type: 'standard' } },
  };

  const shifted = shiftYearPlanSubjectForward(existing, 'lesen', 30, [29, 30]);

  assert.equal(shifted[30].lesen.thema, 'Letztes Thema');
  assert.equal((shifted as any)[31], undefined);
});

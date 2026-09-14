import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildJahresplanTemplateRows,
  resolveJahresplanSubjectId,
} from './planerExcelService';

const subjects = [
  { id: 'deutsch_sprache', label: 'Deutsch' },
  { id: 'lesen', label: 'Lesen' },
  { id: 'mathe_et', label: 'Mathematik' },
  { id: 'sonstiges', label: 'Sonstiges' },
];

test('Jahresplan-Excel: mehrere Themen einer Zelle werden als mehrere Zeilen exportiert', () => {
  const app: any = {
    schuljahr: '2026/27',
    bundesland: 'VBG',
    jahresplan_faecher: [{ id: 'lesen', label: 'Lesen', color: '' }],
    jahresplanung: {
      38: {
        lesen: {
          thema: '',
          completed: false,
          items: [
            { thema: 'Leseflüssigkeit', buch: 'S. 10', type: 'standard' },
            { thema: 'Sinnerfassung', buch: 'S. 11', type: 'lzk' },
          ],
        },
      },
    },
    calendarSettings: { disabledHolidays: [] },
  };

  const rows = buildJahresplanTemplateRows(app);
  const exported = rows.filter(row => row[0] === 38 && row[3] === 'Lesen');

  assert.equal(exported.length, 2);
  assert.deepEqual(exported.map(row => row[4]), ['Leseflüssigkeit', 'Sinnerfassung']);
  assert.deepEqual(exported.map(row => row[6]), ['S. 10', 'S. 11']);
  assert.deepEqual(exported.map(row => row[7]), ['Standard', 'Lernzielkontrolle']);
});

test('Jahresplan-Excel: Schulstart berücksichtigt das Bundesland', () => {
  const base: any = {
    schuljahr: '2026/27',
    jahresplan_faecher: [{ id: 'lesen', label: 'Lesen', color: '' }],
    jahresplanung: {},
    calendarSettings: { disabledHolidays: [] },
  };

  const east = buildJahresplanTemplateRows({ ...base, bundesland: 'W' } as any);
  const west = buildJahresplanTemplateRows({ ...base, bundesland: 'VBG' } as any);

  const firstEastKw = east[4][0];
  const firstWestKw = west[4][0];

  assert.equal(firstEastKw, 37);
  assert.equal(firstWestKw, 38);
});

test('Jahresplan-Excel: bekannte Fächer werden eindeutig aufgelöst', () => {
  assert.equal(resolveJahresplanSubjectId('Lesen', subjects), 'lesen');
  assert.equal(resolveJahresplanSubjectId('Mathe', subjects), 'mathe_et');
  assert.equal(resolveJahresplanSubjectId('Deutsch', subjects), 'deutsch_sprache');
});

test('Jahresplan-Excel: unbekannte Fächer werden nicht dem ersten Fach zugeschlagen', () => {
  assert.equal(resolveJahresplanSubjectId('Robotik Spezial', subjects), 'sonstiges');
  assert.equal(
    resolveJahresplanSubjectId('Robotik Spezial', subjects.filter(s => s.id !== 'sonstiges')),
    undefined,
  );
});


test('Jahresplan-Excel: Ferienwochen verschieben die SW-Zählung nicht gegenüber der App', () => {
  const app: any = {
    schuljahr: '2026/27',
    bundesland: 'VBG',
    jahresplan_faecher: [{ id: 'lesen', label: 'Lesen', color: '' }],
    jahresplanung: {},
    calendarSettings: { disabledHolidays: [] },
  };

  const rows = buildJahresplanTemplateRows(app).slice(4);
  const holidayIndex = rows.findIndex(row => row[3] === 'Ferien / Schulfrei');
  assert.ok(holidayIndex >= 0, 'mindestens eine Ferienwoche muss in der Vorlage vorkommen');

  const holidaySw = Number(rows[holidayIndex][1]);
  const nextTeaching = rows.slice(holidayIndex + 1).find(row => row[3] === 'Lesen');
  assert.ok(nextTeaching, 'nach der Ferienwoche muss wieder eine Unterrichtswoche folgen');
  assert.equal(Number(nextTeaching![1]), holidaySw + 1);
});

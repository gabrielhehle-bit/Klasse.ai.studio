import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  toggleWeeklyCompletion,
  toggleYearlyEntryCompletion,
  toggleYearlyCellCompletion,
} from './planningCompletionSync';

const subjects = [
  { id: 'deutsch', label: 'Deutsch' },
  { id: 'mathematik', label: 'Mathematik' },
  { id: 'sachunterricht', label: 'SU' },
  { id: 'sonstiges', label: 'Sonstiges' },
];

test('Wochen-Check: gleiches Thema in Deutsch und Mathematik ändert ausschließlich das richtige Fach', () => {
  const week = {
    Montag: {
      0: { fach: 'Deutsch', thema: 'Wiederholung', erledigt: false, housework: 'S. 20' },
      1: { fach: 'Mathematik', thema: 'Wiederholung', erledigt: false },
    },
  };
  const year = {
    deutsch: { thema: 'Wiederholung', completed: false },
    mathematik: { thema: 'Wiederholung', completed: false },
  };
  const unchangedWeek = structuredClone(week), unchangedYear = structuredClone(year);
  const result = toggleWeeklyCompletion({ week, year, tag: 'Montag', idx: 0, subjects });
  assert.equal(result.week.Montag[0].erledigt, true);
  assert.equal(result.week.Montag[0].housework, 'S. 20');
  assert.equal(result.week.Montag[1], week.Montag[1]);
  assert.equal(result.year.deutsch.completed, true);
  assert.equal(result.year.mathematik, year.mathematik);
  assert.deepEqual(week, unchangedWeek);
  assert.deepEqual(year, unchangedYear);
});

test('Wiederholtes Thema in mehreren Deutsch-Stunden ist erst abgeschlossen, wenn beide erledigt sind', () => {
  const week = {
    Montag: { 0: { fach: 'Deutsch', thema: 'Silben lesen', erledigt: false } },
    Donnerstag: { 2: { fach: 'Deutsch (Lesen)', thema: 'Silben lesen', erledigt: false } },
  };
  const year = { deutsch: { thema: 'Silben lesen', completed: false } };
  const first = toggleWeeklyCompletion({ week, year, tag: 'Montag', idx: 0, subjects });
  assert.equal(first.year, year, 'year stays incomplete while the second lesson is still open');
  const second = toggleWeeklyCompletion({ week: first.week, year: first.year, tag: 'Donnerstag', idx: 2, subjects });
  assert.equal(second.year.deutsch.completed, true);
  const third = toggleWeeklyCompletion({ week: second.week, year: second.year, tag: 'Montag', idx: 0, subjects });
  assert.equal(third.year.deutsch.completed, false);
  assert.equal(third.week.Donnerstag[2].erledigt, true);
  assert.equal(third.week.Montag[0].erledigt, false);
});

test('Mehrfach-Jahresthemen: nur das eindeutig passende Item wird markiert; übrige Einträge bleiben unverändert', () => {
  const week = {
    Mittwoch: { 0: { fach: 'Mathematik', thema: 'Plusaufgaben' } },
    Donnerstag: { 1: { fach: 'Mathematik', thema: 'Geometrie' } },
  };
  const year = {
    mathematik: {
      thema: '', items: [
        { id: 'addition', thema: 'Plusaufgaben', completed: false, buch: 'TRAX S. 5' },
        { id: 'geometrie', thema: 'Geometrie', completed: false, buch: 'TRAX S. 12' },
      ], completed: false,
    },
  };
  const next = toggleWeeklyCompletion({ week, year, tag: 'Mittwoch', idx: 0, subjects });
  assert.equal(next.year.mathematik.items[0].completed, true);
  assert.equal(next.year.mathematik.items[0].buch, 'TRAX S. 5');
  assert.equal(next.year.mathematik.items[1], year.mathematik.items[1]);
  assert.equal(next.year.mathematik.completed, false);
  const done = toggleWeeklyCompletion({ week: next.week, year: next.year, tag: 'Donnerstag', idx: 1, subjects });
  assert.equal(done.year.mathematik.completed, true);
});

test('Mehrdeutige Jahresthemen desselben Fachs werden nie automatisch erraten', () => {
  const week = { Montag: { 0: { fach: 'Deutsch', thema: 'Lesen', erledigt: false } } };
  const year = { deutsch: {
    thema: '', items: [
      { thema: 'Lesen', subCategories: ['Deutsch (Lesen)'], completed: false },
      { thema: 'Lesen', subCategories: ['Deutsch (Rechtschreibung)'], completed: false },
    ], completed: false,
  } };
  const checked = toggleWeeklyCompletion({ week, year, tag: 'Montag', idx: 0, subjects });
  assert.equal(checked.week.Montag[0].erledigt, true);
  assert.equal(checked.year, year, 'ambiguous yearly entries remain unchanged');
  const inverse = toggleYearlyEntryCompletion({ week, year, subjectId: 'deutsch', itemIndex: 0, subjects });
  assert.equal(inverse.year.deutsch.items[0].completed, true);
  assert.equal(inverse.year.deutsch.items[1].completed, false);
  assert.equal(inverse.week, week, 'cannot guess which weekly lesson belongs to which duplicate');
});

test('Jahresplan-Item → Wochenplan: gleiche Titel in anderen Fächern und nicht passende Themen bleiben unverändert', () => {
  const week = {
    Montag: {
      0: { fach: 'Deutsch', thema: 'Wiederholung', erledigt: false, material: 'Buch' },
      1: { fach: 'Mathematik', thema: 'Wiederholung', erledigt: false },
      2: { fach: 'Deutsch', thema: 'Diktat', erledigt: false },
    },
  };
  const year = { deutsch: { thema: '', items: [{ id: 'a', thema: 'Wiederholung', completed: false }] } };
  const next = toggleYearlyEntryCompletion({ week, year, subjectId: 'deutsch', itemIndex: 0, subjects });
  assert.equal(next.week.Montag[0].erledigt, true);
  assert.equal(next.week.Montag[0].material, 'Buch');
  assert.equal(next.week.Montag[1], week.Montag[1]);
  assert.equal(next.week.Montag[2], week.Montag[2]);
  assert.equal(next.year.deutsch.items[0].completed, true);
  assert.equal(next.year.deutsch.completed, true);
  assert.deepEqual(week.Montag[0], { fach: 'Deutsch', thema: 'Wiederholung', erledigt: false, material: 'Buch' });
});

test('Direkter Jahresplan-Haken → Wochenplan: nur passendes Fach und gleiche Woche aktualisiert', () => {
  const week = {
    Mittwoch: {
      0: { fach: 'Deutsch', thema: 'Igel', erledigt: false },
      1: { fach: 'Sachunterricht', thema: 'Igel', erledigt: false, material: 'Foto' },
      2: { fach: 'Sachunterricht', thema: 'Wald', erledigt: false },
    },
    Donnerstag: { 1: { fach: 'Sachunterricht', thema: 'Igel', erledigt: false } },
  };
  const year = {
    sachunterricht: { thema: 'Igel', completed: false },
    deutsch: { thema: 'Igel', completed: false },
  };
  const result = toggleYearlyCellCompletion({ week, year, subjectId: 'sachunterricht', subjects });
  assert.equal(result.year.sachunterricht.completed, true);
  assert.equal(result.year.deutsch.completed, false);
  assert.equal(result.week.Mittwoch[0], week.Mittwoch[0]);
  assert.equal(result.week.Mittwoch[1].erledigt, true);
  assert.equal(result.week.Mittwoch[1].material, 'Foto');
  assert.equal(result.week.Donnerstag[1].erledigt, true);
  assert.equal(result.week.Mittwoch[2], week.Mittwoch[2]);
  const undone = toggleYearlyCellCompletion({ week: result.week, year: result.year, subjectId: 'sachunterricht', subjects });
  assert.equal(undone.week.Mittwoch[1].erledigt, false);
  assert.equal(undone.week.Donnerstag[1].erledigt, false);
});

test('Unbekannte Fächer landen nicht willkürlich in der Spalte Sonstiges', () => {
  const week = { Donnerstag: { 0: { fach: 'Religion', thema: 'Leben', erledigt: false } } };
  const year = { sonstiges: { thema: 'Leben', completed: false } };
  const result = toggleWeeklyCompletion({ week, year, tag: 'Donnerstag', idx: 0, subjects });
  assert.equal(result.week.Donnerstag[0].erledigt, true);
  assert.equal(result.year, year);
});

test('Wochenplan: Nicht vorhandene Slots oder andere Kalenderwochen erzeugen keine Phantomdaten', () => {
  const week = { Montag: { 0: { fach: 'Deutsch', thema: 'Nomen' } } };
  const year = { deutsch: { thema: 'Nomen', completed: false } };
  const result = toggleWeeklyCompletion({ week, year, tag: 'Montag', idx: 8, subjects });
  assert.equal(result.week, week);
  assert.equal(result.year, year);
  assert.equal(toggleWeeklyCompletion({ week, year, tag: 'Sonntag', idx: 0, subjects }).week, week);
});

test('Produktoberflächen nutzen denselben unveränderlichen Abschluss-Abgleich', () => {
  const weekly = readFileSync('src/components/WeeklyPlan.tsx', 'utf8');
  const yearly = readFileSync('src/components/YearlyPlan.tsx', 'utf8');
  assert.match(weekly, /toggleWeeklyCompletion\(\{/);
  assert.match(weekly, /toggleYearlyEntryCompletion\(\{/);
  assert.match(yearly, /toggleYearlyCellCompletion\(\{/);
  assert.doesNotMatch(weekly, /if \(it\.thema === item\.thema\)/);
  assert.doesNotMatch(weekly, /if \(slot && slot\.thema === itemThema\)/);
  assert.match(weekly, /sortYearlySubjects\(prev\.jahresplan_faecher \|\| DEFAULT_YEARLY_SUBJECTS\)/);
  assert.match(yearly, /sortYearlySubjects\(prev\.jahresplan_faecher \|\| DEFAULT_YEARLY_SUBJECTS\)/);
});

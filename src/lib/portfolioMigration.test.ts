import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeLegacyPortfolioEntries } from './portfolioMigration';

const student = (id: string) => ({
  id,
  vorname: id,
  nachname: 'Test',
  name: id,
  niveau: 3,
  notiz: '',
  geburtstag: '',
  staatsbuergerschaft: '',
  religion: '',
  besuchsjahr: '',
  espf: false,
  spf: false,
  geschlecht: '',
  portfolio: [],
}) as any;

test('legacy portfolio migration moves only active-class entries into students', () => {
  const result = mergeLegacyPortfolioEntries(
    [student('a')],
    {
      a: [{ id: 'p1', titel: 'Werkstück', fach: 'Technik & Design', datum: '2026-09-14', bewertung: 'Gut', beschreibung: 'Dokumentiert' }],
      b: [{ id: 'p2', titel: 'Andere Klasse', fach: 'Deutsch', datum: '2026-09-13' }],
    },
  );

  assert.equal(result.migratedCount, 1);
  assert.equal(result.students[0].portfolio[0].id, 'p1');
  assert.deepEqual(result.students[0].portfolio[0].tags, ['Technik & Design']);
  assert.equal(result.students[0].portfolio[0].bewertung, 'Gut');
  assert.equal(result.remaining.b[0].id, 'p2');
  assert.equal(result.remaining.a, undefined);
});

test('legacy portfolio migration does not duplicate existing ids', () => {
  const s = student('a');
  s.portfolio = [{ id: 'p1', titel: 'Schon da', datum: '2026-09-14' }];
  const result = mergeLegacyPortfolioEntries([s], {
    a: [{ id: 'p1', titel: 'Alt', fach: 'Deutsch', datum: '2026-09-14' }],
  });
  assert.equal(result.migratedCount, 0);
  assert.equal(result.students[0].portfolio.length, 1);
  assert.equal(result.students[0].portfolio[0].titel, 'Schon da');
});

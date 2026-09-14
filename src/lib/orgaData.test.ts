import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addManualCashTransaction,
  dateInputToLocalNoonIso,
  deleteManualCashTransaction,
  formatOrgaDate,
  getCollectionPaymentStatus,
  getLocalOrgaDateKey,
  normalizeKlassenkasse,
  markCollectionPaidForStudents,
  parseEuroInput,
  roundEuro,
  setCollectionPaymentAmount,
} from './orgaData';

function cashState(): any {
  return {
    kontostand: 0,
    sammlungen: [{
      id: 'trip',
      titel: 'Ausflug',
      betrag: 12.5,
      erstelltAm: '2026-09-14T10:00:00.000Z',
      status: { a: 'offen', b: 'teilweise' },
      betraege: { a: 0, b: 2.5 },
    }],
    transaktionen: [],
  };
}

test('currency parser rejects silent clamping and more than two decimals', () => {
  assert.deepEqual(parseEuroInput('12,50'), { valid: true, value: 12.5 });
  assert.deepEqual(parseEuroInput('0'), { valid: false, value: 0 });
  assert.equal(parseEuroInput('12.345').valid, false);
  assert.deepEqual(parseEuroInput('0', { allowZero: true }), { valid: true, value: 0 });
  assert.equal(parseEuroInput('13', { allowZero: true, max: 12.5 }).valid, false);
});

test('currency arithmetic is rounded to cents', () => {
  assert.equal(roundEuro(0.1 + 0.2), 0.3);
});

test('collection status follows the actual paid amount', () => {
  assert.equal(getCollectionPaymentStatus(0, 10), 'offen');
  assert.equal(getCollectionPaymentStatus(5, 10), 'teilweise');
  assert.equal(getCollectionPaymentStatus(10, 10), 'bezahlt');
});

test('partial collection payment updates balance, status and journal consistently', () => {
  const next = setCollectionPaymentAmount(cashState(), {
    sammlungId: 'trip',
    studentId: 'b',
    paidAmount: 7.5,
    studentLabel: 'Ben B',
    timestamp: '2026-09-14T12:00:00.000Z',
  });

  assert.equal(next.kontostand, 5);
  assert.equal(next.sammlungen[0].betraege.b, 7.5);
  assert.equal(next.sammlungen[0].status.b, 'teilweise');
  assert.equal(next.transaktionen[0].betrag, 5);
  assert.equal(next.transaktionen[0].typ, 'plus');
  assert.equal(next.transaktionen[0].titel, 'Ben B – Ausflug');
});

test('collection payment never accepts an overpayment', () => {
  const before = cashState();
  const next = setCollectionPaymentAmount(before, {
    sammlungId: 'trip',
    studentId: 'a',
    paidAmount: 20,
    studentLabel: 'Anna A',
  });
  assert.deepEqual(next, before);
});

test('mark all paid only books each missing difference', () => {
  const next = markCollectionPaidForStudents(
    cashState(),
    'trip',
    [{ id: 'a', label: 'Anna A' }, { id: 'b', label: 'Ben B' }],
    '2026-09-14T12:00:00.000Z'
  );

  assert.equal(next.kontostand, 22.5);
  assert.equal(next.sammlungen[0].betraege.a, 12.5);
  assert.equal(next.sammlungen[0].betraege.b, 12.5);
  assert.equal(next.transaktionen.length, 2);
  assert.deepEqual(next.transaktionen.map((tx: any) => tx.betrag).sort((a: number,b: number)=>a-b), [10, 12.5]);
});

test('manual transaction deletion cannot remove collection-generated journal entries', () => {
  const manual: any = {
    id: 'manual',
    datum: '2026-09-14T12:00:00.000Z',
    titel: 'Material',
    betrag: 3.2,
    typ: 'minus',
    kategorie: 'ausgabe',
  };
  const collection: any = {
    id: 'collection',
    datum: '2026-09-14T12:00:00.000Z',
    titel: 'Anna – Ausflug',
    betrag: 12.5,
    typ: 'plus',
    kategorie: 'sammlung',
    geldsammlungId: 'trip',
    schuelerId: 'a',
  };
  let state: any = { kontostand: 0, sammlungen: [], transaktionen: [collection] };
  state = addManualCashTransaction(state, manual);
  assert.equal(state.kontostand, -3.2);

  const blocked = deleteManualCashTransaction(state, 'collection');
  assert.deepEqual(blocked, state);

  const deleted = deleteManualCashTransaction(state, 'manual');
  assert.equal(deleted.kontostand, 0);
  assert.deepEqual(deleted.transaktionen.map((tx: any) => tx.id), ['collection']);
});

test('date-only form values are stored without UTC day drift', () => {
  const iso = dateInputToLocalNoonIso('2026-09-14');
  assert.ok(iso);
  const expected = new Date(2026, 8, 14, 12).toLocaleDateString('de-AT');
  assert.equal(formatOrgaDate('2026-09-14'), expected);
  assert.equal(formatOrgaDate(iso), expected);
  assert.equal(dateInputToLocalNoonIso('2026-02-31'), undefined);
});


test('legacy class cash is normalized into a collection', () => {
  const normalized = normalizeKlassenkasse({
    beitrag_pro_kind: 9.5,
    kontostand: 19,
    zahlungen: { a: true, b: false },
    transaktionen: [],
  });

  assert.equal(normalized.kontostand, 19);
  assert.equal(normalized.sammlungen.length, 1);
  assert.equal(normalized.sammlungen[0].betrag, 9.5);
  assert.equal(normalized.sammlungen[0].status.a, 'bezahlt');
  assert.equal(normalized.sammlungen[0].status.b, 'offen');
  assert.equal(normalized.sammlungen[0].betraege.a, 9.5);
  assert.equal(normalized.sammlungen[0].betraege.b, 0);
});

test('local organization date key uses local calendar fields', () => {
  assert.equal(getLocalOrgaDateKey(new Date(2026, 8, 14, 23, 30)), '2026-09-14');
});

import type { Geldsammlung, KassenTransaktion } from '../types';

export type KlassenkasseState = {
  kontostand: number;
  sammlungen: Geldsammlung[];
  transaktionen: KassenTransaktion[];
};

export function normalizeKlassenkasse(raw: any): KlassenkasseState {
  if (!raw || typeof raw !== 'object') {
    return { kontostand: 0, sammlungen: [], transaktionen: [] };
  }

  if (raw.beitrag_pro_kind !== undefined) {
    const target = roundEuro(Number(raw.beitrag_pro_kind) || 0);
    const status: Geldsammlung['status'] = {};
    const betraege: Geldsammlung['betraege'] = {};

    for (const [studentId, paid] of Object.entries(raw.zahlungen || {})) {
      status[studentId] = paid ? 'bezahlt' : 'offen';
      betraege[studentId] = paid ? target : 0;
    }

    return {
      kontostand: roundEuro(Number(raw.kontostand) || 0),
      sammlungen: target > 0 ? [{
        id: 'basis-migration',
        titel: 'Basisbeitrag',
        betrag: target,
        erstelltAm: raw.erstelltAm || new Date(0).toISOString(),
        abgeschlossen: false,
        status,
        betraege,
      }] : [],
      transaktionen: Array.isArray(raw.transaktionen) ? raw.transaktionen : [],
    };
  }

  return {
    kontostand: roundEuro(Number(raw.kontostand) || 0),
    sammlungen: Array.isArray(raw.sammlungen) ? raw.sammlungen : [],
    transaktionen: Array.isArray(raw.transaktionen) ? raw.transaktionen : [],
  };
}

export function roundEuro(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function parseEuroInput(
  input: string,
  options: { allowZero?: boolean; max?: number } = {}
): { valid: boolean; value: number } {
  const normalized = String(input ?? '').trim().replace(',', '.');
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return { valid: false, value: 0 };
  }
  const value = roundEuro(Number(normalized));
  if (!Number.isFinite(value)) return { valid: false, value: 0 };
  if (options.allowZero ? value < 0 : value <= 0) return { valid: false, value: 0 };
  if (options.max !== undefined && value > roundEuro(options.max)) {
    return { valid: false, value };
  }
  return { valid: true, value };
}

export function getCollectionPaymentStatus(
  paidAmount: number,
  targetAmount: number
): 'offen' | 'teilweise' | 'bezahlt' {
  const paid = roundEuro(Math.max(0, paidAmount));
  const target = roundEuro(Math.max(0, targetAmount));
  if (paid <= 0) return 'offen';
  if (paid >= target) return 'bezahlt';
  return 'teilweise';
}

export function setCollectionPaymentAmount(
  kasse: KlassenkasseState,
  params: {
    sammlungId: string;
    studentId: string;
    paidAmount: number;
    studentLabel: string;
    timestamp?: string;
  }
): KlassenkasseState {
  const collection = kasse.sammlungen.find(item => item.id === params.sammlungId);
  if (!collection) return kasse;

  const target = roundEuro(collection.betrag);
  const requested = roundEuro(params.paidAmount);
  if (requested < 0 || requested > target) return kasse;

  const oldPaid = roundEuro(collection.betraege?.[params.studentId] || 0);
  const diff = roundEuro(requested - oldPaid);
  if (diff === 0) return kasse;

  const sammlungen = kasse.sammlungen.map(item => {
    if (item.id !== params.sammlungId) return item;
    return {
      ...item,
      betraege: {
        ...(item.betraege || {}),
        [params.studentId]: requested,
      },
      status: {
        ...(item.status || {}),
        [params.studentId]: getCollectionPaymentStatus(requested, target),
      },
    };
  });

  const transaction: KassenTransaktion = {
    id: crypto.randomUUID(),
    datum: params.timestamp || new Date().toISOString(),
    titel: `${params.studentLabel} – ${collection.titel}`,
    betrag: Math.abs(diff),
    typ: diff > 0 ? 'plus' : 'minus',
    kategorie: 'sammlung',
    geldsammlungId: params.sammlungId,
    schuelerId: params.studentId,
  };

  return {
    ...kasse,
    kontostand: roundEuro(kasse.kontostand + diff),
    sammlungen,
    transaktionen: [transaction, ...(kasse.transaktionen || [])],
  };
}

export function markCollectionPaidForStudents(
  kasse: KlassenkasseState,
  sammlungId: string,
  students: Array<{ id: string; label: string }>,
  timestamp?: string
): KlassenkasseState {
  let next = kasse;
  const collection = kasse.sammlungen.find(item => item.id === sammlungId);
  if (!collection) return kasse;

  for (const student of students) {
    next = setCollectionPaymentAmount(next, {
      sammlungId,
      studentId: student.id,
      paidAmount: collection.betrag,
      studentLabel: student.label,
      timestamp,
    });
  }
  return next;
}

export function addManualCashTransaction(
  kasse: KlassenkasseState,
  transaction: KassenTransaktion
): KlassenkasseState {
  const signed = transaction.typ === 'plus' ? transaction.betrag : -transaction.betrag;
  return {
    ...kasse,
    kontostand: roundEuro(kasse.kontostand + signed),
    transaktionen: [transaction, ...(kasse.transaktionen || [])],
  };
}

export function deleteManualCashTransaction(
  kasse: KlassenkasseState,
  transactionId: string
): KlassenkasseState {
  const transaction = (kasse.transaktionen || []).find(item => item.id === transactionId);
  if (!transaction || transaction.geldsammlungId || transaction.kategorie === 'sammlung') {
    return kasse;
  }

  const reversal = transaction.typ === 'plus' ? -transaction.betrag : transaction.betrag;
  return {
    ...kasse,
    kontostand: roundEuro(kasse.kontostand + reversal),
    transaktionen: kasse.transaktionen.filter(item => item.id !== transactionId),
  };
}

export function getLocalOrgaDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateInputToLocalNoonIso(dateKey: string): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey || '');
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) return undefined;
  return date.toISOString();
}

export function formatOrgaDate(value?: string): string {
  if (!value) return '';
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('de-AT');
}

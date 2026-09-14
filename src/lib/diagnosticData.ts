import { AppState, DiagnostikErhebung, DiagnostikTest } from '../types';
import { formatLocalDateKey } from './utils';

export type DiagnosticValidation = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

const INTERNAL_TEST_NAMES: Record<string, string> = {
  exekutiv_1: 'Beobachtung exekutiver Funktionen',
  ipsativ: 'Individueller Lernverlauf'
};

export const getDiagnosticClassId = (app: Pick<AppState, 'activeClassId' | 'schuljahr' | 'klassenbezeichnung'>) =>
  app.activeClassId || `${app.schuljahr || 'ohne-schuljahr'}:${app.klassenbezeichnung || 'ohne-klasse'}`;

export const isDiagnosticAlert = (entry: DiagnostikErhebung) =>
  entry.auffaelligkeitErkannt ?? entry.foerderbedarfErkannt;

export const getDiagnosticTestName = (testId: string, tests: DiagnostikTest[]) => {
  const catalogName = tests.find(test => test.id === testId)?.name;
  if (catalogName) return catalogName;
  if (testId.startsWith('ipsativ')) return INTERNAL_TEST_NAMES.ipsativ;
  return INTERNAL_TEST_NAMES[testId] || (testId.startsWith('live-') ? '1:1 Lernstandsbeobachtung' : 'Nicht zugeordnetes Verfahren');
};

export const getDiagnosticAlert = (test: DiagnostikTest, value: number) =>
  test.schwellenrichtung === 'unter' ? value < test.schwellenwert : value > test.schwellenwert;

export const getDiagnosticUnitGuidance = (test: DiagnostikTest) => {
  switch (test.einheit) {
    case 'prozentrang':
      return 'Prozentrang 0–100 aus der normierten Auswertung übernehmen.';
    case 'stanine':
      return 'Stanine-Wert 1–9 aus der normierten Auswertung übernehmen.';
    case 'tWert':
      return 'T-Wert exakt aus der alters- bzw. schulstufenbezogenen Normtabelle übernehmen.';
    case 'rohwert':
      return 'Den direkt beobachteten oder ausgezählten Rohwert eintragen.';
    case 'punkte':
      return 'Erreichte Punkte gemäß Aufgabenanzahl und Auswertungsschlüssel eintragen.';
  }
};

const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const parsed = new Date(`${value}T12:00:00`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const isDiagnosticDateInFuture = (value: string, now = new Date()) =>
  value > formatLocalDateKey(now);

export function validateDiagnosticEntry(
  app: Pick<AppState, 'schueler' | 'diagnostikTests' | 'activeClassId' | 'schuljahr' | 'klassenbezeichnung'>,
  entry: DiagnostikErhebung
): DiagnosticValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const test = (app.diagnostikTests || []).find(item => item.id === entry.testId);
  const isStructuredObservation = entry.type === 'exekutiv' || entry.type === 'ipsativ';

  if (!(app.schueler || []).some(student => student.id === entry.schuelerId)) {
    errors.push('Kind ist der aktuellen Klasse nicht zugeordnet.');
  }
  if (!entry.testId) errors.push('Verfahren fehlt.');
  if (!test && !isStructuredObservation && !entry.testId.startsWith('live-')) {
    errors.push('Verfahren ist nicht mehr im Diagnostik-Katalog vorhanden.');
  }
  if (!validDate(entry.datum)) errors.push('Datum ist ungültig.');
  if (validDate(entry.datum) && isDiagnosticDateInFuture(entry.datum)) {
    errors.push('Datum darf nicht in der Zukunft liegen.');
  }
  if (!entry.schuljahr) errors.push('Schuljahr fehlt.');
  if (!Number.isFinite(entry.schulstufe) || entry.schulstufe < 0) errors.push('Schulstufe ist ungültig.');
  if (!entry.durchgefuehrtVon?.trim()) errors.push('Durchführung fehlt.');

  if (!isStructuredObservation) {
    if (!Number.isFinite(entry.ergebniswert)) {
      errors.push('Auswertungswert fehlt oder ist ungültig.');
    } else if (entry.ergebniswert < 0) {
      errors.push('Auswertungswert darf nicht negativ sein.');
    } else if (test?.einheit === 'prozentrang' && entry.ergebniswert > 100) {
      errors.push('Prozentrang muss zwischen 0 und 100 liegen.');
    } else if (test?.einheit === 'stanine' && (entry.ergebniswert < 1 || entry.ergebniswert > 9)) {
      errors.push('Stanine muss zwischen 1 und 9 liegen.');
    }
  }

  if (test && !test.schulstufen.includes(entry.schulstufe)) {
    warnings.push(`Das Verfahren ist im Katalog nicht für die ${entry.schulstufe}. Schulstufe vorgesehen.`);
  }
  if (!entry.classId) warnings.push('Altdaten: Klassenzuordnung wurde aus der aktuellen Klasse abgeleitet.');
  if (entry.classId && entry.classId !== getDiagnosticClassId(app as AppState)) {
    warnings.push('Erhebung stammt aus einer anderen Klasse oder einem früheren Klassenstand.');
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function getValidStudentDiagnostics(app: AppState, studentId: string) {
  return (app.diagnostikErhebungen || [])
    .filter(entry => entry.schuelerId === studentId && validateDiagnosticEntry(app, entry).valid)
    .sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
}

export function getDiagnosticDataQuality(app: AppState) {
  const entries = app.diagnostikErhebungen || [];
  const results = entries.map(entry => validateDiagnosticEntry(app, entry));
  return {
    total: entries.length,
    valid: results.filter(result => result.valid).length,
    invalid: results.filter(result => !result.valid).length,
    warnings: results.filter(result => result.valid && result.warnings.length > 0).length
  };
}

export function upsertByKey<T>(existing: T[], incoming: T[], key: (item: T) => string): T[] {
  const replacements = new Map(incoming.map(item => [key(item), item]));
  const untouched = existing.filter(item => !replacements.has(key(item)));
  return [...untouched, ...incoming];
}

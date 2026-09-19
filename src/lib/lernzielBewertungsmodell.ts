/** Configurable, class-local assessment labels for learning goals.
 * Existing values 1/2/3 are stable: importing a model must never convert
 * them into a school grade or silently overwrite historical assessments.
 */
export type LernzielAnsicht = 'blume' | 'sterne' | 'balken' | 'ring' | 'tabelle';
export interface LernzielStufe {
  value: number;
  label: string;
  kurz: string;
  color: string;
  symbol: string;
}
export interface LernzielBewertungsmodell {
  version: 1;
  name: string;
  emptyLabel: string;
  levels: LernzielStufe[]; // Ordered from developing to accomplished, not school marks
  views: { kind: LernzielAnsicht; parents: LernzielAnsicht; teachers: LernzielAnsicht };
}
export type LernzielWertungen = Record<string, number | null | undefined>;

export const STANDARD_LERNZIEL_MODELL: LernzielBewertungsmodell = {
  version: 1,
  name: 'Lernziele – Standard',
  emptyLabel: 'Noch nicht eingeschätzt',
  levels: [
    { value: 3, label: 'In Entwicklung', kurz: 'Entwicklung', color: '#d97706', symbol: '🌱' },
    { value: 2, label: 'Im Wesentlichen', kurz: 'Wesentlich', color: '#4d7c0f', symbol: '🌿' },
    { value: 1, label: 'Erreicht', kurz: 'Erreicht', color: '#047857', symbol: '🌸' },
  ],
  views: { kind: 'blume', parents: 'ring', teachers: 'balken' },
};
export const LERNZIEL_ANSICHTEN: { id: LernzielAnsicht; label: string }[] = [
  { id: 'blume', label: 'Blume' }, { id: 'sterne', label: 'Sterne' },
  { id: 'balken', label: 'Balkendiagramm' }, { id: 'ring', label: 'Kreisdiagramm' },
  { id: 'tabelle', label: 'Tabelle' },
];
const colorPattern = /^#[0-9a-f]{6}$/i;
const allowedViews = new Set(LERNZIEL_ANSICHTEN.map(view => view.id));
const safeText = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

/** Strict import validator. A malformed school template is rejected, not applied. */
export function parseLernzielModell(input: unknown): LernzielBewertungsmodell {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Ungültige Bewertungsvorlage.');
  const obj = input as Record<string, any>;
  if (obj.version !== 1 || !Array.isArray(obj.levels) || obj.levels.length < 2 || obj.levels.length > 10) {
    throw new Error('Eine Vorlage braucht 2 bis 10 Beurteilungsstufen.');
  }
  const name = safeText(obj.name, 80), emptyLabel = safeText(obj.emptyLabel, 50);
  if (!name || !emptyLabel) throw new Error('Vorlagenname und Bezeichnung für nicht eingeschätzte Lernziele fehlen.');
  const ids = new Set<number>();
  const levels = obj.levels.map((raw: unknown) => {
    if (!raw || typeof raw !== 'object') throw new Error('Eine Beurteilungsstufe ist ungültig.');
    const entry = raw as Record<string, unknown>;
    const value = entry.value;
    const label = safeText(entry.label, 55), kurz = safeText(entry.kurz, 25);
    const color = safeText(entry.color, 7), symbol = safeText(entry.symbol, 8);
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 999 ||
        ids.has(value) || !label || !kurz || !colorPattern.test(color)) {
      throw new Error('Jede Stufe benötigt eindeutige ID, Namen, Kurzform und gültige Farbe.');
    }
    ids.add(value);
    return { value, label, kurz, color, symbol };
  });
  const views = obj.views as Record<string, unknown> | undefined;
  const kind = views?.kind, parents = views?.parents, teachers = views?.teachers;
  if (!allowedViews.has(kind as LernzielAnsicht) || !allowedViews.has(parents as LernzielAnsicht) || !allowedViews.has(teachers as LernzielAnsicht)) {
    throw new Error('Unbekannte Diagramm-Darstellung.');
  }
  return { version: 1, name, emptyLabel, levels, views: { kind: kind as LernzielAnsicht, parents: parents as LernzielAnsicht, teachers: teachers as LernzielAnsicht } };
}

export function getLernzielModell(stored: unknown): LernzielBewertungsmodell {
  try { return parseLernzielModell(stored); }
  catch { return STANDARD_LERNZIEL_MODELL; }
}

export function verwendeteLernzielStufen(
  ratings: Record<string, Partial<Record<'1' | '2', LernzielWertungen>>> | undefined,
  legacyRatings: Record<string, LernzielWertungen> | undefined,
): Set<number> {
  const used = new Set<number>();
  for (const [studentId, semesters] of Object.entries(ratings || {})) {
    const all = Object.values(semesters || {}).flatMap(values => Object.values(values || {}));
    // Legacy 1st semester is mirrored in the semester ratings when available.
    if (!semesters?.['1']) all.push(...Object.values(legacyRatings?.[studentId] || {}));
    all.forEach(value => { if (typeof value === 'number' && Number.isInteger(value)) used.add(value); });
  }
  for (const [studentId, values] of Object.entries(legacyRatings || {})) {
    if (ratings?.[studentId]?.['1']) continue;
    Object.values(values || {}).forEach(value => { if (typeof value === 'number' && Number.isInteger(value)) used.add(value); });
  }
  return used;
}

export function pruefeModellWechsel(
  previous: LernzielBewertungsmodell,
  next: LernzielBewertungsmodell,
  used: ReadonlySet<number>,
): void {
  const retained = new Set(next.levels.map(level => level.value));
  const removedInUse = previous.levels.filter(level => used.has(level.value) && !retained.has(level.value));
  if (removedInUse.length) {
    throw new Error('Stufe mit bestehenden Einschätzungen kann nicht entfernt werden: ' +
      removedInUse.map(level => level.label).join(', ') +
      '. Bitte zuerst die betroffenen Einschätzungen bewusst neu zuordnen.');
  }
  // Protect unknown values in legacy files as well.
  const unknownInUse = [...used].filter(value => !retained.has(value));
  if (unknownInUse.length) throw new Error('Vorhandene alte Einschätzungen ohne Stufe: ' + unknownInUse.join(', ') + '. Bitte nicht überschreiben.');
}

export function lernzielHaeufigkeiten(
  goalIds: string[],
  ratings: LernzielWertungen | undefined,
  model: LernzielBewertungsmodell,
) {
  const counts = model.levels.map(level => ({ ...level, count: 0 }));
  let unassessed = 0, other = 0;
  for (const goalId of new Set(goalIds)) {
    const value = ratings?.[goalId];
    if (value === null || value === undefined) { unassessed++; continue; }
    const target = counts.find(level => level.value === value);
    if (target) target.count++;
    else other++; // Preserve unmatched old values in the UI; never misreport as another level.
  }
  return { counts, unassessed, other, assessed: counts.reduce((sum, item) => sum + item.count, 0) + other, total: new Set(goalIds).size };
}

import { formatLocalDateKey, getKW } from './utils';

/** Derived only from the active class. Never store a separate copy of pupil data. */
export type PickupLesson = {
  fach: string;
  thema: string;
  material: string;
  hausuebung: string;
  erledigt: boolean;
  quelle: 'unterricht' | 'kinderplan';
};
export type PickupDay = { datum: string; tag: string; eintraege: PickupLesson[] };
export type MaterialPickupSheet = {
  fehltage: string[];
  tage: PickupDay[];
  offeneEintraege: number;
  gekuerzt: boolean;
};
type WeeklyLesson = {
  fach?: string; thema?: string; material?: string; wochenplanMaterial?: string;
  housework?: string; erledigt?: boolean; materialIds?: string[];
};
type PickupSource = {
  anwesenheit?: Record<string, Record<string, Record<string, string>>>;
  wochenplanung?: Record<number, Record<string, Record<string, WeeklyLesson>>>;
  schuelerWochenplaene?: Record<string, {
    kw: number; schuljahr?: string; datumVon?: string; datumBis?: string;
    aufgaben?: Array<{
      fach?: string; tag?: string; titel?: string; detail?: string; stunde?: number;
      originalMaterial?: string; originalHousework?: string; selected?: boolean;
    }>;
  }>;
  schuljahr?: string;
  materialien?: Array<{ id: string; titel: string }>;
};

const TAG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
// Anwesenheit uses 'e' (entschuldigt) and 'u' (unentschuldigt) for absence.
// Other status codes must never be treated as a missed school day.
const FEHLT = new Set(['e', 'u']);
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const localDate = (key: string) => new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)), 12);

export function isRecordedAbsence(day: Record<string, string> | undefined): boolean {
  return Object.values(day || {}).some(status => FEHLT.has(status));
}

export function pupilAbsentDates(
  attendance: PickupSource['anwesenheit'],
  pupilId: string,
  from: string,
  to: string,
): string[] {
  if (!pupilId || !ISO.test(from) || !ISO.test(to) || from > to) return [];
  return Object.entries(attendance?.[pupilId] || {})
    .filter(([date, day]) =>
      ISO.test(date) && date >= from && date <= to &&
      formatLocalDateKey(localDate(date)) === date &&
      isRecordedAbsence(day))
    .map(([date]) => date)
    .sort();
}

/** Preselect the latest recorded run; weekends without attendance entries do not split it. */
export function latestAbsenceRange(attendance: PickupSource['anwesenheit'], pupilId: string, today: string) {
  const dates = pupilAbsentDates(attendance, pupilId, '2000-01-01', today);
  if (!dates.length) return null;
  const last = dates[dates.length - 1];
  let start = last;
  for (let i = dates.length - 2; i >= 0; i--) {
    const previous = localDate(dates[i]);
    const next = localDate(start);
    previous.setDate(previous.getDate() + 1);
    while (previous.getDay() === 0 || previous.getDay() === 6) previous.setDate(previous.getDate() + 1);
    if (formatLocalDateKey(previous) !== formatLocalDateKey(next)) break;
    start = dates[i];
  }
  return { from: start, to: last };
}

/**
 * Builds a parent-safe projection of selected missed hours, never health notes,
 * behaviour, dossier observations, other children, or automatically invented pages.
 */
export function buildMaterialPickupSheet(
  source: PickupSource, pupilId: string, from: string, to: string,
  options: { onlyDone?: boolean; maxLessons?: number } = {},
): MaterialPickupSheet {
  const fehltage = pupilAbsentDates(source.anwesenheit, pupilId, from, to);
  const maxLessons = Math.max(1, Math.min(100, options.maxLessons ?? 100));
  let offen = 0;
  let count = 0;
  const tage = fehltage.map(datum => {
    const date = localDate(datum);
    const tag = TAG[date.getDay()];
    const kw = getKW(date);
    const hours = source.anwesenheit?.[pupilId]?.[datum] || {};
    const hasHourKeys = Object.keys(hours).some(key => /^\d+$/.test(key));
    const eintraege: PickupLesson[] = [];
    const add = (entry: PickupLesson) => {
      if (!entry.thema && !entry.material && !entry.hausuebung) return;
      if (options.onlyDone && !entry.erledigt) return;
      if (!entry.erledigt) offen++;
      if (count++ < maxLessons) eintraege.push(entry);
    };
    Object.entries(source.wochenplanung?.[kw]?.[tag] || {})
      .filter(([index]) => /^\d+$/.test(index))
      .sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([index, lesson]) => {
        // Partial-day absences must not leak lessons from hours where the child attended.
        if (hasHourKeys && !FEHLT.has(hours[String(Number(index) + 1)])) return;
        add({
          fach: text(lesson.fach),
          thema: text(lesson.thema),
          material: [text(lesson.wochenplanMaterial || lesson.material), ...((lesson.materialIds || [])
            .map(id => source.materialien?.find(item => item.id === id)?.titel || '').filter(Boolean))]
            .filter(Boolean).join(' · '),
          hausuebung: text(lesson.housework),
          erledigt: lesson.erledigt === true,
          quelle: 'unterricht',
        });
      });

    // Saved children's tasks can contain separate workbook/page details, not merely a copy
    // of the teacher's weekly lesson. Include selected tasks only and avoid duplicate titles.
    Object.values(source.schuelerWochenplaene || {})
      .filter(plan => plan.kw === kw && (!plan.schuljahr || plan.schuljahr === source.schuljahr)
        && (!plan.datumVon || datum >= plan.datumVon)
        && (!plan.datumBis || datum <= plan.datumBis))
      .forEach(plan => (plan.aufgaben || []).filter(task => task.selected && task.tag === tag
        && (!hasHourKeys || !task.stunde || FEHLT.has(hours[String(task.stunde)])))
        .forEach(task => {
          const titel = text(task.titel);
          if (!titel || eintraege.some(row => row.fach === text(task.fach) && row.thema === titel)) return;
          add({
            fach: text(task.fach),
            thema: titel,
            material: text(task.detail || task.originalMaterial),
            hausuebung: text(task.originalHousework),
            erledigt: false,
            quelle: 'kinderplan',
          });
        }));
    return { datum, tag, eintraege };
  });
  return { fehltage, tage, offeneEintraege: offen, gekuerzt: count > maxLessons };
}

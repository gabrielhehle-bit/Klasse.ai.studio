import {
  classifyKlassenbuchEntry,
  getKlassenbuchBaseCategories,
  orderKlassenbuchCategoryKeys,
} from './klassenbuchSubjects';

/** Render the existing weekly lesson data without editing/migrating persisted lessons. */
type Lesson = Record<string, any>;
type DayPlan = Record<string, any>;
export type WeeklyPlanForClassbook = Record<string, DayPlan>;
export type ClassbookProjectionOptions = {
  activeSubjects?: string[];
  stammplan?: Record<string, Record<number, string>>;
  includeReflection?: boolean;
  includeEvents?: boolean;
};
const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
const text = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

function formattedLesson(
  lesson: Lesson,
  day: string,
  hour: number,
  part?: '1. Hälfte' | '2. Hälfte',
  parent?: Lesson,
  includeReflection = true,
): string {
  const common = parent || lesson;
  const content: string[] = [];
  const add = (label: string, value: unknown) => {
    const valueText = text(value);
    if (valueText) content.push(`${label}: ${valueText}`);
  };
  // The hour and optional half are part of each entry: two identical lessons
  // on different days/hours must not collapse into one.
  const slotLabel = `${day}, ${hour}. Stunde${part ? ` · ${part}` : ''}`;
  add('Unterricht', lesson.thema);
  // These fields are present in the legacy, imported and current editors.
  add('Lernziel', lesson.lernziel || common.lernziel);
  add('Beschreibung', lesson.beschreibung || common.beschreibung);
  add('Material', lesson.material || common.material);
  add('Hausübung', lesson.housework || lesson.hue || common.housework || common.hue);
  add('Methode', lesson.method || common.method);
  const social = text(lesson.social || common.social);
  if (social && social !== 'single') add('Sozialform', social);
  add('Notiz', lesson.notiz || lesson.notizen || common.notiz || common.notizen);
  if (includeReflection) add('Reflexion', lesson.reflexion || common.reflexion);
  const ids = Array.isArray(lesson.materialIds) ? lesson.materialIds
    : Array.isArray(common.materialIds) ? common.materialIds : [];
  if (ids.length && !text(lesson.material || common.material)) {
    content.push(`Verknüpfte Materialien: ${ids.length}`);
  }
  if (!content.length) content.push('Kein Unterrichtsinhalt eingetragen');
  return `${slotLabel} · ${content.join(' · ')}`;
}

/**
 * Single projection shared by the in-app classbook and print-center PDF/DOCX.
 * Copies information into view strings only; no classbook state is persisted,
 * and no lesson field or independent classbook note is overwritten.
 */
export function projectWeeklyPlanToClassbook(
  week: WeeklyPlanForClassbook | undefined,
  options: ClassbookProjectionOptions = {},
): Record<string, string[]> {
  const data: Record<string, string[]> = Object.fromEntries(
    getKlassenbuchBaseCategories(options.activeSubjects).map(category => [category.key, []]),
  );
  data['Besondere Vorkommnisse'] = [];
  if (!week) return data;
  const ensure = (key: string) => data[key] ?? (data[key] = []);
  const addLesson = (lesson: Lesson, day: string, hour: number, part?: '1. Hälfte' | '2. Hälfte', parent?: Lesson) => {
    const subject = text(lesson.fach) || text(parent?.fach)
      || text(options.stammplan?.[day]?.[hour]) || '';
    const focuses = lesson.unterbereich
      ? [lesson.unterbereich]
      : (Array.isArray(lesson.schwerpunkte) && lesson.schwerpunkte.length
        ? lesson.schwerpunkte
        : Array.isArray(parent?.schwerpunkte) ? parent.schwerpunkte : []);
    // Every typed free-text field is preserved, even if no subject was selected.
    const summary = formattedLesson(lesson, day, hour, part, parent, options.includeReflection !== false);
    const hasContent = [lesson.thema, lesson.lernziel, lesson.beschreibung,
      lesson.material, lesson.housework, lesson.hue, lesson.method, lesson.notiz,
      lesson.notizen, lesson.reflexion, parent?.thema, parent?.material, parent?.housework].some(v => text(v))
      || (Array.isArray(lesson.materialIds) && lesson.materialIds.length > 0);
    if (!subject && !hasContent) return;
    const matched = classifyKlassenbuchEntry(subject, focuses);
    if (!matched.length) {
      ensure('Besondere Vorkommnisse').push(`${subject ? `${subject} · ` : ''}${summary}`);
    } else {
      matched.forEach(category => ensure(category.key).push(summary));
    }
  };
  for (const day of WEEKDAYS) {
    const dayPlan = week[day] || {};
    for (const [index, raw] of Object.entries(dayPlan)) {
      if (!/^(0|[1-9]\d*)$/.test(index)) continue;
      const lesson = raw as Lesson | null;
      if (!lesson || typeof lesson !== 'object') continue;
      const hour = Number(index) + 1;
      if (lesson.halves?.enabled) {
        addLesson(lesson.halves.first || {}, day, hour, '1. Hälfte', lesson);
        addLesson(lesson.halves.second || {}, day, hour, '2. Hälfte', lesson);
      } else {
        addLesson(lesson, day, hour);
      }
    }
    if (options.includeEvents !== false) {
      const events = Array.isArray(dayPlan.zeitunabhaengig) ? dayPlan.zeitunabhaengig : [];
      events.forEach(event => {
        const value = text(event?.thema) || text(event?.text);
        if (value) ensure('Besondere Vorkommnisse').push(`${day} · Termin: ${value}`);
      });
    }
  }
  const ordered: Record<string, string[]> = {};
  orderKlassenbuchCategoryKeys(Object.keys(data).filter(key => key !== 'Besondere Vorkommnisse'), options.activeSubjects)
    .forEach(key => { ordered[key] = data[key]; });
  ordered['Besondere Vorkommnisse'] = data['Besondere Vorkommnisse'];
  return ordered;
}

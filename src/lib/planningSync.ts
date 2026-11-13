import { DEFAULT_YEARLY_SUBJECTS, MAX_LESSON_SLOTS, TAGE_NAMEN } from '../constants';
import { resolveJahresplanSubjectId } from './yearPlanSubjects';
import { yearPlanCellEntries, yearPlanEntriesToCell, type YearPlanCell, type YearPlanEntry } from './yearlyPlanData';

export type WeeklyLessonForYearPlan = {
  fach?: string;
  thema?: string;
  type?: string;
  material?: string;
  schwerpunkte?: string[];
  erledigt?: boolean;
};

export type WeeklyToYearPlanResult = {
  plan: Record<number, Record<string, YearPlanCell>>;
  status: 'added' | 'occupied' | 'missing-topic' | 'missing-subject';
  subjectId?: string;
};

export function hasWeeklyPlanningDetails(lesson: any): boolean {
  if (!lesson || typeof lesson !== 'object') return false;
  return Boolean(
    String(lesson.thema || '').trim() ||
    String(lesson.material || '').trim() ||
    String(lesson.housework || '').trim() ||
    String(lesson.method || '').trim() ||
    String(lesson.reflexion || '').trim() ||
    (Array.isArray(lesson.materialIds) && lesson.materialIds.length > 0) ||
    lesson.halves?.enabled === true ||
    (lesson.type && lesson.type !== 'standard')
  );
}

export function isYearPlanCellFree(cell: YearPlanCell | undefined | null): boolean {
  if (!cell) return true;
  if (yearPlanCellEntries(cell).length > 0) return false;
  if (cell.type && cell.type !== 'standard') return false;
  return true;
}

export function addWeeklyLessonToEmptyYearPlan(input: {
  existingPlan: Record<number, Record<string, YearPlanCell>> | undefined;
  kw: number;
  lesson: WeeklyLessonForYearPlan;
  fallbackSubject?: string;
  availableSubjects?: { id: string; label: string }[];
}): WeeklyToYearPlanResult {
  const thema = String(input.lesson?.thema || '').trim();
  if (!thema) {
    return { plan: input.existingPlan || {}, status: 'missing-topic' };
  }

  const fach = String(input.lesson?.fach || input.fallbackSubject || '').trim();
  const subjects = input.availableSubjects?.length
    ? input.availableSubjects
    : DEFAULT_YEARLY_SUBJECTS;
  const subjectId = resolveJahresplanSubjectId(fach, subjects);
  if (!subjectId) {
    return { plan: input.existingPlan || {}, status: 'missing-subject' };
  }

  const currentCell = input.existingPlan?.[input.kw]?.[subjectId];
  if (!isYearPlanCellFree(currentCell)) {
    return { plan: input.existingPlan || {}, status: 'occupied', subjectId };
  }

  const next: Record<number, Record<string, YearPlanCell>> = {
    ...(input.existingPlan || {}),
    [input.kw]: {
      ...(input.existingPlan?.[input.kw] || {}),
      [subjectId]: {
        ...(currentCell || {}),
        thema,
        buch: String(input.lesson.material || '').trim(),
        type: input.lesson.type || 'standard',
        subCategory: input.lesson.schwerpunkte?.[0] || '',
        subCategories: Array.isArray(input.lesson.schwerpunkte) ? [...input.lesson.schwerpunkte] : [],
        items: [],
        completed: input.lesson.erledigt === true,
      },
    },
  };

  return { plan: next, status: 'added', subjectId };
}

/**
 * A yearly topic can fill an empty lesson, but must not replace an existing
 * teacher-written weekly plan. Returns original object on a conflict.
 */
export function mergeYearlySuggestionIntoEmptyWeeklySlot(
  existing: Record<string, any> | undefined,
  topic: {
    thema?: string;
    buch?: string;
    type?: string;
    subCategory?: string;
    subCategories?: string[];
    subjectId?: string;
  },
  suggestedSubject?: string,
): { status: 'added' | 'occupied' | 'missing-topic'; lesson: Record<string, any> } {
  const prior = existing || {};
  const thema = String(topic?.thema || '').trim();
  if (!thema) return { status: 'missing-topic', lesson: prior };
  const fach = String(suggestedSubject || '').trim();
  const hasDetails = hasWeeklyPlanningDetails(prior) ||
    ['lernziel', 'beschreibung', 'notiz', 'notizen', 'hue', 'buch'].some(key =>
      typeof prior[key] === 'string' && prior[key].trim()
    ) ||
    (Array.isArray(prior.schwerpunkte) && prior.schwerpunkte.length > 0);
  const differentSubject = Boolean(fach && prior.fach && prior.fach !== fach);
  if (hasDetails || differentSubject) return { status: 'occupied', lesson: prior };
  const focuses = Array.isArray(topic.subCategories) && topic.subCategories.length
    ? [...topic.subCategories]
    : topic.subCategory ? [topic.subCategory] : [];
  return {
    status: 'added',
    lesson: {
      ...prior,
      fach: prior.fach || fach,
      thema,
      ...(topic.buch ? { buch: topic.buch } : {}),
      type: topic.type || prior.type || 'standard',
      schwerpunkte: focuses.length ? focuses : prior.schwerpunkte || [],
    },
  };
}

/** Append multiple selected weekly lessons without overwriting yearly planning.
 * Every selected area is stored as its own item. Repeating an import is idempotent.
 */
export function addWeeklyLessonsToYearPlan(input: {
  existingPlan: Record<number, Record<string, YearPlanCell>> | undefined;
  kw: number;
  selections: { lesson: WeeklyLessonForYearPlan; fallbackSubject?: string }[];
  availableSubjects?: { id: string; label: string }[];
}): {
  plan: Record<number, Record<string, YearPlanCell>>;
  added: number;
  alreadyPresent: number;
  skipped: number;
} {
  let plan = input.existingPlan || {};
  let added = 0;
  let alreadyPresent = 0;
  let skipped = 0;
  const subjects = input.availableSubjects?.length ? input.availableSubjects : DEFAULT_YEARLY_SUBJECTS;
  for (const selection of input.selections) {
    const lesson = selection.lesson || {};
    const thema = String(lesson.thema || '').trim();
    const fach = String(lesson.fach || selection.fallbackSubject || '').trim();
    const subjectId = resolveJahresplanSubjectId(fach, subjects);
    if (!thema || !subjectId) { skipped++; continue; }
    const current = plan[input.kw]?.[subjectId];
    // A date/holiday marker with no topic is not an empty teaching cell.
    if (current && current.type && current.type !== 'standard' && yearPlanCellEntries(current).length === 0) {
      skipped++;
      continue;
    }
    const existingEntries = yearPlanCellEntries(current);
    const subCategories = Array.isArray(lesson.schwerpunkte)
      ? [...new Set(lesson.schwerpunkte.map(value => String(value).trim()).filter(Boolean))]
      : [];
    const candidate: YearPlanEntry = {
      thema,
      buch: String(lesson.material || '').trim(),
      type: lesson.type || 'standard',
      subCategory: subCategories[0] || '',
      subCategories,
    };
    const identity = (entry: YearPlanEntry) => JSON.stringify([
      String(entry.thema || '').trim().toLocaleLowerCase('de-AT'),
      String(entry.buch || '').trim().toLocaleLowerCase('de-AT'),
      entry.type || 'standard',
      [...(entry.subCategories?.length ? entry.subCategories : entry.subCategory ? [entry.subCategory] : [])].sort(),
    ]);
    if (existingEntries.some(entry => identity(entry) === identity(candidate))) {
      alreadyPresent++;
      continue;
    }
    const completed = existingEntries.length > 0 ? current?.completed === true : lesson.erledigt === true;
    plan = {
      ...plan,
      [input.kw]: {
        ...(plan[input.kw] || {}),
        [subjectId]: yearPlanEntriesToCell([...existingEntries, candidate], completed, current || {}),
      },
    };
    added++;
  }
  return { plan, added, alreadyPresent, skipped };
}


/** Build a temporary AI timetable, never editing the live weekly plan.
 * Saved lesson subjects win over Stammplan defaults; the result is transient.
 */
export function buildYearlyAiTimetable(
  existingWeek: Record<string, any> | undefined,
  stammplan: Record<string, any> | undefined,
): Record<string, any> {
  const original = existingWeek || {};
  const next: Record<string, any> = { ...original };
  for (const tag of TAGE_NAMEN) {
    const stammDay = stammplan?.[tag] || {};
    const existingDay = original[tag] || {};
    const nextDay = { ...existingDay };
    for (const [hourText, fach] of Object.entries(stammDay)) {
      const hourNumber = Number(hourText);
      if (!Number.isInteger(hourNumber) || hourNumber < 1 || hourNumber > MAX_LESSON_SLOTS ||
          typeof fach !== 'string' || !fach.trim()) continue;
      const slot = hourNumber - 1;
      if (!nextDay[slot]?.fach) nextDay[slot] = { ...(nextDay[slot] || {}), fach: fach.trim() };
    }
    if (Object.keys(nextDay).length) next[tag] = nextDay;
  }
  return next;
}

/** A generated annual-topic suggestion may only fill a genuine timetable
 * slot that has no teacher content. This function never rewrites other
 * weeks, student tasks, homework, materials, or even a legacy completion flag.
 * A blank Stammplan subject alone is a valid target, not an authored lesson.
 */
export function mergeYearlyAssignmentsIntoWeeklyWeek(input: {
  existingWeek: Record<string, any> | undefined;
  timetableWeek: Record<string, any> | undefined;
  assignments: readonly {
    tag?: string;
    idx?: number;
    thema?: string;
    buch?: string;
    type?: string;
    subCategory?: string;
    subCategories?: string[];
  }[];
}): { week: Record<string, any>; added: number; skipped: number } {
  const original = input.existingWeek || {};
  const template = input.timetableWeek || {};
  let next = original;
  let added = 0;
  let skipped = 0;

  for (const assignment of input.assignments) {
    const tag = assignment?.tag || '';
    const idx = assignment?.idx;
    if (!TAGE_NAMEN.includes(tag) || !Number.isInteger(idx) || idx! < 0 || idx! >= MAX_LESSON_SLOTS) {
      skipped++;
      continue;
    }
    const hour = idx as number;
    const existingDay = original[tag] || {};
    const templateDay = template[tag] || {};
    const existing = next[tag]?.[hour] || existingDay[hour];
    const base = templateDay[hour];
    const templateSubject = typeof base?.fach === 'string' ? base.fach.trim() : '';
    const existingSubject = typeof existing?.fach === 'string' ? existing.fach.trim() : '';

    // Do not assign into an unscheduled hour or a changed subject.
    if (!templateSubject || (existingSubject && existingSubject !== templateSubject)) {
      skipped++;
      continue;
    }
    // Any authored information, a published child task, or a completed lesson
    // protects the slot, including empty-topic lessons prepared otherwise.
    if (existing && Object.entries(existing).some(([key, value]) =>
      key !== 'fach' && key !== 'erledigt' &&
      value !== null && value !== undefined && value !== '' && value !== false
    ) || existing?.erledigt === true) {
      skipped++;
      continue;
    }

    const prior = existing || { fach: templateSubject };
    const allowedTypes = new Set(['standard', 'sa', 'test', 'lzk', 'event']);
    const type = typeof assignment.type === 'string' && allowedTypes.has(assignment.type)
      ? assignment.type : 'standard';
    const res = mergeYearlySuggestionIntoEmptyWeeklySlot(prior, {
      thema: typeof assignment.thema === 'string' ? assignment.thema.trim() : '',
      buch: typeof assignment.buch === 'string' ? assignment.buch.trim() : '',
      type,
      subCategory: typeof assignment.subCategory === 'string' ? assignment.subCategory.trim() : '',
      subCategories: Array.isArray(assignment.subCategories)
        ? assignment.subCategories.filter(value => typeof value === 'string' && value.trim()).map(value => value.trim())
        : [],
    }, templateSubject);
    if (res.status !== 'added') {
      skipped++;
      continue;
    }

    // Copy-on-write and return the original object when no assignments fit.
    next = {
      ...next,
      [tag]: { ...(next[tag] || original[tag] || {}), [hour]: res.lesson },
    };
    added++;
  }

  return { week: next, added, skipped };
}

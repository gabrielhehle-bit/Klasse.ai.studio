import { DEFAULT_YEARLY_SUBJECTS, MAX_LESSON_SLOTS, TAGE_NAMEN } from '../constants';
import { resolveJahresplanSubjectId } from './yearPlanSubjects';

type Subjects = readonly { id: string; label: string }[];
type Week = Record<string, any>;
type Year = Record<string, any>;
type Plans = { week: Week; year: Year };

const normalized = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLocaleLowerCase('de-AT') : '';
const hasWeekday = (day: string) => TAGE_NAMEN.includes(day) ||
  (/^[0-4]$/.test(day));

/** Fallback to 'sonstiges' is too broad to identify an actual subject.
 * Do not accidentally link Religion/Musik/etc. to all miscellaneous topics.
 */
function lessonSubjectId(fach: unknown, subjects: Subjects): string | undefined {
  const name = normalized(fach);
  if (!name) return undefined;
  const id = resolveJahresplanSubjectId(String(fach), [...subjects]);
  if (id === 'sonstiges' && name !== 'sonstiges') return undefined;
  return id;
}
function subjectList(subjects?: Subjects): Subjects {
  return subjects?.length ? subjects : DEFAULT_YEARLY_SUBJECTS;
}
function matchingWeekSlots(
  week: Week, subjectId: string, thema: string, subjects: Subjects,
): Array<{ day: string; hour: string; lesson: any }> {
  const match = normalized(thema);
  if (!match) return [];
  const found: Array<{ day: string; hour: string; lesson: any }> = [];
  for (const [day, cells] of Object.entries(week)) {
    if (!hasWeekday(day) || !cells || typeof cells !== 'object') continue;
    for (const [hour, lesson] of Object.entries(cells as Record<string, any>)) {
      if (!/^\d+$/.test(hour) || Number(hour) >= MAX_LESSON_SLOTS ||
          !lesson || typeof lesson !== 'object') continue;
      if (normalized(lesson.thema) === match &&
          lessonSubjectId(lesson.fach, subjects) === subjectId) {
        found.push({ day, hour, lesson });
      }
    }
  }
  return found;
}
function yearMatches(cell: any, thema: string): Array<{ kind: 'root' | 'item'; index: number }> {
  const name = normalized(thema);
  if (!name || !cell) return [];
  const result: Array<{ kind: 'root' | 'item'; index: number }> = [];
  if (normalized(cell.thema) === name) result.push({ kind: 'root', index: -1 });
  if (Array.isArray(cell.items)) {
    cell.items.forEach((item: any, index: number) => {
      if (normalized(item?.thema) === name) result.push({ kind: 'item', index });
    });
  }
  return result;
}
function updateWeekForYearTopic(
  week: Week, subjectId: string, thema: string, done: boolean, subjects: Subjects,
): Week {
  let next = week;
  for (const { day, hour, lesson } of matchingWeekSlots(week, subjectId, thema, subjects)) {
    if (lesson.erledigt === done) continue;
    if (next === week) next = { ...week };
    next[day] = {
      ...(next[day] || {}),
      [hour]: { ...lesson, erledigt: done },
    };
  }
  return next;
}

/** A single weekly lesson changes its own completion first. The yearly topic
 * is complete only when all saved lessons in that week, subject and topic are
 * complete. Ambiguous duplicate yearly titles are never updated by guessing.
 */
export function toggleWeeklyCompletion(input: {
  week: Week; year: Year; tag: string; idx: number; subjects?: Subjects;
}): Plans {
  const { week, year, tag, idx } = input;
  if (!hasWeekday(tag) || !Number.isInteger(idx) || idx < 0 || idx >= MAX_LESSON_SLOTS) {
    return { week, year };
  }
  const original = week?.[tag]?.[idx];
  if (!original || typeof original !== 'object') return { week, year };
  const done = original.erledigt !== true;
  const nextWeek = { ...week, [tag]: { ...week[tag], [idx]: { ...original, erledigt: done } } };
  const subjects = subjectList(input.subjects);
  const subjectId = lessonSubjectId(original.fach, subjects);
  const cell = subjectId ? year[subjectId] : undefined;
  const matching = yearMatches(cell, original.thema);
  if (!cell || matching.length !== 1) return { week: nextWeek, year };
  const sessions = matchingWeekSlots(nextWeek, subjectId!, original.thema, subjects);
  const completed = sessions.length > 0 && sessions.every(({ lesson }) => lesson.erledigt === true);
  const target = matching[0];

  if (target.kind === 'root') {
    // A root plus extra items has no independent root completed field.
    // Preserve the year cell rather than incorrectly marking every item.
    if (Array.isArray(cell.items) && cell.items.length) return { week: nextWeek, year };
    if (cell.completed === completed) return { week: nextWeek, year };
    return { week: nextWeek, year: { ...year, [subjectId!]: { ...cell, completed } } };
  }
  const oldItems = cell.items as any[];
  const oldItem = oldItems[target.index];
  if (oldItem?.completed === completed) return { week: nextWeek, year };
  const items = oldItems.map((item, index) =>
    index === target.index ? { ...item, completed } : item);
  const hasRoot = Boolean(normalized(cell.thema));
  return {
    week: nextWeek,
    year: { ...year, [subjectId!]: {
      ...cell, items,
      // Mixed root/item cells do not separately store root completion.
      completed: hasRoot ? cell.completed === true && items.every(it => it.completed === true)
        : items.length > 0 && items.every(it => it.completed === true),
    } },
  };
}

/** Clicking an individual yearly topic in the weekly planner updates only
 * that topic and corresponding subject-specific saved weekly lessons.
 */
export function toggleYearlyEntryCompletion(input: {
  week: Week; year: Year; subjectId: string; itemIndex: number | null; subjects?: Subjects;
}): Plans {
  const { week, year, subjectId, itemIndex } = input;
  const cell = year?.[subjectId];
  if (!cell) return { week, year };
  const hasItem = itemIndex !== null;
  if (hasItem && (!Number.isInteger(itemIndex) || itemIndex! < 0 ||
      !Array.isArray(cell.items) || !cell.items[itemIndex!])) return { week, year };
  const entry = hasItem ? cell.items[itemIndex!] : cell;
  const done = entry.completed !== true;
  let updated: any;
  if (!hasItem) {
    updated = { ...cell, completed: done };
  } else {
    const items = cell.items.map((item: any, index: number) =>
      index === itemIndex ? { ...item, completed: done } : item);
    updated = {
      ...cell, items,
      completed: normalized(cell.thema) ? cell.completed === true && items.every((it: any) => it.completed === true)
        : items.every((it: any) => it.completed === true),
    };
  }
  const subjects = subjectList(input.subjects);
  // Two yearly entries with the same title but different subtopics cannot
  // safely be matched to a weekly lesson without a persistent entry ID.
  const canSync = yearMatches(cell, entry.thema).length === 1;
  const nextWeek = canSync ? updateWeekForYearTopic(week, subjectId, entry.thema, done, subjects) : week;
  return { week: nextWeek, year: { ...year, [subjectId]: updated } };
}

/** Completing a yearly cell from the yearly grid should also update only
 * matching lessons in its own subject; never change a different subject.
 * Items are left intact (as in the existing yearly grid behavior).
 */
export function toggleYearlyCellCompletion(input: {
  week: Week; year: Year; subjectId: string; subjects?: Subjects;
}): Plans {
  const { week, year, subjectId } = input;
  const cell = year?.[subjectId];
  if (!cell) return { week, year };
  const done = cell.completed !== true;
  const names: string[] = [];
  if (normalized(cell.thema)) names.push(cell.thema);
  if (Array.isArray(cell.items)) for (const item of cell.items) {
    if (normalized(item?.thema)) names.push(item.thema);
  }
  const subjects = subjectList(input.subjects);
  let nextWeek = week;
  for (const thema of names) {
    if (names.filter(name => normalized(name) === normalized(thema)).length !== 1) continue;
    nextWeek = updateWeekForYearTopic(nextWeek, subjectId, thema, done, subjects);
  }
  return { week: nextWeek, year: { ...year, [subjectId]: { ...cell, completed: done } } };
}

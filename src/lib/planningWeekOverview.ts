import { MAX_LESSON_SLOTS, TAGE_NAMEN } from '../constants';

export interface PlanningDayLesson {
  hour: number;
  subject: string;
  topic: string;
  completed: boolean;
}

export interface PlanningDayOverview {
  day: string;
  index: number;
  lessons: PlanningDayLesson[];
  missingTopics: number;
  appointmentCount: number;
}

type DataRecord = Record<string, unknown>;
const record = (value: unknown): DataRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as DataRecord : {};

/**
 * Pure, read-only projection of the selected week. Old records can use numeric
 * weekday keys (0..4); the current planner uses names (Montag..Freitag).
 * A named record wins for the same hour, so a legacy duplicate is never
 * double-counted. Timetable-only Stammplan cells are not planned lessons.
 */
export function getPlanningWeekOverview(week: unknown): PlanningDayOverview[] {
  const source = record(week);
  return TAGE_NAMEN.map((day, index) => {
    const numeric = record(source[String(index)]);
    const named = record(source[day]);
    const combined = { ...numeric, ...named };
    const lessons: PlanningDayLesson[] = [];

    for (let hourIndex = 0; hourIndex < MAX_LESSON_SLOTS; hourIndex++) {
      const lesson = record(combined[String(hourIndex)]);
      const subject = typeof lesson.fach === 'string' ? lesson.fach.trim() : '';
      if (!subject) continue;
      lessons.push({
        hour: hourIndex + 1,
        subject,
        topic: typeof lesson.thema === 'string' ? lesson.thema.trim() : '',
        completed: lesson.erledigt === true,
      });
    }

    // Zeitunabhängige Einträge are only displayed when they are saved and
    // explicitly named; not every school day is assumed to contain an event.
    const namedEvents = Array.isArray(named.zeitunabhaengig) ? named.zeitunabhaengig :
      Array.isArray(numeric.zeitunabhaengig) ? numeric.zeitunabhaengig : [];
    const appointmentCount = namedEvents.filter(event => {
      const entry = record(event);
      return typeof entry.thema === 'string' && entry.thema.trim().length > 0 ||
        typeof entry.titel === 'string' && entry.titel.trim().length > 0;
    }).length;

    return {
      day,
      index,
      lessons,
      missingTopics: lessons.filter(lesson => !lesson.topic).length,
      appointmentCount,
    };
  });
}

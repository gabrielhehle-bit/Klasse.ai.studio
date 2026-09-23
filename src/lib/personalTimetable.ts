import type { AppState, PersonalLesson, PersonalTimetableException } from '../types';
import { LESSON_SLOT_NUMBERS, STUNDEN_INFO, TAGE_NAMEN } from '../constants';
import { syncActiveClass } from './appState';

export function personalLessonId(lesson: PersonalLesson, index: number): string {
  return lesson.id || 'legacy:' + index;
}

export function personalWeekStart(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() - (result.getDay() + 6) % 7);
  return result;
}

export function personalDateKey(date: Date): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')].join('-');
}
export function personalWeekDayDate(weekStart: Date, dayIndex: number): string {
  const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + dayIndex);
  return personalDateKey(date);
}
export function personalLessonTimes(stunde: number, custom?: Record<number, string>): [string, string] {
  const raw = custom?.[stunde] || STUNDEN_INFO[stunde] || '';
  const [start = '', end = ''] = raw.split(/[–—-]/).map(item => item.trim());
  return [/^\d\d:\d\d$/.test(start) ? start : '', /^\d\d:\d\d$/.test(end) ? end : ''];
}

export function importedTeacherLessons(state: AppState, classId: string, current: PersonalLesson[]) {
  const room = syncActiveClass(state).classes.find(item => item.id === classId);
  if (!room || room.teamTeaching?.role === 'viewer') return { added: [] as PersonalLesson[], skipped: 0, available: false };
  const added: PersonalLesson[] = [];
  let skipped = 0;
  for (const tag of TAGE_NAMEN) {
    for (const stunde of LESSON_SLOT_NUMBERS) {
      const fach = room.stammplan?.[tag]?.[stunde]?.trim();
      if (!fach) continue;
      if ([...current, ...added].some(item => item.tag === tag && item.stunde === stunde)) {
        skipped++;
        continue;
      }
      const [start, ende] = personalLessonTimes(stunde, room.stundenZeiten);
      added.push({
        id: crypto.randomUUID(), tag, stunde, fach, klasse: room.name, raum: '', kind: 'unterricht',
        start, ende,
        quelle: { classId, tag, stunde, fach },
      });
    }
  }
  return { added, skipped, available: true };
}

export function linkedClassChange(state: AppState, lesson: PersonalLesson): {
  changed: boolean; currentFach?: string; missing: boolean;
} {
  if (!lesson.quelle) return { changed: false, missing: false };
  const room = syncActiveClass(state).classes.find(item => item.id === lesson.quelle?.classId);
  if (!room) return { changed: true, missing: true };
  const currentFach = room.stammplan?.[lesson.quelle.tag]?.[lesson.quelle.stunde] || '';
  return { changed: currentFach !== lesson.quelle.fach, currentFach, missing: false };
}

/** Update only recurring class subject slots. Weekly planning content is never touched.
 * Call only after the user explicitly chose to update the class as well. */
export function applyTeacherChangeToClass(
  state: AppState, original: PersonalLesson, changed: PersonalLesson,
): { state: AppState; status: 'ok' | 'unlinked' | 'missing' | 'viewer' | 'changed' | 'occupied' } {
  if (!original.quelle || changed.kind && changed.kind !== 'unterricht') return { state, status: 'unlinked' };
  const synced = syncActiveClass(state);
  const room = synced.classes.find(item => item.id === original.quelle?.classId);
  if (!room) return { state, status: 'missing' };
  if (room.teamTeaching?.role === 'viewer') return { state, status: 'viewer' };
  const source = original.quelle;
  const originalSubject = room.stammplan?.[source.tag]?.[source.stunde] || '';
  if (originalSubject !== source.fach) return { state, status: 'changed' };
  const moved = changed.tag !== source.tag || changed.stunde !== source.stunde;
  const targetSubject = room.stammplan?.[changed.tag]?.[changed.stunde];
  if (moved && targetSubject) return { state, status: 'occupied' };
  if (!TAGE_NAMEN.includes(changed.tag) || !LESSON_SLOT_NUMBERS.includes(changed.stunde) || !changed.fach.trim())
    return { state, status: 'unlinked' };
  const stammplan = { ...room.stammplan,
    [source.tag]: { ...(room.stammplan?.[source.tag] || {}) },
    [changed.tag]: { ...(room.stammplan?.[changed.tag] || {}) },
  };
  if (moved) delete stammplan[source.tag][source.stunde];
  stammplan[changed.tag][changed.stunde] = changed.fach.trim();
  const classes = synced.classes.map(item => item.id === room.id ? { ...item, stammplan } : item);
  return {
    status: 'ok',
    state: { ...synced, classes,
      ...(synced.activeClassId === room.id ? { stammplan } : {}),
    },
  };
}

export interface VisiblePersonalLesson {
  lesson: PersonalLesson;
  baseId: string;
  exception: 'add' | 'change' | 'cancel' | null;
  cancelled: boolean;
}
export function personalLessonsForDate(
  lessons: PersonalLesson[], exceptions: PersonalTimetableException[], datum: string, tag: string,
): VisiblePersonalLesson[] {
  const result: VisiblePersonalLesson[] = [];
  lessons.forEach((lesson, index) => {
    if (lesson.tag !== tag) return;
    const baseId = personalLessonId(lesson, index);
    const overrides = exceptions.filter(item => item.datum === datum && item.lessonId === baseId
      && (item.type === 'change' || item.type === 'cancel'));
    const exception = overrides.at(-1);
    if (exception?.type === 'change' && exception.lesson?.tag !== tag) return;
    result.push({
      lesson: exception?.type === 'change' && exception.lesson ? exception.lesson : lesson,
      baseId,
      cancelled: exception?.type === 'cancel',
      exception: exception?.type || null,
    });
  });
  exceptions.filter(item => item.datum === datum && item.type === 'add' && item.lesson?.tag === tag)
    .forEach(item => result.push({ lesson: item.lesson!, baseId: item.id, exception: 'add', cancelled: false }));
  // A one-day change that moves to another weekday is rendered on its destination day.
  exceptions.filter(item => item.datum === datum && item.type === 'change' &&
      item.lesson?.tag === tag && !result.some(visible => visible.baseId === item.lessonId))
    .forEach(item => result.push({ lesson: item.lesson!, baseId: item.lessonId || item.id,
      exception: 'change', cancelled: false }));
  return result.sort((a, b) =>
    (a.lesson.start || String(a.lesson.stunde).padStart(2, '0')).localeCompare(
      b.lesson.start || String(b.lesson.stunde).padStart(2, '0'),
    ));
}

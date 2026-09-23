import type { AppState, HomeworkAssignment } from '../types';
import { getStartYear, kwToMonday, kwYear, formatLocalDateKey } from './utils';

export function homeworkForDay(items: readonly HomeworkAssignment[] | undefined, day: string, year: string): HomeworkAssignment[] {
  return (items || []).filter(item => item.aufgegebenAm === day && item.schuljahr === year)
    .slice().sort((a, b) => a.fach.localeCompare(b.fach, 'de-AT') || a.faelligAm.localeCompare(b.faelligAm));
}

export function homeworkForWeek(app: Pick<AppState, 'hausuebungen' | 'schuljahr' | 'bundesland'>, week: number): HomeworkAssignment[] {
  const monday = kwToMonday(week, kwYear(week, getStartYear(app.schuljahr), app.bundesland || 'VBG'));
  const firstDay = formatLocalDateKey(monday);
  const nextWeek = new Date(monday);
  nextWeek.setDate(monday.getDate() + 7);
  const dayAfterWeek = formatLocalDateKey(nextWeek);
  return (app.hausuebungen || []).filter(entry =>
    entry.schuljahr === app.schuljahr && entry.aufgegebenAm >= firstDay && entry.aufgegebenAm < dayAfterWeek,
  ).slice().sort((a, b) =>
    a.aufgegebenAm.localeCompare(b.aufgegebenAm) || a.fach.localeCompare(b.fach, 'de-AT'));
}

export function upsertHomework(
  items: readonly HomeworkAssignment[] | undefined,
  assignment: HomeworkAssignment,
): HomeworkAssignment[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(assignment.aufgegebenAm) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(assignment.faelligAm) ||
      assignment.faelligAm < assignment.aufgegebenAm ||
      !assignment.fach.trim() || !assignment.aufgabe.trim() || !assignment.schuljahr.trim()) {
    throw new Error('Bitte Fach, Aufgabe und ein gültiges Abgabedatum ab dem Ausgabetag angeben.');
  }
  const clean = { ...assignment, fach: assignment.fach.trim(), aufgabe: assignment.aufgabe.trim() };
  const list = [...(items || [])];
  const index = list.findIndex(entry => entry.id === clean.id);
  if (index === -1) return [...list, clean];
  list[index] = clean;
  return list;
}

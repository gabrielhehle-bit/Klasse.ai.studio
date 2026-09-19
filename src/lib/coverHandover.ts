import type { AppState, VertretungsVorbereitung } from '../types';
import { getKW } from './utils';
import { toLocalDateInputValue } from './handoverUtils';

export const DEFAULT_COVER_CHECKLIST = [
  { id: 'room', text: 'Raum und Zutritt mit der Schulleitung geklärt', checked: false },
  { id: 'material', text: 'Materialien und Arbeitsaufträge bereitgestellt', checked: false },
  { id: 'duty', text: 'Aufsichten, Pausen und organisatorische Hinweise geprüft', checked: false },
  { id: 'contacts', text: 'Notfallkontakte nur berechtigten Personen sicher zugänglich gemacht', checked: false },
];

export function getCoverDates(draft: Pick<VertretungsVorbereitung, 'rangeMode' | 'singleDate' | 'startDate' | 'endDate' | 'weekDate'>): Date[] {
  const parse = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(value + 'T12:00:00');
    return !Number.isNaN(date.getTime()) && toLocalDateInputValue(date) === value ? date : null;
  };
  if (draft.rangeMode === 'single') {
    const date = parse(draft.singleDate);
    return date ? [date] : [];
  }
  if (draft.rangeMode === 'week') {
    const date = parse(draft.weekDate);
    if (!date) return [];
    const monday = new Date(date);
    monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    return Array.from({ length: 5 }, (_, index) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + index);
      return day;
    });
  }
  const from = parse(draft.startDate);
  const to = parse(draft.endDate);
  if (!from || !to || to < from) return [];
  const days: Date[] = [];
  for (const current = new Date(from); current <= to && days.length < 14; current.setDate(current.getDate() + 1)) {
    if (current.getDay() !== 0 && current.getDay() !== 6) days.push(new Date(current));
  }
  return days;
}

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
export function getCoverLesson(app: Pick<AppState, 'wochenplanung' | 'stammplan'>, date: Date, hour: number) {
  const weekday = WEEKDAYS[date.getDay()];
  const entry: any = app.wochenplanung?.[getKW(date)]?.[weekday]?.[hour - 1] || {};
  return {
    fach: String(entry.fach || app.stammplan?.[weekday]?.[hour] || ''),
    thema: String(entry.thema || entry.inhalt || ''),
    material: String(entry.material || ''),
    hausuebung: String(entry.hausuebung || entry.housework || ''),
  };
}

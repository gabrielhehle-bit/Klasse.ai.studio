import type { AppState } from '../types';

export function completeMissingAttendance(attendance: AppState['anwesenheit'], studentIds: string[], date: string, hours: number[]): AppState['anwesenheit'] {
  const result = { ...attendance };
  for (const id of studentIds) {
    const student = attendance[id] || {};
    const day = { ...(student[date] || {}) };
    for (const hour of hours) {
      if (day[hour] === undefined || day[hour] === null || day[hour] === '') day[hour] = 'a';
    }
    result[id] = { ...student, [date]: day };
  }
  return result;
}

export function updateSubjectColumn(meta: AppState['notenMeta'], subject: string, type: 'sa' | 'lzk' | 'wp' | 'obj', index: number, label: string, date: string, maxPoints?: number): AppState['notenMeta'] {
  const current = meta[subject] || {};
  const dates = { ...current.colDates?.[type] };
  if (date) dates[index] = date; else delete dates[index];
  const points = { ...current.maxPoints?.[type] };
  if (maxPoints !== undefined && Number.isFinite(maxPoints) && maxPoints > 0) points[index] = maxPoints;
  return { ...meta, [subject]: { ...current,
    colLabels: { ...current.colLabels, [type]: { ...current.colLabels?.[type], [index]: label } },
    colDates: { ...current.colDates, [type]: dates },
    maxPoints: { ...current.maxPoints, [type]: points },
  } };
}

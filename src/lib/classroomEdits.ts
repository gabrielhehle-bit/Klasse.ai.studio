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


export function removeSubjectColumn(
  noten: AppState['noten'],
  meta: AppState['notenMeta'],
  subject: string,
  type: 'lzk' | 'wp' | 'obj',
  newCount: number,
): { noten: AppState['noten']; notenMeta: AppState['notenMeta'] } {
  const safeCount = Math.max(0, Math.floor(newCount));
  const dataKey: 'lzk' | 'wp' | 'aufgaben' = type === 'obj' ? 'aufgaben' : type;

  const nextNoten: AppState['noten'] = { ...(noten || {}) };
  for (const [studentId, studentData] of Object.entries(noten || {})) {
    const subjectData = studentData?.[subject];
    if (!subjectData) continue;

    let subjectChanged = false;
    const nextSubjectData: Record<string, any> = { ...subjectData };

    for (const semester of ['1', '2']) {
      const semData = subjectData?.[semester];
      if (!semData) continue;
      const values = Array.isArray((semData as any)[dataKey]) ? (semData as any)[dataKey] : [];
      if (values.length <= safeCount) continue;
      nextSubjectData[semester] = {
        ...semData,
        [dataKey]: values.slice(0, safeCount),
      };
      subjectChanged = true;
    }

    if (subjectChanged) {
      nextNoten[studentId] = {
        ...studentData,
        [subject]: nextSubjectData,
      };
    }
  }

  const trimIndexedRecord = (record: Record<string | number, any> | undefined) => {
    const result: Record<number, any> = {};
    Object.entries(record || {}).forEach(([key, value]) => {
      const index = Number(key);
      if (Number.isFinite(index) && index < safeCount) result[index] = value;
    });
    return result;
  };

  const current = meta?.[subject] || {};
  const counts = { ...(current.colCounts || { lzk: 4, wp: 4, obj: 4 }), [type]: safeCount };
  const nextSubjectMeta = {
    ...current,
    colCounts: counts,
    colLabels: {
      ...(current.colLabels || {}),
      [type]: trimIndexedRecord(current.colLabels?.[type]),
    },
    colDates: {
      ...(current.colDates || {}),
      [type]: trimIndexedRecord(current.colDates?.[type]),
    },
    maxPoints: {
      ...(current.maxPoints || {}),
      [type]: trimIndexedRecord(current.maxPoints?.[type] as any),
    },
  };

  return {
    noten: nextNoten,
    notenMeta: {
      ...(meta || {}),
      [subject]: nextSubjectMeta,
    },
  };
}

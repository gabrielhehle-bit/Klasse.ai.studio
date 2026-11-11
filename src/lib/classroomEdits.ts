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

export function updateSubjectColumn(meta: AppState['notenMeta'], subject: string, type: 'sa' | 'lzk' | 'wp' | 'obj', index: number, label: string, date: string, maxPoints?: number, area?: string): AppState['notenMeta'] {
  const current = meta[subject] || {};
  const dates = { ...current.colDates?.[type] };
  if (date) dates[index] = date; else delete dates[index];
  const points = { ...current.maxPoints?.[type] };
  if (maxPoints !== undefined && Number.isFinite(maxPoints) && maxPoints > 0) points[index] = maxPoints;
  return { ...meta, [subject]: { ...current,
    ...(area !== undefined && type === 'lzk' ? { colAreas: { ...current.colAreas, lzk: { ...current.colAreas?.lzk, [index]: area.trim() } } } : {}),
    colLabels: { ...current.colLabels, [type]: { ...current.colLabels?.[type], [index]: label } },
    colDates: { ...current.colDates, [type]: dates },
    maxPoints: { ...current.maxPoints, [type]: points },
  } };
}


/**
 * Guard against silently discarding archived grades when reducing the column
 * count. Treat 0 points, absence codes, participation flags and metadata as
 * recorded information; inspect both historic school-year buckets.
 */
export function getSubjectColumnRemovalBlockReason(
  noten: AppState['noten'],
  meta: AppState['notenMeta'],
  subject: string,
  type: 'lzk' | 'wp' | 'obj',
  newCount: number,
): 'grades' | 'metadata' | null {
  const cutoff = Math.max(0, Math.floor(newCount));
  const dataKey = type === 'obj' ? 'aufgaben' : type;
  const isSaved = (value: unknown) => value !== undefined && value !== null && value !== '';
  for (const studentData of Object.values(noten || {})) {
    const subjectData = studentData?.[subject];
    for (const semester of ['1', '2'] as const) {
      const record = subjectData?.[semester];
      if (!record) continue;
      const values = (record as any)[dataKey];
      if (Array.isArray(values) && values.some((value, index) => index >= cutoff && isSaved(value))) {
        return 'grades';
      }
      if (type === 'lzk' && Object.entries((record as any).lzkParticipation || {})
        .some(([index, value]) => Number(index) >= cutoff && isSaved(value))) {
        return 'grades';
      }
    }
  }
  const subjectMeta: any = meta?.[subject] || {};
  const records = [
    subjectMeta.colLabels?.[type],
    subjectMeta.colDates?.[type],
    subjectMeta.colAreas?.[type],
    subjectMeta.maxPoints?.[type],
  ];
  if (records.some(record => Object.entries(record || {})
    .some(([index, value]) => Number(index) >= cutoff && isSaved(value)))) {
    return 'metadata';
  }
  return null;
}

export function removeSubjectColumn(
  noten: AppState['noten'],
  meta: AppState['notenMeta'],
  subject: string,
  type: 'lzk' | 'wp' | 'obj',
  newCount: number,
): { noten: AppState['noten']; notenMeta: AppState['notenMeta'] } {
  const safeCount = Math.max(0, Math.floor(newCount));
  // Hard fail-closed guard: even a caller that skipped the UI confirmation
  // must not delete any saved assessment value or configured column.
  if (getSubjectColumnRemovalBlockReason(noten, meta, subject, type, safeCount)) {
    return { noten, notenMeta: meta };
  }
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
      const hasRemovedParticipation = type === 'lzk' && Object.keys((semData as any).lzkParticipation || {}).some(key => Number(key) >= safeCount);
      if (values.length <= safeCount && !hasRemovedParticipation) continue;
      nextSubjectData[semester] = {
        ...semData,
        [dataKey]: values.slice(0, safeCount),
        ...(type === 'lzk' && (semData as any).lzkParticipation ? { lzkParticipation: Object.fromEntries(Object.entries((semData as any).lzkParticipation).filter(([key]) => Number(key) < safeCount)) } : {}),
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
    colAreas: { ...current.colAreas, [type]: trimIndexedRecord(current.colAreas?.[type]) },
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

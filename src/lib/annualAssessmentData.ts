import type { AppState } from '../types';

/**
 * Annual read model for old gradebooks. Legacy records were stored in two
 * internal buckets. Never discard one bucket just because the school-year UI
 * no longer shows a semester switch.
 *
 * sourceBucket/sourceIndex are internal write-back coordinates. They are not
 * labels for the teacher and must be retained if an existing item is edited.
 */
export interface AnnualAssessment {
  id: string;
  studentId: string;
  fach: string;
  category: 'sa' | 'lzk' | 'wp' | 'aufgaben';
  sourceBucket: '1' | '2';
  sourceIndex: number;
  value: number | string | null;
  label?: string;
  date?: string;
  maxPoints?: number;
}

const CATEGORIES: AnnualAssessment['category'][] = ['sa', 'lzk', 'wp', 'aufgaben'];
const CATEGORY_META: Record<AnnualAssessment['category'], string> = {
  sa: 'sa', lzk: 'lzk', wp: 'wp', aufgaben: 'obj',
};

/** Concatenate *only real entries* from both legacy buckets, preserving their origins. */
export function annualAssessments(
  app: AppState,
  studentId: string,
  fach: string,
): AnnualAssessment[] {
  const gradeData = app.noten?.[studentId]?.[fach];
  const meta = app.notenMeta?.[fach];
  const results: AnnualAssessment[] = [];

  for (const bucket of ['1', '2'] as const) {
    const source = gradeData?.[bucket];
    if (!source) continue;
    for (const category of CATEGORIES) {
      const values = source[category] || [];
      if (!Array.isArray(values)) continue;
      for (let index = 0; index < values.length; index++) {
        const value = values[index];
        if (value === undefined || value === null || String(value).trim() === '') continue;
        const key = CATEGORY_META[category];
        results.push({
          id: `${studentId}:${fach}:${bucket}:${category}:${index}`,
          studentId,
          fach,
          category,
          sourceBucket: bucket,
          sourceIndex: index,
          value,
          label: meta?.colLabels?.[key]?.[index],
          date: meta?.colDates?.[key]?.[index],
          maxPoints: meta?.maxPoints?.[key]?.[index],
        });
      }
    }
  }

  return results.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}

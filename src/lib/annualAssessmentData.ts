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
        const override = meta?.annualColumns?.[annualColumnKey(bucket, category, index)] || {};
        results.push({
          id: `${studentId}:${fach}:${bucket}:${category}:${index}`,
          studentId,
          fach,
          category,
          sourceBucket: bucket,
          sourceIndex: index,
          value,
          label: override.label ?? meta?.colLabels?.[key]?.[index],
          date: override.date ?? meta?.colDates?.[key]?.[index],
          maxPoints: override.maxPoints ?? meta?.maxPoints?.[key]?.[index],
        });
      }
    }
  }

  return results.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}

// Individual annual metadata must be source-aware: two historical columns with
// the same category/index can have different dates or labels. Never overwrite
// the legacy per-subject metadata merely to display them together.
export type AnnualCategory = AnnualAssessment['category'];
export type AnnualLegacyBucket = AnnualAssessment['sourceBucket'];
export interface AnnualColumnMetadata {
  label?: string;
  date?: string;
  maxPoints?: number;
}
export function annualColumnKey(bucket: AnnualLegacyBucket, category: AnnualCategory, index: number): string {
  return `${bucket}:${category}:${index}`;
}

export function updateAnnualAssessment(
  app: AppState,
  entry: Pick<AnnualAssessment, 'studentId' | 'fach' | 'category' | 'sourceBucket' | 'sourceIndex'>,
  value: number | string | null,
  override?: AnnualColumnMetadata,
): AppState {
  const { studentId, fach, category, sourceBucket, sourceIndex } = entry;
  const studentGrades = app.noten?.[studentId] || {};
  const subjectGrades = studentGrades[fach] || {};
  const dayGrades = subjectGrades[sourceBucket] || { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] };
  const values = [...(dayGrades[category] || [])];
  // Never shift indices or alter any other student's scores when editing.
  if (sourceIndex < 0 || !Number.isSafeInteger(sourceIndex)) return app;
  values[sourceIndex] = value;
  const updated = {
    ...app,
    noten: {
      ...app.noten,
      [studentId]: {
        ...studentGrades,
        [fach]: {
          ...subjectGrades,
          [sourceBucket]: { ...dayGrades, [category]: values },
        },
      },
    },
  };
  if (!override) return updated;
  const currentMeta = app.notenMeta?.[fach] || {};
  const annualColumns = currentMeta.annualColumns || {};
  const key = annualColumnKey(sourceBucket, category, sourceIndex);
  return {
    ...updated,
    notenMeta: {
      ...app.notenMeta,
      [fach]: {
        ...currentMeta,
        annualColumns: {
          ...annualColumns,
          [key]: { ...(annualColumns[key] || {}), ...override },
        },
      },
    },
  };
}

/**
 * Annual additions append to a never-used column index across BOTH historical
 * buckets. This avoids changing subject-wide column labels for existing rows.
 * Newly saved items remain in the canonical first bucket; there is no user-
 * visible academic term selector. All legacy rows remain editable by origin.
 */
export function addAnnualAssessment(
  app: AppState,
  studentId: string,
  fach: string,
  category: AnnualCategory,
  value: number | string | null,
  metadata: AnnualColumnMetadata = {},
): AppState {
  const allStudentGrades = app.noten || {};
  const meta = app.notenMeta?.[fach] || {};
  const key = category === 'aufgaben' ? 'obj' : category;
  let maxIndex = -1;
  for (const studentGrades of Object.values(allStudentGrades)) {
    const subjects = studentGrades?.[fach];
    for (const bucket of ['1', '2'] as const) {
      const list = subjects?.[bucket]?.[category];
      if (Array.isArray(list)) maxIndex = Math.max(maxIndex, list.length - 1);
    }
  }
  const columnMetadata = [meta.colLabels?.[key], meta.colDates?.[key], meta.maxPoints?.[key]];
  for (const data of columnMetadata) {
    for (const index of Object.keys(data || {})) {
      if (Number.isSafeInteger(Number(index)) && Number(index) >= 0) maxIndex = Math.max(maxIndex, Number(index));
    }
  }
  for (const source of Object.keys(meta.annualColumns || {})) {
    const match = source.match(/^[12]:([a-z]+):(\d+)$/);
    if (match && match[1] === category) maxIndex = Math.max(maxIndex, Number(match[2]));
  }
  const sourceIndex = maxIndex + 1;
  return updateAnnualAssessment(app, {
    studentId, fach, category, sourceBucket: '1', sourceIndex,
  }, value, metadata);
}



// A class-wide annual column is identified by its source, not just its
// original numeric index; legacy columns from two terms can overlap.
export interface AnnualColumn extends AnnualColumnMetadata {
  id: string;
  category: AnnualCategory;
  sourceBucket: AnnualLegacyBucket;
  sourceIndex: number;
}
export function annualColumns(app: AppState, fach: string): AnnualColumn[] {
  const meta = app.notenMeta?.[fach] || {};
  const columns = new Map<string, AnnualColumn>();
  const categories: AnnualCategory[] = ['sa', 'lzk', 'wp', 'aufgaben'];
  for (const category of categories) {
    const key = category === 'aufgaben' ? 'obj' : category;
    for (const bucket of ['1', '2'] as const) {
      const indices = new Set<number>();
      for (const data of Object.values(app.noten || {})) {
        const list = data?.[fach]?.[bucket]?.[category];
        if (Array.isArray(list)) list.forEach((_, i) => { if (i in list) indices.add(i); });
      }
      for (const entry of Object.keys(meta.annualColumns || {})) {
        const match = entry.match(new RegExp(`^${bucket}:${category}:(\\d+)$`));
        if (match) indices.add(Number(match[1]));
      }
      for (const index of indices) {
        const id = annualColumnKey(bucket, category, index);
        const override = meta.annualColumns?.[id] || {};
        columns.set(id, {
          id, sourceBucket: bucket, category, sourceIndex: index,
          label: override.label ?? meta.colLabels?.[key]?.[index],
          date: override.date ?? meta.colDates?.[key]?.[index],
          maxPoints: override.maxPoints ?? meta.maxPoints?.[key]?.[index],
        });
      }
    }
  }
  return [...columns.values()].sort((a, b) =>
    (a.date || '').localeCompare(b.date || '') ||
    categories.indexOf(a.category) - categories.indexOf(b.category) ||
    a.sourceBucket.localeCompare(b.sourceBucket) ||
    a.sourceIndex - b.sourceIndex
  );
}


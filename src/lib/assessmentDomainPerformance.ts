import type { AppState, AssessmentMode } from '../types';
import { getAssessmentItemMode, getMaxPoints, getNormalizedAssessmentPercent } from './GradeUtils';

export interface AssessmentDomainResult {
  fach: string;
  area: string;
  assessments: number;
  percent: number;
  byCategory: { sa: number; lzk: number; wp: number; obj: number };
  categories: string[];
  modeCounts: Record<AssessmentMode, number>;
}

const TYPES = [
  { type: 'sa', dataKey: 'sa', label: 'Schularbeit' },
  { type: 'lzk', dataKey: 'lzk', label: 'LZK' },
  { type: 'wp', dataKey: 'wp', label: 'Wochenplan' },
  { type: 'obj', dataKey: 'aufgaben', label: 'Aufgabe / HÜ' },
] as const;

/**
 * Read-only pupil-level aggregation for dossier and KEL. The raw grades,
 * saved weights and original assessment modes are never modified.
 * A domain represents only assessed evidence, not mastery of the curriculum.
 * Homework-missing counters are deliberately excluded.
 */
export function getStudentAssessmentDomainPerformance(
  app: AppState,
  studentId: string,
  subject: string,
  semester: '1' | '2' | 'both' = '1',
): AssessmentDomainResult[] {
  const meta = app.notenMeta?.[subject];
  const studentData = app.noten?.[studentId]?.[subject];
  if (!meta || !studentData) return [];

  const periods = semester === 'both' ? (['1', '2'] as const) : [semester];
  const records = new Map<string, {
    area: string; sum: number; count: number;
    byCategory: AssessmentDomainResult['byCategory'];
    categoryLabels: Set<string>;
    modeCounts: AssessmentDomainResult['modeCounts'];
  }>();

  for (const { type, dataKey, label } of TYPES) {
    const savedAreas = meta.colAreas?.[type];
    if (!savedAreas) continue;
    for (const [indexString, rawArea] of Object.entries(savedAreas)) {
      const index = Number(indexString);
      const area = typeof rawArea === 'string' ? rawArea.trim().replace(/\s+/g, ' ') : '';
      if (!area || !Number.isSafeInteger(index) || index < 0) continue;
      const mode = getAssessmentItemMode(app, subject, type, index);
      const maxPoints = getMaxPoints(app, subject, type, index);
      for (const period of periods) {
        const periodData = studentData[period];
        if (!periodData) continue;
        // Exemption must not erase any raw mark, but it is not a result to graph.
        if (type === 'lzk' && periodData.lzkParticipation?.[index] === false) continue;
        const values = periodData[dataKey];
        const raw = Array.isArray(values) ? values[index] : undefined;
        const pct = getNormalizedAssessmentPercent(raw, mode, maxPoints);
        if (pct === null || !Number.isFinite(pct)) continue;
        const key = area.toLocaleLowerCase('de-AT');
        const row = records.get(key) || {
          area, sum: 0, count: 0,
          byCategory: { sa: 0, lzk: 0, wp: 0, obj: 0 },
          categoryLabels: new Set<string>(),
          modeCounts: { grades: 0, percent: 0, points: 0 },
        };
        row.sum += pct;
        row.count++;
        row.byCategory[type]++;
        row.categoryLabels.add(label);
        row.modeCounts[mode]++;
        records.set(key, row);
      }
    }
  }

  return [...records.values()]
    .map(row => ({
      fach: subject,
      area: row.area,
      assessments: row.count,
      percent: Math.round((row.sum / row.count) * 10) / 10,
      byCategory: row.byCategory,
      categories: [...row.categoryLabels],
      modeCounts: row.modeCounts,
    }))
    .sort((a, b) => b.assessments - a.assessments || a.area.localeCompare(b.area, 'de-AT'));
}

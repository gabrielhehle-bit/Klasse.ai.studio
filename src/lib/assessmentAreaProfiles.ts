import type { AppState } from '../types';
import { getAssessmentItemMode, getMaxPoints, getNormalizedAssessmentPercent, parseAssessmentInput } from './GradeUtils';

type StoredCategory = 'sa' | 'lzk' | 'wp' | 'aufgaben';
export interface AssessmentAreaProfile {
  subject: string;
  area: string;
  count: number;
  averagePercent: number;
  categories: string[];
}

/** Aggregate only actual, already assessed results tagged to an explicit learning
 * subarea. Missing entries, exemption, grades outside a valid scale, and recorded
 * absence statuses never become zeros. Real 0 points are counted.
 *
 * Values on different scales are mapped to an illustrative 0–100 learning index,
 * not to an official grade or a comparison against other children. This read
 * never mutates grades, thresholds or the student dossier.
 */
export function getStudentAssessmentAreaProfiles(
  app: AppState,
  studentId: string,
  semester: '1' | '2',
  subject?: string,
): AssessmentAreaProfile[] {
  const studentGrades = app.noten?.[studentId] || {};
  const subjects = subject ? [subject] : Object.keys(studentGrades);
  const groups = new Map<string, { subject: string; area: string; values: number[]; categories: Set<string> }>();
  const entries: { category: StoredCategory; metaKey: 'sa' | 'lzk' | 'wp' | 'obj' }[] = [
    { category: 'sa', metaKey: 'sa' },
    { category: 'lzk', metaKey: 'lzk' },
    { category: 'wp', metaKey: 'wp' },
    { category: 'aufgaben', metaKey: 'obj' },
  ];

  for (const fach of subjects) {
    const data = studentGrades[fach]?.[semester];
    if (!data) continue;
    const meta = app.notenMeta?.[fach];
    for (const { category, metaKey } of entries) {
      const saved = data[category];
      if (!Array.isArray(saved)) continue;
      for (const [idx, raw] of saved.entries()) {
        const area = String(meta?.colAreas?.[metaKey]?.[idx] || '').trim();
        if (!area) continue; // No guessed learning category.
        if (category === 'lzk' && data.lzkParticipation?.[idx] === false) continue;
        if (raw === null || raw === undefined || raw === '') continue;

        const mode = getAssessmentItemMode(app, fach, metaKey, idx);
        const max = getMaxPoints(app, fach, metaKey, idx);
        const parsed = parseAssessmentInput(String(raw), mode, max);
        if (!parsed.valid || parsed.value === null) continue;
        const score = getNormalizedAssessmentPercent(parsed.value, mode, max);
        if (score === null || !Number.isFinite(score)) continue;

        const key = JSON.stringify([fach, area]);
        if (!groups.has(key)) groups.set(key, { subject: fach, area, values: [], categories: new Set() });
        const group = groups.get(key)!;
        group.values.push(score);
        group.categories.add(metaKey);
      }
    }
  }

  return [...groups.values()].map(group => ({
    subject: group.subject,
    area: group.area,
    count: group.values.length,
    averagePercent: group.values.reduce((sum, value) => sum + value, 0) / group.values.length,
    categories: [...group.categories],
  })).sort((a, b) => a.subject.localeCompare(b.subject, 'de-AT') ||
    a.area.localeCompare(b.area, 'de-AT'));
}

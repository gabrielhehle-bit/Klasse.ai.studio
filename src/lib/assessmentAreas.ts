import type { AppState } from '../types';
import { calculateItemPercent, getAssessmentMode, getMaxPoints, parseAssessmentInput } from './GradeUtils';
import { countsInClassAverage } from './classAveragePolicy';

export function getLzkAreaRows(app: AppState, studentId: string, subject?: string, semester = '1') {
  return Object.entries(app.notenMeta || {}).flatMap(([fach, meta]) => {
    if (subject && fach !== subject) return [];
    const data = app.noten?.[studentId]?.[fach]?.[semester];
    const mode = getAssessmentMode(app, fach);
    return Object.entries(meta.colAreas?.lzk || {}).flatMap(([key, area]) => {
      if (typeof area !== 'string' || !area.trim()) return [];
      const index = Number(key);
      const max = getMaxPoints(app, fach, 'lzk', index);
      const raw = data?.lzk?.[index];
      const participates = data?.lzkParticipation?.[index] !== false;
      const parsed = parseAssessmentInput(String(raw ?? ''), mode, max);
      const numeric = parsed.valid && typeof parsed.value === 'number' ? parsed.value :
        parsed.valid && mode === 'grades' && typeof parsed.value === 'string' && /^[1-5][+-]$/.test(parsed.value) ? Number(parsed.value[0]) : null;
      const value = participates && numeric !== null ? (mode === 'grades' ? numeric : calculateItemPercent(numeric, mode, max)) : null;
      return [{ fach, area: area.trim(), index, label: meta.colLabels?.lzk?.[index] || `LZK ${index + 1}`, date: meta.colDates?.lzk?.[index] || '', mode, value,
        display: !participates ? 'Nicht teilgenommen' : numeric === null ? 'Noch nicht bewertet' : mode === 'points' ? `${numeric}/${max} P · ${value?.toLocaleString('de-AT', { maximumFractionDigits: 1 })} %` : mode === 'percent' ? `${numeric} %` : `Note ${raw}` }];
    });
  });
}

export function getClassLzkAreaSummary(app: AppState, subjects: string[], semester = '1') {
  return subjects.flatMap(subject => {
    const rows = app.schueler.filter(student => countsInClassAverage(app, student, subject)).flatMap(student => getLzkAreaRows(app, student.id, subject, semester));
    return [...new Set(rows.map(row => row.area))].map(area => {
      const assessed = rows.filter(row => row.area === area && row.value !== null);
      return { subject, area, count: assessed.length, mode: getAssessmentMode(app, subject), average: assessed.length ? assessed.reduce((sum, row) => sum + row.value!, 0) / assessed.length : null };
    });
  });
}

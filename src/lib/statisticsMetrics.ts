import type { AppState, Student } from '../types';
import { berechne, getAssessmentMode } from './GradeUtils';

export type PerformanceMode = 'grades' | 'percent' | 'points';
export type PerformanceScale = PerformanceMode | 'mixed' | 'none';

export interface PerformanceEntry {
  subject: string;
  rawValue: number;
  mode: PerformanceMode;
  normalizedPercent: number;
}

export function toNormalizedPerformancePercent(value: number, mode: PerformanceMode): number {
  if (!Number.isFinite(value)) return 0;
  if (mode === 'grades') {
    return Math.min(100, Math.max(0, (6 - value) * 20));
  }
  return Math.min(100, Math.max(0, value));
}

export function getStudentPerformanceEntries(
  app: AppState,
  studentId: string,
  subjects: string[],
  semester = '1',
): PerformanceEntry[] {
  return subjects.flatMap(subject => {
    const rawValue = berechne(app, studentId, subject, semester);
    if (rawValue === null || !Number.isFinite(rawValue)) return [];
    const mode = getAssessmentMode(app, subject);
    return [{
      subject,
      rawValue,
      mode,
      normalizedPercent: toNormalizedPerformancePercent(rawValue, mode),
    }];
  });
}

export function getStudentPerformanceSummary(
  app: AppState,
  studentId: string,
  subjects: string[],
  semester = '1',
) {
  const entries = getStudentPerformanceEntries(app, studentId, subjects, semester);
  const normalizedAverage = entries.length
    ? entries.reduce((sum, entry) => sum + entry.normalizedPercent, 0) / entries.length
    : null;
  const gradeEntries = entries.filter(entry => entry.mode === 'grades');
  const gradeAverage = gradeEntries.length
    ? gradeEntries.reduce((sum, entry) => sum + entry.rawValue, 0) / gradeEntries.length
    : null;

  return {
    entries,
    normalizedAverage,
    gradeAverage,
    hasData: entries.length > 0,
  };
}

export function getClassPerformanceStats(
  app: AppState,
  students: Student[],
  subjects: string[],
  semester = '1',
) {
  const entries = students.flatMap(student =>
    getStudentPerformanceEntries(app, student.id, subjects, semester)
  );
  const modes = new Set(entries.map(entry => entry.mode));
  const scale: PerformanceScale =
    entries.length === 0 ? 'none' :
    modes.size === 1 ? entries[0].mode :
    'mixed';

  const normalizedAverage = entries.length
    ? entries.reduce((sum, entry) => sum + entry.normalizedPercent, 0) / entries.length
    : null;

  const rawAverage = scale !== 'mixed' && scale !== 'none'
    ? entries.reduce((sum, entry) => sum + entry.rawValue, 0) / entries.length
    : null;

  const distribution =
    scale === 'grades'
      ? [1, 2, 3, 4, 5].map(grade => ({
          name: String(grade),
          count: entries.filter(entry => Math.round(entry.rawValue) === grade).length,
        }))
      : [
          { name: '0–19%', min: 0, max: 20 },
          { name: '20–39%', min: 20, max: 40 },
          { name: '40–59%', min: 40, max: 60 },
          { name: '60–79%', min: 60, max: 80 },
          { name: '80–100%', min: 80, max: 101 },
        ].map(bucket => ({
          name: bucket.name,
          count: entries.filter(entry =>
            entry.normalizedPercent >= bucket.min && entry.normalizedPercent < bucket.max
          ).length,
        }));

  const valuesForSpread = scale === 'grades'
    ? entries.map(entry => entry.rawValue)
    : entries.map(entry => entry.normalizedPercent);
  const meanForSpread = valuesForSpread.length
    ? valuesForSpread.reduce((sum, value) => sum + value, 0) / valuesForSpread.length
    : 0;
  const variance = valuesForSpread.length > 1
    ? valuesForSpread.reduce((sum, value) => sum + Math.pow(value - meanForSpread, 2), 0) / valuesForSpread.length
    : 0;

  const attentionCount = scale === 'grades'
    ? entries.filter(entry => Math.round(entry.rawValue) === 5).length
    : entries.filter(entry => entry.normalizedPercent < 40).length;

  return {
    entries,
    scale,
    totalCount: entries.length,
    normalizedAverage,
    rawAverage,
    distribution,
    variance,
    stdDev: Math.sqrt(variance),
    attentionCount,
    averageLabel:
      entries.length === 0
        ? '–'
        : scale === 'grades'
          ? rawAverage!.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : `${normalizedAverage!.toLocaleString('de-AT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`,
    averageDescriptor:
      scale === 'grades' ? 'Notenschnitt' :
      scale === 'percent' ? 'Prozentdurchschnitt' :
      scale === 'points' ? 'Leistungsstand (aus Punkten normalisiert)' :
      scale === 'mixed' ? 'Leistungsindex (Skalen normalisiert)' :
      'Keine Leistungsdaten',
    distributionDescriptor:
      scale === 'grades' ? 'Notenverteilung 1–5' : 'Verteilung des Leistungsindex',
    attentionDescriptor:
      scale === 'grades' ? 'Note 5' : 'unter 40 % Leistungsindex',
  };
}

export function getSubjectPerformanceAverages(
  app: AppState,
  students: Student[],
  subjects: string[],
  semester = '1',
) {
  return subjects.flatMap(subject => {
    const mode = getAssessmentMode(app, subject);
    const values = students
      .map(student => berechne(app, student.id, subject, semester))
      .filter((value): value is number => value !== null && Number.isFinite(value));
    if (values.length === 0) return [];

    const rawAverage = values.reduce((sum, value) => sum + value, 0) / values.length;
    const normalizedAverage = values
      .map(value => toNormalizedPerformancePercent(value, mode))
      .reduce((sum, value) => sum + value, 0) / values.length;

    return [{ subject, mode, rawAverage, normalizedAverage, count: values.length }];
  });
}

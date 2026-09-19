import type { AppState, AssessmentMode } from '../types';
import { getAssessmentMode, isAssessmentValueMissing } from './GradeUtils';

export type KelAssessmentType = 'sa' | 'lzk' | 'wp' | 'aufgaben';
export interface KelSelectedAssessment {
  id: string;
  fach: string;
  typ: KelAssessmentType;
  index: number;
  semester: '1' | '2';
  titel: string;
  datum: string;
  ergebnis: string;
  mode: AssessmentMode;
}

const ASSESSMENT_TYPES: { key: KelAssessmentType; label: string; metaKey: string }[] = [
  { key: 'sa', label: 'Schularbeit', metaKey: 'sa' },
  { key: 'lzk', label: 'Lernzielkontrolle', metaKey: 'lzk' },
  { key: 'wp', label: 'Wochenplan', metaKey: 'wp' },
  { key: 'aufgaben', label: 'Sonstige Leistung', metaKey: 'obj' },
];

function resultText(value: number | string, mode: AssessmentMode, configuredMax: unknown): string {
  const numberText = String(value);
  if (mode === 'grades') return 'Note ' + numberText;
  if (mode === 'percent') return numberText + ' %';
  return numberText + (
    typeof configuredMax === 'number' && Number.isFinite(configuredMax) && configuredMax > 0
      ? ' von ' + configuredMax + ' Punkten'
      : ' Punkte'
  );
}

/** Read-only KEL selection of actual, individually entered subject assessments.
 * IDs contain the underlying value and metadata: edited/deleted/replaced marks
 * cannot silently inherit authorization from an older selected assessment.
 */
export function getKelGradebookAssessments(
  app: AppState,
  studentId: string,
  semester: '1' | '2',
  allowedSubjects: readonly string[],
): KelSelectedAssessment[] {
  if (!app.schueler?.some(student => student.id === studentId)) return [];
  const studentData = app.noten?.[studentId] || {};
  const uniqueSubjects = [...new Set(allowedSubjects)].filter(fach => typeof fach === 'string' && fach.trim());
  const items: KelSelectedAssessment[] = [];
  for (const fach of uniqueSubjects) {
    const record = studentData[fach]?.[semester];
    if (!record) continue;
    const mode = getAssessmentMode(app, fach);
    const meta = app.notenMeta?.[fach];
    for (const { key, label, metaKey } of ASSESSMENT_TYPES) {
      const entries = record[key];
      if (!Array.isArray(entries)) continue;
      entries.forEach((raw: number | string | null, index: number) => {
        if (isAssessmentValueMissing(raw) || raw === null || typeof raw === 'undefined') return;
        if (typeof raw === 'number' && !Number.isFinite(raw)) return;
        if (typeof raw !== 'number' && typeof raw !== 'string') return;
        const cleanRaw = String(raw).trim();
        // Missing markers (f/e/x/–), free text and malformed values are NOT marks.
        const validValue = mode === 'grades'
          ? /^(?:[1-5](?:[+-])?)$/.test(cleanRaw)
          : /^(?:\d+(?:[.,]\d+)?)$/.test(cleanRaw);
        if (!validValue) return;
        const numeric = Number(cleanRaw.replace(',', '.'));
        if ((mode === 'percent' && numeric > 100) || numeric < 0) return;
        const customTitle = meta?.colLabels?.[metaKey]?.[index];
        const titel = typeof customTitle === 'string' && customTitle.trim()
          ? customTitle.trim() : label + ' ' + (index + 1);
        const rawDate = meta?.colDates?.[metaKey]?.[index];
        const datum = typeof rawDate === 'string' ? rawDate : '';
        const maxPoints = meta?.maxPoints?.[metaKey]?.[index];
        const ergebnis = resultText(raw as number | string, mode, maxPoints);
        const id = JSON.stringify([semester, fach, key, index, cleanRaw, titel, datum, maxPoints ?? null, mode]);
        items.push({ id, fach, typ: key, index, semester, titel, datum, ergebnis, mode });
      });
    }
  }
  return items;
}

export function pickKelAssessments(
  available: readonly KelSelectedAssessment[],
  selectedIds: readonly string[],
): KelSelectedAssessment[] {
  const selected = new Set(selectedIds);
  return available.filter(item => selected.has(item.id));
}

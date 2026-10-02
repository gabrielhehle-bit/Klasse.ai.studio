import type { AppState, AssessmentMode } from '../types';
import { getAssessmentMode, getMaxPoints, parseAssessmentInput } from './GradeUtils';

export type DossierAssessmentCategory = 'sa' | 'lzk' | 'wp' | 'aufgaben';

export interface DossierAssessmentWriteRequest {
  studentId: string;
  fach: string;
  semester: '1' | '2';
  category: DossierAssessmentCategory;
  colIndex: number;
  label: string;
  date: string;
  note: string;
  grade?: string;
  score?: string;
  maxScore?: string;
  percent?: string;
}

const metaCategory = (category: DossierAssessmentCategory) => category === 'aufgaben' ? 'obj' : category;

function assessmentInputForMode(request: DossierAssessmentWriteRequest, mode: AssessmentMode) {
  if (mode === 'points') return request.score ?? '';
  if (mode === 'percent') return request.percent ?? '';
  return request.grade ?? '';
}

/**
 * Writes dossier assessment edits in the same primitive cell format used by the
 * gradebook. Presentation metadata stays in notenMeta so both views can edit
 * the same assessment without producing object-valued grade cells.
 */
export function writeDossierAssessment(state: AppState, request: DossierAssessmentWriteRequest): AppState {
  if (!state.schueler.some(student => student.id === request.studentId) || request.colIndex < 0) return state;

  const mode = getAssessmentMode(state, request.fach);
  const currentMax = getMaxPoints(state, request.fach, request.category, request.colIndex);
  const requestedMax = Number(String(request.maxScore ?? '').replace(',', '.'));
  const maxPoints = mode === 'points' && Number.isFinite(requestedMax) && requestedMax > 0 ? requestedMax : currentMax;
  const parsed = parseAssessmentInput(assessmentInputForMode(request, mode), mode, maxPoints);
  if (!parsed.valid) return state;

  const studentGrades = state.noten?.[request.studentId] || {};
  const subjectGrades = studentGrades[request.fach] || {};
  const previousSemester = (subjectGrades as any)[request.semester] || {};
  const semesterData: any = {
    sa: [],
    lzk: [],
    wp: [],
    aufgaben: [],
    hue: 0,
    hueAnm: [],
    ...previousSemester,
  };
  const list = Array.isArray(semesterData[request.category]) ? [...semesterData[request.category]] : [];
  list[request.colIndex] = parsed.value;
  semesterData[request.category] = list;

  const noten = {
    ...(state.noten || {}),
    [request.studentId]: {
      ...studentGrades,
      [request.fach]: {
        ...subjectGrades,
        [request.semester]: semesterData,
      },
    },
  };

  const subjectMeta: any = { ...(state.notenMeta?.[request.fach] || {}) };
  const colLabels = { ...(subjectMeta.colLabels || {}) };
  const colDates = { ...(subjectMeta.colDates || {}) };
  const colNotes = { ...(subjectMeta.colNotes || {}) };
  colLabels[request.category] = [...(colLabels[request.category] || [])];
  colDates[request.category] = [...(colDates[request.category] || [])];
  colNotes[request.category] = [...(colNotes[request.category] || [])];
  colLabels[request.category][request.colIndex] = request.label.trim();
  colDates[request.category][request.colIndex] = request.date;
  colNotes[request.category][request.colIndex] = request.note.trim();
  subjectMeta.colLabels = colLabels;
  subjectMeta.colDates = colDates;
  subjectMeta.colNotes = colNotes;

  if (mode === 'points') {
    const maxPointsMeta = { ...(subjectMeta.maxPoints || {}) };
    const key = metaCategory(request.category);
    maxPointsMeta[key] = [...(maxPointsMeta[key] || [])];
    maxPointsMeta[key][request.colIndex] = maxPoints;
    subjectMeta.maxPoints = maxPointsMeta;
  }

  return {
    ...state,
    noten,
    notenMeta: {
      ...(state.notenMeta || {}),
      [request.fach]: subjectMeta,
    },
  };
}

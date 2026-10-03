import type { AppState, AssessmentMode } from '../types';
import { getAssessmentMode, getMaxPoints, parseAssessmentInput } from './GradeUtils';

export type DossierAssessmentCategory = 'sa' | 'lzk' | 'wp' | 'aufgaben';

export interface DossierAssessmentWriteRequest {
  studentId: string;
  fach: string;
  semester: '1' | '2';
  category: DossierAssessmentCategory;
  colIndex: number;
  originalCategory?: DossierAssessmentCategory;
  originalColIndex?: number;
  label: string;
  date: string;
  note: string;
  grade?: string;
  score?: string;
  maxScore?: string;
  percent?: string;
}

export interface DossierAssessmentClearRequest {
  studentId: string;
  fach: string;
  semester: '1' | '2';
  category: DossierAssessmentCategory;
  colIndex: number;
}

const metaCategory = (category: DossierAssessmentCategory) => category === 'aufgaben' ? 'obj' : category;

function assessmentInputForMode(request: DossierAssessmentWriteRequest, mode: AssessmentMode) {
  if (mode === 'points') return request.score ?? '';
  if (mode === 'percent') return request.percent ?? '';
  return request.grade ?? '';
}

function isEmptyAssessmentCell(value: unknown) {
  return value === null || value === undefined || value === '';
}

function firstAvailableAssessmentIndex(list: unknown[]) {
  const reusableIndex = list.findIndex(isEmptyAssessmentCell);
  return reusableIndex >= 0 ? reusableIndex : list.length;
}

function cloneMetaList(container: Record<string, any>, key: string) {
  container[key] = [...(container[key] || [])];
  return container[key] as any[];
}

/**
 * Clears one student's value for a class-wide assessment. Column metadata such
 * as label, date, comment and max points belongs to the shared gradebook column
 * and must stay intact for the other students.
 */
export function clearDossierAssessmentForStudent(state: AppState, request: DossierAssessmentClearRequest): AppState {
  if (request.colIndex < 0 || !state.schueler.some(student => student.id === request.studentId)) return state;

  const studentGrades = state.noten?.[request.studentId];
  const subjectGrades = studentGrades?.[request.fach];
  const semesterData = (subjectGrades as any)?.[request.semester];
  if (!studentGrades || !subjectGrades || !semesterData) return state;

  const currentList = (semesterData as any)[request.category];
  if (!Array.isArray(currentList) || request.colIndex >= currentList.length || isEmptyAssessmentCell(currentList[request.colIndex])) {
    return state;
  }

  const nextList = [...currentList];
  nextList[request.colIndex] = null;

  return {
    ...state,
    noten: {
      ...(state.noten || {}),
      [request.studentId]: {
        ...studentGrades,
        [request.fach]: {
          ...subjectGrades,
          [request.semester]: {
            ...semesterData,
            [request.category]: nextList,
          },
        },
      },
    },
  };
}

/**
 * Writes dossier assessment edits in the same primitive cell format used by the
 * gradebook. Presentation metadata stays in notenMeta so both views can edit
 * the same assessment without producing object-valued grade cells.
 *
 * If an existing assessment changes category, it is moved instead of copied:
 * the source cell and its metadata are cleared and the destination uses the
 * first free slot so an existing assessment can never be overwritten.
 */
export function writeDossierAssessment(state: AppState, request: DossierAssessmentWriteRequest): AppState {
  const originalCategory = request.originalCategory ?? request.category;
  const originalColIndex = request.originalColIndex ?? request.colIndex;
  if (
    !state.schueler.some(student => student.id === request.studentId) ||
    request.colIndex < 0 ||
    originalColIndex < 0
  ) return state;

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

  const isCategoryMove = originalCategory !== request.category;
  const existingTargetList = Array.isArray(semesterData[request.category]) ? [...semesterData[request.category]] : [];
  const destinationIndex = isCategoryMove
    ? firstAvailableAssessmentIndex(existingTargetList)
    : request.colIndex;

  const mode = getAssessmentMode(state, request.fach);
  const currentMax = isCategoryMove
    ? getMaxPoints(state, request.fach, originalCategory, originalColIndex)
    : getMaxPoints(state, request.fach, request.category, destinationIndex);
  const requestedMax = Number(String(request.maxScore ?? '').replace(',', '.'));
  const maxPoints = mode === 'points' && Number.isFinite(requestedMax) && requestedMax > 0 ? requestedMax : currentMax;
  const parsed = parseAssessmentInput(assessmentInputForMode(request, mode), mode, maxPoints);
  if (!parsed.valid) return state;

  if (isCategoryMove) {
    const sourceList = Array.isArray(semesterData[originalCategory]) ? [...semesterData[originalCategory]] : [];
    sourceList[originalColIndex] = null;
    semesterData[originalCategory] = sourceList;
  }

  const targetList = Array.isArray(semesterData[request.category]) ? [...semesterData[request.category]] : [];
  targetList[destinationIndex] = parsed.value;
  semesterData[request.category] = targetList;

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

  if (isCategoryMove) {
    cloneMetaList(colLabels, originalCategory)[originalColIndex] = null;
    cloneMetaList(colDates, originalCategory)[originalColIndex] = null;
    cloneMetaList(colNotes, originalCategory)[originalColIndex] = null;
  }

  cloneMetaList(colLabels, request.category)[destinationIndex] = request.label.trim();
  cloneMetaList(colDates, request.category)[destinationIndex] = request.date;
  cloneMetaList(colNotes, request.category)[destinationIndex] = request.note.trim();
  subjectMeta.colLabels = colLabels;
  subjectMeta.colDates = colDates;
  subjectMeta.colNotes = colNotes;

  const hasMaxPointsMeta = Boolean(subjectMeta.maxPoints);
  const maxPointsMeta = { ...(subjectMeta.maxPoints || {}) };
  if (isCategoryMove && (mode === 'points' || hasMaxPointsMeta)) {
    const sourceKey = metaCategory(originalCategory);
    cloneMetaList(maxPointsMeta, sourceKey)[originalColIndex] = null;
  }
  if (mode === 'points') {
    const destinationKey = metaCategory(request.category);
    cloneMetaList(maxPointsMeta, destinationKey)[destinationIndex] = maxPoints;
  }
  if (mode === 'points' || hasMaxPointsMeta) {
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

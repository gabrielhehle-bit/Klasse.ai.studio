import type { AppState, AssessmentMode } from '../types';
import { getAssessmentItemMode, getMaxPoints, parseAssessmentInput } from './GradeUtils';

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
  area?: string;
  mode?: AssessmentMode;
}

export interface DossierAssessmentClearRequest {
  studentId: string;
  fach: string;
  semester: '1' | '2';
  category: DossierAssessmentCategory;
  colIndex: number;
}

const metaCategory = (category: DossierAssessmentCategory) => category === 'aufgaben' ? 'obj' : category;

/** Shared column metadata and students' grades in both semesters reserve indices.
 * Never allocate a new dossier entry inside another pupil's class-wide column.
 * Ordinary gradebook placeholder counts do not reserve real column indices.
 */
export function nextDossierAssessmentColumnIndex(state: AppState, fach: string, category: DossierAssessmentCategory): number {
  const meta = (state.notenMeta?.[fach] || {}) as Record<string, any>;
  const aliases = category === 'aufgaben' ? ['obj', 'aufgaben'] : [category];
  const end = (value: unknown): number => {
    if (Array.isArray(value)) return value.length;
    if (!value || typeof value !== 'object') return 0;
    return Object.keys(value).reduce((max, key) => {
      const index = Number(key);
      return Number.isInteger(index) && index >= 0 ? Math.max(max, index + 1) : max;
    }, 0);
  };
  const metadataEnds = ['colLabels', 'colDates', 'colNotes', 'colAreas', 'maxPoints', 'itemModes']
    .flatMap(field => aliases.map(key => end(meta[field]?.[key])));
  const gradeEnds = Object.values(state.noten || {}).flatMap(studentGrades =>
    (['1', '2'] as const).map(semester =>
      end((studentGrades?.[fach]?.[semester] as Record<string, any> | undefined)?.[category])
    )
  );
  return Math.max(0, ...metadataEnds, ...gradeEnds);
}

function assessmentInputForMode(request: DossierAssessmentWriteRequest, mode: AssessmentMode) {
  if (mode === 'points') return request.score ?? '';
  if (mode === 'percent') return request.percent ?? '';
  return request.grade ?? '';
}

function isEmptyAssessmentCell(value: unknown) {
  return value === null || value === undefined || value === '';
}

function cloneMetaList(container: Record<string, any>, key: string): Record<number, any> {
  const existing = container[key];
  // Gradebook stores numeric-keyed column metadata as objects, while older
  // dossiers may use arrays. Preserve the original representation so a
  // dossier edit never turns sparse object metadata into JSON arrays.
  container[key] = Array.isArray(existing)
    ? [...existing]
    : existing && typeof existing === 'object'
      ? { ...existing }
      : {};
  return container[key] as Record<number, any>;
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
  // A class-wide column can contain marks of other pupils, even when this
  // child's target slot is empty. Moving a test must create a new class slot.
  const destinationIndex = isCategoryMove
    ? nextDossierAssessmentColumnIndex(state, request.fach, request.category)
    : request.colIndex;

  const originalMode = getAssessmentItemMode(state, request.fach, originalCategory, originalColIndex);
  const mode = request.mode || originalMode;
  const existingOriginalValue = Array.isArray(semesterData[originalCategory])
    ? semesterData[originalCategory][originalColIndex] : undefined;
  if (existingOriginalValue !== undefined && existingOriginalValue !== null && existingOriginalValue !== '' &&
      mode !== originalMode) return state;
  const currentMax = isCategoryMove
    ? getMaxPoints(state, request.fach, originalCategory, originalColIndex)
    : getMaxPoints(state, request.fach, request.category, destinationIndex);
  const requestedMax = Number(String(request.maxScore ?? '').replace(',', '.'));
  const maxPoints = mode === 'points' && Number.isFinite(requestedMax) && requestedMax > 0 ? requestedMax : currentMax;
  // The dossier does not silently change a shared points denominator.
  if (!isCategoryMove && mode === 'points' && maxPoints !== currentMax) {
    const anySaved = Object.values(state.noten || {}).some(child =>
      (['1', '2'] as const).some(period => {
        const value = child?.[request.fach]?.[period]?.[request.category]?.[destinationIndex];
        return value !== undefined && value !== null && value !== '';
      }));
    if (anySaved) return state;
  }
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

  const sourceNeededByAnotherRecord = isCategoryMove && Object.entries(state.noten || {}).some(([id, grades]) =>
    (['1', '2'] as const).some(period => {
      if (id === request.studentId && period === request.semester) return false;
      const value = grades?.[request.fach]?.[period]?.[originalCategory]?.[originalColIndex];
      return value !== undefined && value !== null && value !== '';
    }));
  if (isCategoryMove && !sourceNeededByAnotherRecord) {
    cloneMetaList(colLabels, metaCategory(originalCategory))[originalColIndex] = null;
    cloneMetaList(colDates, metaCategory(originalCategory))[originalColIndex] = null;
    cloneMetaList(colNotes, metaCategory(originalCategory))[originalColIndex] = null;
  }

  const destinationMetaKey = metaCategory(request.category);
  cloneMetaList(colLabels, destinationMetaKey)[destinationIndex] = request.label.trim();
  cloneMetaList(colDates, destinationMetaKey)[destinationIndex] = request.date;
  cloneMetaList(colNotes, destinationMetaKey)[destinationIndex] = request.note.trim();
  subjectMeta.colLabels = colLabels;
  subjectMeta.colDates = colDates;
  subjectMeta.colNotes = colNotes;

  const hasMaxPointsMeta = Boolean(subjectMeta.maxPoints);
  const maxPointsMeta = { ...(subjectMeta.maxPoints || {}) };
  if (isCategoryMove && !sourceNeededByAnotherRecord && (mode === 'points' || hasMaxPointsMeta)) {
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

  const areaKey = metaCategory(request.category);
  const itemModes = { ...(subjectMeta.itemModes || {}) };
  const currentItemModes = { ...(itemModes[areaKey] || {}) };
  currentItemModes[destinationIndex] = mode;
  itemModes[areaKey] = currentItemModes;
  subjectMeta.itemModes = itemModes;

  if (request.area !== undefined) {
    const colAreas = { ...(subjectMeta.colAreas || {}) };
    colAreas[areaKey] = { ...(colAreas[areaKey] || {}), [destinationIndex]: request.area.trim() };
    subjectMeta.colAreas = colAreas;
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

import { DEFAULT_YEARLY_SUBJECTS } from '../constants';
import { resolveJahresplanSubjectId } from './planerExcelService';
import { yearPlanCellEntries, type YearPlanCell } from './yearlyPlanData';

export type WeeklyLessonForYearPlan = {
  fach?: string;
  thema?: string;
  type?: string;
  material?: string;
  schwerpunkte?: string[];
  erledigt?: boolean;
};

export type WeeklyToYearPlanResult = {
  plan: Record<number, Record<string, YearPlanCell>>;
  status: 'added' | 'occupied' | 'missing-topic' | 'missing-subject';
  subjectId?: string;
};

export function hasWeeklyPlanningDetails(lesson: any): boolean {
  if (!lesson || typeof lesson !== 'object') return false;
  return Boolean(
    String(lesson.thema || '').trim() ||
    String(lesson.material || '').trim() ||
    String(lesson.housework || '').trim() ||
    String(lesson.method || '').trim() ||
    String(lesson.reflexion || '').trim() ||
    (Array.isArray(lesson.materialIds) && lesson.materialIds.length > 0) ||
    lesson.halves?.enabled === true ||
    (lesson.type && lesson.type !== 'standard')
  );
}

export function isYearPlanCellFree(cell: YearPlanCell | undefined | null): boolean {
  if (!cell) return true;
  if (yearPlanCellEntries(cell).length > 0) return false;
  if (cell.type && cell.type !== 'standard') return false;
  return true;
}

export function addWeeklyLessonToEmptyYearPlan(input: {
  existingPlan: Record<number, Record<string, YearPlanCell>> | undefined;
  kw: number;
  lesson: WeeklyLessonForYearPlan;
  fallbackSubject?: string;
  availableSubjects?: { id: string; label: string }[];
}): WeeklyToYearPlanResult {
  const thema = String(input.lesson?.thema || '').trim();
  if (!thema) {
    return { plan: input.existingPlan || {}, status: 'missing-topic' };
  }

  const fach = String(input.lesson?.fach || input.fallbackSubject || '').trim();
  const subjects = input.availableSubjects?.length
    ? input.availableSubjects
    : DEFAULT_YEARLY_SUBJECTS;
  const subjectId = resolveJahresplanSubjectId(fach, subjects);
  if (!subjectId) {
    return { plan: input.existingPlan || {}, status: 'missing-subject' };
  }

  const currentCell = input.existingPlan?.[input.kw]?.[subjectId];
  if (!isYearPlanCellFree(currentCell)) {
    return { plan: input.existingPlan || {}, status: 'occupied', subjectId };
  }

  const next: Record<number, Record<string, YearPlanCell>> = {
    ...(input.existingPlan || {}),
    [input.kw]: {
      ...(input.existingPlan?.[input.kw] || {}),
      [subjectId]: {
        ...(currentCell || {}),
        thema,
        buch: String(input.lesson.material || '').trim(),
        type: input.lesson.type || 'standard',
        subCategory: input.lesson.schwerpunkte?.[0] || '',
        subCategories: Array.isArray(input.lesson.schwerpunkte) ? [...input.lesson.schwerpunkte] : [],
        items: [],
        completed: input.lesson.erledigt === true,
      },
    },
  };

  return { plan: next, status: 'added', subjectId };
}

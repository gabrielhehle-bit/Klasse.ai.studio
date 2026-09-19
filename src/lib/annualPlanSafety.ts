import { yearPlanCellEntries, type YearPlanCell } from './yearlyPlanData';

export type AnnualWeek = { kw: number; monday: Date };
export function occupiedYearPlanCell(cell: YearPlanCell | undefined | null): boolean {
  if (!cell || typeof cell !== 'object') return Boolean(cell);
  if (yearPlanCellEntries(cell).length) return true;
  // An empty topic can still hold an event, completion or imported custom data.
  return Object.entries(cell).some(([key, value]) =>
    key !== 'thema' && key !== 'buch' && key !== 'type' && key !== 'subCategory'
    && key !== 'subCategories' && key !== 'items' && key !== 'completed'
      ? value !== undefined && value !== null && value !== ''
      : key === 'type' ? Boolean(value && value !== 'standard')
      : key === 'completed' ? value === true
      : key === 'items' || key === 'subCategories' ? Array.isArray(value) && value.length > 0
      : typeof value === 'string' && value.trim().length > 0
  );
}

/** Preview/guard multi-week writes before changing any stored entry. */
export function plannedYearWeeks(
  weeks: AnnualWeek[], startingKw: number, requested: number,
  isTeachingWeek: (week: AnnualWeek) => boolean,
): number[] {
  const start = weeks.findIndex(week => week.kw === startingKw);
  if (start < 0) return [];
  const result: number[] = [];
  for (let i = start; i < weeks.length && result.length < requested; i++) {
    // Always respect the explicitly clicked start week, including school-start labels.
    if (i === start || isTeachingWeek(weeks[i])) result.push(weeks[i].kw);
  }
  return result;
}

export function conflictingYearWeeks(
  plan: Record<number, Record<string, YearPlanCell>>,
  targetKws: number[],
  subjectId: string,
  ownEditingKw: number,
): number[] {
  return targetKws.filter(kw => kw !== ownEditingKw && occupiedYearPlanCell(plan[kw]?.[subjectId]));
}

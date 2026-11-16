/**
 * Entering the weekly planner from the planning overview must preserve the week
 * whose lesson data was just displayed. Other entry points keep opening today’s
 * calendar week, as before. This is a navigation decision, not a data change.
 */
export function resolveWeeklyPlanOpeningWeek(
  previousPage: string | null | undefined,
  selectedWeek: unknown,
  calendarWeek: number,
): number {
  if (previousPage !== 'planung') return calendarWeek;
  const parsed = typeof selectedWeek === 'number'
    ? selectedWeek
    : typeof selectedWeek === 'string' && /^\d{1,2}$/.test(selectedWeek.trim())
      ? Number(selectedWeek.trim())
      : Number.NaN;
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 53
    ? parsed
    : calendarWeek;
}

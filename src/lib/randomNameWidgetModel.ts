/**
 * Transient classroom random picker. Never manufactures pupils or writes attendance.
 * The caller supplies pupils from the currently active class and today's absence filter.
 */
export function eligibleRandomStudents<T extends { id: string }>(
  presentStudents: readonly T[],
  excludedIds: ReadonlySet<string> | readonly string[],
): T[] {
  const excluded = excludedIds instanceof Set ? excludedIds : new Set(excludedIds);
  return presentStudents.filter(student => !excluded.has(student.id));
}

export function pickRandomStudent<T extends { id: string }>(
  eligibleStudents: readonly T[],
  previousId: string | null,
  random: () => number = Math.random,
): T | null {
  if (eligibleStudents.length === 0) return null;
  const candidates = eligibleStudents.length > 1
    ? eligibleStudents.filter(student => student.id !== previousId)
    : [...eligibleStudents];
  const pool = candidates.length > 0 ? candidates : [...eligibleStudents];
  const value = random();
  const index = Number.isFinite(value)
    ? Math.min(pool.length - 1, Math.max(0, Math.floor(value * pool.length)))
    : 0;
  return pool[index] ?? null;
}

export function randomSelectionPage<T>(
  students: readonly T[],
  pageIndex: number,
  pageSize: number,
): { items: T[]; page: number; pageCount: number } {
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const pageCount = Math.max(1, Math.ceil(students.length / safePageSize));
  const page = Math.max(0, Math.min(pageCount - 1, Math.floor(pageIndex) || 0));
  return {
    items: students.slice(page * safePageSize, (page + 1) * safePageSize),
    page,
    pageCount,
  };
}

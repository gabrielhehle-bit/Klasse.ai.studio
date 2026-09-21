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


/** Configuration of new widget instances. Existing instance settings are independent. */
export interface RandomNameWidgetPreferences {
  selectionMode: 'independent' | 'round';
  soundEnabled: boolean;
  animationEnabled: boolean;
  startSize: 'compact' | 'standard' | 'large';
}

export function getRandomNameWidgetPreferences(settings: unknown): RandomNameWidgetPreferences {
  const value = settings && typeof settings === 'object' ? settings as Record<string, unknown> : {};
  return {
    selectionMode: value.selectionMode === 'round' ? 'round' : 'independent',
    soundEnabled: value.soundEnabled !== false,
    animationEnabled: value.animationEnabled !== false,
    startSize: value.startSize === 'compact' || value.startSize === 'standard' ? value.startSize : 'large',
  };
}

/** A fair round draws each eligible pupil at most once, then waits for an explicit reset.
 * The caller must pass the CURRENT eligible active-class roster; absent and excluded
 * pupils are removed from the round pool without changing attendance or student records.
 */
export function remainingRandomRoundStudents<T extends { id: string }>(
  eligible: readonly T[],
  drawnIds: readonly string[],
): T[] {
  const drawn = new Set(drawnIds);
  return eligible.filter(student => !drawn.has(student.id));
}

export function undoLastRandomPick(
  drawnIds: readonly string[],
): { drawnIds: string[]; previousSelectedId: string | null } {
  if (drawnIds.length === 0) return { drawnIds: [], previousSelectedId: null };
  return {
    drawnIds: drawnIds.slice(0, -1),
    previousSelectedId: drawnIds.length > 1 ? drawnIds[drawnIds.length - 2] : null,
  };
}

export type YearPlanEntry = {
  id?: string;
  thema: string;
  buch?: string;
  type?: 'standard' | 'sa' | 'test' | 'lzk' | 'event' | string;
  subCategory?: string;
  subCategories?: string[];
};

export type YearPlanCell = {
  thema?: string;
  buch?: string;
  type?: 'standard' | 'sa' | 'test' | 'lzk' | 'event' | string;
  subCategory?: string;
  subCategories?: string[];
  items?: YearPlanEntry[];
  completed?: boolean;
  [key: string]: any;
};

export type YearPlanImportLike = {
  kw: number;
  subjectId?: string;
  thema: string;
  buch?: string;
  type?: 'standard' | 'sa' | 'test' | 'lzk' | 'event' | string;
  completed?: boolean;
};

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function yearPlanCellEntries(cell: YearPlanCell | undefined | null): YearPlanEntry[] {
  if (!cell) return [];

  const entries: YearPlanEntry[] = [];
  if (clean(cell.thema) || clean(cell.buch)) {
    entries.push({
      thema: clean(cell.thema),
      buch: clean(cell.buch),
      type: cell.type || 'standard',
      subCategory: clean(cell.subCategory) || undefined,
      subCategories: Array.isArray(cell.subCategories) ? [...cell.subCategories] : undefined,
    });
  }

  for (const item of Array.isArray(cell.items) ? cell.items : []) {
    if (!item || (!clean(item.thema) && !clean(item.buch))) continue;
    entries.push({
      ...item,
      thema: clean(item.thema),
      buch: clean(item.buch),
      type: item.type || 'standard',
      subCategory: clean(item.subCategory) || undefined,
      subCategories: Array.isArray(item.subCategories) ? [...item.subCategories] : undefined,
    });
  }

  return entries;
}

function entryKey(entry: YearPlanEntry): string {
  return [
    clean(entry.thema).toLocaleLowerCase('de-AT'),
    clean(entry.buch).toLocaleLowerCase('de-AT'),
    String(entry.type || 'standard').toLocaleLowerCase('de-AT'),
  ].join('|');
}

export function yearPlanEntriesToCell(
  entries: YearPlanEntry[],
  completed = false,
  base: YearPlanCell = {},
): YearPlanCell {
  const usable = entries.filter(entry => clean(entry.thema) || clean(entry.buch));
  if (usable.length === 0) {
    return {
      ...base,
      thema: '',
      buch: '',
      type: base.type || 'standard',
      items: [],
      completed,
    };
  }

  if (usable.length === 1) {
    const only = usable[0];
    return {
      ...base,
      thema: clean(only.thema),
      buch: clean(only.buch),
      type: only.type || 'standard',
      subCategory: only.subCategory || '',
      subCategories: Array.isArray(only.subCategories) ? [...only.subCategories] : [],
      items: [],
      completed,
    };
  }

  return {
    ...base,
    thema: '',
    buch: '',
    type: base.type || 'standard',
    subCategory: '',
    subCategories: [],
    items: usable.map(entry => ({
      ...entry,
      id: entry.id || crypto.randomUUID(),
      thema: clean(entry.thema),
      buch: clean(entry.buch),
      type: entry.type || 'standard',
    })),
    completed,
  };
}

export function mergeYearPlanEntries(
  existing: YearPlanCell | undefined,
  imported: YearPlanEntry[],
  mode: 'merge' | 'overwrite',
  completed: boolean,
): YearPlanCell {
  if (mode === 'overwrite') {
    return yearPlanEntriesToCell(imported, completed, existing || {});
  }

  const current = yearPlanCellEntries(existing);
  const seen = new Set(current.map(entryKey));
  const merged = [...current];

  for (const entry of imported) {
    const key = entryKey(entry);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(entry);
  }

  return yearPlanEntriesToCell(
    merged,
    existing?.completed === true || completed,
    existing || {},
  );
}

export function applyYearPlanImportRows(
  existingPlan: Record<number, Record<string, YearPlanCell>>,
  rows: YearPlanImportLike[],
  mode: 'merge' | 'overwrite',
): Record<number, Record<string, YearPlanCell>> {
  const next: Record<number, Record<string, YearPlanCell>> =
    JSON.parse(JSON.stringify(existingPlan || {}));

  const groups = new Map<string, YearPlanImportLike[]>();
  for (const row of rows) {
    if (!row?.kw || !row.subjectId || (!clean(row.thema) && !clean(row.buch))) continue;
    const key = `${row.kw}::${row.subjectId}`;
    const group = groups.get(key) || [];
    group.push(row);
    groups.set(key, group);
  }

  for (const [key, group] of groups) {
    const [kwRaw, subjectId] = key.split('::');
    const kw = Number(kwRaw);
    if (!next[kw]) next[kw] = {};

    const entries: YearPlanEntry[] = group.map(row => ({
      thema: clean(row.thema),
      buch: clean(row.buch),
      type: row.type || 'standard',
    }));
    const completed = group.length > 0 && group.every(row => row.completed === true);

    next[kw][subjectId] = mergeYearPlanEntries(
      next[kw][subjectId],
      entries,
      mode,
      completed,
    );
  }

  return next;
}

export function yearPlanCellDisplayText(cell: YearPlanCell | undefined | null): string {
  return yearPlanCellEntries(cell)
    .map(entry => `${entry.thema}${entry.buch ? ` (${entry.buch})` : ''}`.trim())
    .filter(Boolean)
    .join(' · ');
}


export function shiftYearPlanSubjectForward(
  existingPlan: Record<number, Record<string, YearPlanCell>>,
  subjectId: string,
  startKw: number,
  orderedTeachingKws: number[],
): Record<number, Record<string, YearPlanCell>> {
  const next: Record<number, Record<string, YearPlanCell>> =
    JSON.parse(JSON.stringify(existingPlan || {}));
  const startIndex = orderedTeachingKws.indexOf(startKw);
  if (startIndex < 0) return next;

  const sourceKws = orderedTeachingKws
    .slice(startIndex)
    .filter(kw => next[kw]?.[subjectId])
    .reverse();

  for (const currentKw of sourceKws) {
    const index = orderedTeachingKws.indexOf(currentKw);
    const nextKw = orderedTeachingKws[index + 1];
    if (!nextKw) continue;

    if (!next[nextKw]) next[nextKw] = {};
    next[nextKw][subjectId] = next[currentKw][subjectId];
    delete next[currentKw][subjectId];
    if (Object.keys(next[currentKw]).length === 0) delete next[currentKw];
  }

  return next;
}

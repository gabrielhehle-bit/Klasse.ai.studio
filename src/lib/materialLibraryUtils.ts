import type { MaterialItem } from '../types';

export const MATERIAL_LIBRARY_MAX_MB = 5;
export const MATERIAL_FILE_MAX_MB = 3;
export const MATERIAL_FILE_WARNING_MB = 1;

const SAFE_MATERIAL_FILE_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export function calculateMaterialStorageSize(items: MaterialItem[]): number {
  const json = JSON.stringify(items);
  return new TextEncoder().encode(json).byteLength / (1024 * 1024);
}

export function upsertMaterial(items: MaterialItem[], item: MaterialItem): MaterialItem[] {
  const exists = items.some(existing => existing.id === item.id);
  return exists
    ? items.map(existing => existing.id === item.id ? item : existing)
    : [...items, item];
}

export function validateMaterialFile(file: Pick<File, 'size' | 'type'>): {
  error: string | null;
  warning: string | null;
} {
  if (!SAFE_MATERIAL_FILE_TYPES.has(file.type)) {
    return {
      error: 'Nicht unterstützter Dateityp. Erlaubt sind PDF, JPG, PNG, WebP und GIF.',
      warning: null,
    };
  }

  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > MATERIAL_FILE_MAX_MB) {
    return {
      error: `Datei zu groß (> ${MATERIAL_FILE_MAX_MB} MB). Bitte verkleinere die Datei.`,
      warning: null,
    };
  }

  return {
    error: null,
    warning: sizeMB > MATERIAL_FILE_WARNING_MB
      ? `Hinweis: Datei ist über ${MATERIAL_FILE_WARNING_MB} MB groß. Das kann den Speicher schnell füllen.`
      : null,
  };
}

export function normalizeMaterialExternalLink(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return undefined;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined;
  return parsed.toString();
}

export function sanitizeMaterialForType(item: MaterialItem): MaterialItem {
  const sanitized: MaterialItem = { ...item };

  if (sanitized.typ !== 'datei') {
    delete sanitized.dateiName;
    delete sanitized.dateiTyp;
    delete sanitized.dateiInhalt;
  }

  if (sanitized.typ !== 'link') {
    delete sanitized.externerLink;
  }

  return sanitized;
}

export function removeMaterialReferencesFromWeeklyPlan(
  wochenplanung: Record<number, any> | undefined,
  removedIds?: Iterable<string>,
): Record<number, any> {
  const removeAll = removedIds === undefined;
  const removed = removeAll ? null : new Set(removedIds);
  const source = wochenplanung || {};
  let changed = false;
  const next: Record<number, any> = { ...source };

  for (const [kw, weekValue] of Object.entries(source)) {
    if (!weekValue || typeof weekValue !== 'object') continue;
    let weekChanged = false;
    const week = { ...weekValue };

    for (const [day, dayValue] of Object.entries(weekValue as Record<string, any>)) {
      if (!dayValue || typeof dayValue !== 'object' || Array.isArray(dayValue)) continue;
      let dayChanged = false;
      const dayPlan = { ...dayValue };

      for (const [slotKey, slotValue] of Object.entries(dayValue as Record<string, any>)) {
        if (!slotValue || typeof slotValue !== 'object' || Array.isArray(slotValue)) continue;
        const materialIds = Array.isArray((slotValue as any).materialIds)
          ? (slotValue as any).materialIds.filter((id: unknown): id is string => typeof id === 'string')
          : null;
        if (!materialIds) continue;

        const filtered = removeAll
          ? []
          : materialIds.filter(id => !removed!.has(id));

        if (filtered.length !== materialIds.length) {
          dayPlan[slotKey] = { ...slotValue, materialIds: filtered };
          dayChanged = true;
        }
      }

      if (dayChanged) {
        week[day] = dayPlan;
        weekChanged = true;
      }
    }

    if (weekChanged) {
      next[Number(kw)] = week;
      changed = true;
    }
  }

  return changed ? next : source;
}


export function removeMaterialReferencesFromClasses<T extends { wochenplanung?: Record<number, any> }>(
  classes: T[] | undefined,
  removedIds?: Iterable<string>,
): T[] | undefined {
  if (!classes) return classes;

  let changed = false;
  const next = classes.map(classroom => {
    const cleaned = removeMaterialReferencesFromWeeklyPlan(classroom.wochenplanung, removedIds);
    if (cleaned === classroom.wochenplanung) return classroom;
    changed = true;
    return { ...classroom, wochenplanung: cleaned };
  });

  return changed ? next : classes;
}

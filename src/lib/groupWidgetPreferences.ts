import { getGroupName } from './groupsAlgorithm';

/** Settings for NEW group widgets; existing widget instances are never rewritten implicitly. */
export interface GroupWidgetPreferences {
  studentScope: 'present' | 'all';
  mode: 'size' | 'count';
  targetValue: number;
  startSize: 'compact' | 'standard' | 'large';
  namingStyle: 'numbered' | 'colors' | 'symbols' | 'animals';
}

export function getGroupWidgetPreferences(input: unknown): GroupWidgetPreferences {
  const value = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const mode = value.mode === 'count' ? 'count' : 'size';
  const raw = value.targetValue;
  const targetValue = typeof raw === 'number' && Number.isFinite(raw)
    ? Math.max(2, Math.min(30, Math.floor(raw))) : 4;
  return {
    studentScope: value.studentScope === 'all' ? 'all' : 'present',
    mode,
    targetValue,
    startSize: value.startSize === 'compact' || value.startSize === 'standard' ? value.startSize : 'large',
    namingStyle: value.namingStyle === 'colors' || value.namingStyle === 'symbols' || value.namingStyle === 'animals' ? value.namingStyle : 'numbered',
  };
}


/** Apply a picker preference to an already placed group widget, without
 * generating new random groups or destroying per-instance pair rules/history. */
export function applyGroupPreferenceToInstance<T extends Record<string, any>>(
  current: T,
  key: 'studentScope' | 'mode' | 'targetValue' | 'namingStyle',
  value: string | number,
): T {
  const next = { ...current, [key]: value };
  if (key === 'namingStyle' && Array.isArray(current.groups)) {
    next.groups = current.groups.map((group: Record<string, any>, index: number) => ({
      ...group, ...getGroupName(index, String(value)),
    }));
  }
  return next as T;
}

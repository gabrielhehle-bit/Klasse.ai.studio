import { getGroupName, type GeneratedGroup } from './groupsAlgorithm';
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


/** Preserve existing child allocations and private pair rules while applying one
 * picker choice to an already placed widget. Changing the naming style only
 * relabels groups; the other choices take effect on the NEXT user-triggered
 * "Gruppen bilden/Neu mischen", never automatically reshuffle children.
 */
export function applyGroupWidgetPreference(
  settings: Record<string, any> | undefined,
  key: keyof GroupWidgetPreferences,
  value: GroupWidgetPreferences[keyof GroupWidgetPreferences],
): Record<string, any> {
  const current = settings || {};
  if (key === 'startSize') return current; // layout geometry is not a live preference
  const next = {
    ...current,
    [key]: value,
    ...(key === 'mode' && current.mode !== value ? { targetValue: 4 } : {}),
  };
  if (key === 'namingStyle' && Array.isArray(current.groups)) {
    next.groups = (current.groups as GeneratedGroup[]).map((group, index) => ({
      ...group,
      ...getGroupName(index, String(value)),
    }));
  }
  return next;
}

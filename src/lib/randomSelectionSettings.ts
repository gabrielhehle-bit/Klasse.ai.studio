export const RANDOM_SELECTION_MODES = ['names', 'wheel', 'fair'] as const;
export type RandomSelectionMode = typeof RANDOM_SELECTION_MODES[number];
type Settings = Record<string, any>;

export function normalizeRandomSelectionMode(value: unknown): RandomSelectionMode {
  return RANDOM_SELECTION_MODES.includes(value as RandomSelectionMode) ? value as RandomSelectionMode : 'names';
}

export function getRandomSelectionSettings(settings: Settings, mode: RandomSelectionMode): Settings {
  if (mode !== 'names') {
    const value = settings[mode === 'wheel' ? 'selectionWheel' : 'selectionFair'];
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }
  const { randomSelectionMode, selectionWheel, selectionFair, ...names } = settings;
  return names;
}

export function updateRandomSelectionSettings(settings: Settings, mode: RandomSelectionMode, updates: Settings): Settings {
  if (mode === 'names') return { ...settings, ...getRandomSelectionSettings(updates, 'names') };
  const key = mode === 'wheel' ? 'selectionWheel' : 'selectionFair';
  return { ...settings, [key]: { ...getRandomSelectionSettings(settings, mode), ...updates } };
}

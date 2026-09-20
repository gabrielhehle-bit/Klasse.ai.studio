/**
 * Optional cockpit shortcut strip. Stored per class inside the existing
 * encrypted boardSettings. Its settings never mutate widget layouts.
 */
export const COCKPIT_QUICKBAR_ITEMS = [
  { id: 'timeline', label: 'Tagesplan' },
  { id: 'termine', label: 'Termine' },
  { id: 'clock', label: 'Uhr' },
  { id: 'timer', label: 'Timer' },
  { id: 'studentlist', label: 'Pluspunkte' },
  { id: 'dienste', label: 'Klassendienste' },
  { id: 'trafficlight', label: 'Arbeitsampel' },
] as const;

export type CockpitQuickbarId = (typeof COCKPIT_QUICKBAR_ITEMS)[number]['id'];
export type CockpitQuickbarSettings = { enabled: boolean; itemIds: CockpitQuickbarId[] };

const ALLOWED = new Set<string>(COCKPIT_QUICKBAR_ITEMS.map(item => item.id));
const DEFAULT_IDS: CockpitQuickbarId[] = COCKPIT_QUICKBAR_ITEMS.map(item => item.id);

export function normalizeCockpitQuickbarSettings(raw: unknown): CockpitQuickbarSettings {
  const input = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const ids = Array.isArray(input.itemIds)
    ? [...new Set(input.itemIds.filter((id): id is CockpitQuickbarId => typeof id === 'string' && ALLOWED.has(id)))]
    : [...DEFAULT_IDS];
  return { enabled: input.enabled === true, itemIds: ids };
}

export function toggleCockpitQuickbarItem(settings: CockpitQuickbarSettings, id: CockpitQuickbarId): CockpitQuickbarSettings {
  return { ...settings, itemIds: settings.itemIds.includes(id)
    ? settings.itemIds.filter(item => item !== id)
    : COCKPIT_QUICKBAR_ITEMS.map(item => item.id).filter(item => item === id || settings.itemIds.includes(item)) };
}

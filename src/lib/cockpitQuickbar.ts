import {
  COCKPIT_WIDGET_LIBRARY_ITEMS,
  splitCockpitWidgetLabel,
  type CockpitWidgetLibraryId,
} from './cockpitWidgetCatalog';
import { COCKPIT_REGULAR_WIDGETS, getCockpitTeachingSectionLabel, isCockpitWidgetAddable } from './cockpitRegularCatalog';

/**
 * Personal teaching-dock favorites stored per class inside the existing
 * encrypted boardSettings. Keep historical pins for the widget archive.
 */
export const COCKPIT_QUICKBAR_ITEMS = COCKPIT_WIDGET_LIBRARY_ITEMS.map(item => {
  const parsed = splitCockpitWidgetLabel(item.label);
  return {
    id: item.type,
    icon: parsed.icon,
    label: parsed.label,
    category: item.category,
  };
});
const quickbarItemsById = new Map(COCKPIT_QUICKBAR_ITEMS.map(item => [item.id, item]));
export const COCKPIT_QUICKBAR_ADDABLE_ITEMS = COCKPIT_REGULAR_WIDGETS.map(group => ({
  ...quickbarItemsById.get(group.id)!,
  label: group.label,
  section: getCockpitTeachingSectionLabel(group.id)!,
}));

export function getCockpitTeachingQuickbarIds(settings: CockpitQuickbarSettings): CockpitQuickbarId[] {
  return settings.itemIds.filter(isCockpitWidgetAddable);
}

export type CockpitQuickbarId = CockpitWidgetLibraryId;
export type CockpitQuickbarSettings = { enabled: boolean; itemIds: CockpitQuickbarId[] };

const ALLOWED = new Set<string>(COCKPIT_QUICKBAR_ITEMS.map(item => item.id));
const DEFAULT_IDS: CockpitQuickbarId[] = [
  'kidattendance', 'waldruhe', 'timeline', 'instruction', 'timer',
];

/** Previously disabled favorites remain disabled; new classrooms see useful defaults. */
export function normalizeCockpitQuickbarSettings(raw: unknown): CockpitQuickbarSettings {
  const input = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const ids = Array.isArray(input.itemIds)
    ? [...new Set(input.itemIds.filter((id): id is CockpitQuickbarId => typeof id === 'string' && ALLOWED.has(id)))]
    : [...DEFAULT_IDS];
  return { enabled: input.enabled === undefined ? true : input.enabled === true, itemIds: ids };
}

/** Safe add: selecting an already pinned widget never removes it. */
export function addCockpitQuickbarItem(
  settings: CockpitQuickbarSettings,
  id: CockpitQuickbarId,
): CockpitQuickbarSettings {
  if (!isCockpitWidgetAddable(id) || settings.itemIds.includes(id)) return settings;
  return { ...settings, itemIds: [...settings.itemIds, id] };
}

/** Removal is deliberately explicit and is only called from confirmed edit UI. */
export function removeCockpitQuickbarItem(
  settings: CockpitQuickbarSettings,
  id: CockpitQuickbarId,
): CockpitQuickbarSettings {
  if (!settings.itemIds.includes(id)) return settings;
  return { ...settings, itemIds: settings.itemIds.filter(item => item !== id) };
}

/** Legacy helper kept for existing internal callers/tests; user-facing add controls use add/remove explicitly. */
export function toggleCockpitQuickbarItem(
  settings: CockpitQuickbarSettings,
  id: CockpitQuickbarId,
): CockpitQuickbarSettings {
  return settings.itemIds.includes(id)
    ? removeCockpitQuickbarItem(settings, id)
    : addCockpitQuickbarItem(settings, id);
}

export function moveCockpitQuickbarItem(
  settings: CockpitQuickbarSettings,
  id: CockpitQuickbarId,
  direction: -1 | 1,
): CockpitQuickbarSettings {
  const visibleIds = getCockpitTeachingQuickbarIds(settings);
  const visibleIndex = visibleIds.indexOf(id);
  const adjacent = visibleIds[visibleIndex + direction];
  if (visibleIndex < 0 || !adjacent) return settings;
  const index = settings.itemIds.indexOf(id);
  const target = settings.itemIds.indexOf(adjacent);
  const itemIds = [...settings.itemIds];
  [itemIds[index], itemIds[target]] = [itemIds[target], itemIds[index]];
  return { ...settings, itemIds };
}

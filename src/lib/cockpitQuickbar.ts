import {
  COCKPIT_WIDGET_LIBRARY_ITEMS,
  splitCockpitWidgetLabel,
  type CockpitWidgetLibraryId,
} from './cockpitWidgetCatalog';

/**
 * Personal teaching-dock favorites stored per class inside the existing
 * encrypted boardSettings. The quick bar uses the full widget-library catalog:
 * every widget that can be opened from the library can also be pinned here.
 */
const QUICKBAR_OVERRIDES: Partial<Record<CockpitWidgetLibraryId, { icon: string; label: string }>> = {
  kidattendance: { icon: '🖐️', label: 'Ich bin da!' },
  classweeklyplan: { icon: '📋', label: 'Wochenplan' },
  timer: { icon: '⏱️', label: 'Timer' },
  wheel: { icon: '🎡', label: 'Glücksrad' },
  randomname: { icon: '🎯', label: 'Zufallsauswahl' },
  groups: { icon: '👥', label: 'Gruppen' },
  homework: { icon: '📚', label: 'Hausübungen' },
  starsreview: { icon: '⭐', label: 'Sterne' },
  timeline: { icon: '🗓️', label: 'Tagesplan' },
  clock: { icon: '🕒', label: 'Uhr' },
  dienste: { icon: '🧹', label: 'Klassendienste' },
  trafficlight: { icon: '🚦', label: 'Arbeitsampel' },
  instruction: { icon: '📝', label: 'Arbeitsauftrag' },
  image: { icon: '🖼️', label: 'Bild' },
  qrcode: { icon: '🔗', label: 'QR-Code' },
  pet: { icon: '🐾', label: 'Maskottchen' },
};

export const COCKPIT_QUICKBAR_ITEMS = COCKPIT_WIDGET_LIBRARY_ITEMS.map(item => {
  const parsed = splitCockpitWidgetLabel(item.label);
  const override = QUICKBAR_OVERRIDES[item.type];
  return {
    id: item.type,
    icon: override?.icon || parsed.icon,
    label: override?.label || parsed.label,
    category: item.category,
  };
});

export type CockpitQuickbarId = CockpitWidgetLibraryId;
export type CockpitQuickbarSettings = { enabled: boolean; itemIds: CockpitQuickbarId[] };

const ALLOWED = new Set<string>(COCKPIT_QUICKBAR_ITEMS.map(item => item.id));
const DEFAULT_IDS: CockpitQuickbarId[] = [
  'kidattendance', 'classweeklyplan', 'timer', 'wheel', 'randomname', 'groups',
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
  if (!ALLOWED.has(id) || settings.itemIds.includes(id)) return settings;
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
  const index = settings.itemIds.indexOf(id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= settings.itemIds.length) return settings;
  const itemIds = [...settings.itemIds];
  [itemIds[index], itemIds[target]] = [itemIds[target], itemIds[index]];
  return { ...settings, itemIds };
}

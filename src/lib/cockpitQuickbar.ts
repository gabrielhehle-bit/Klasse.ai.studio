/**
 * Personal teaching-dock favorites stored per class inside the existing
 * encrypted boardSettings. Never interprets favorites as a widget layout.
 * Obsolete IDs are filtered out during normalization.
 */
export const COCKPIT_QUICKBAR_ITEMS = [
  { id: 'kidattendance', icon: '🖐️', label: 'Ich bin da!' },
  { id: 'classweeklyplan', icon: '📋', label: 'Wochenplan' },
  { id: 'timer', icon: '⏱️', label: 'Timer' },
  { id: 'wheel', icon: '🎡', label: 'Glücksrad' },
  { id: 'randomname', icon: '🎯', label: 'Zufallsauswahl' },
  { id: 'groups', icon: '👥', label: 'Gruppen' },
  { id: 'homework', icon: '📚', label: 'Hausübungen' },
  { id: 'starsreview', icon: '⭐', label: 'Sterne' },
  { id: 'timeline', icon: '🗓️', label: 'Tagesplan' },
  { id: 'clock', icon: '🕒', label: 'Uhr' },
  { id: 'dienste', icon: '🧹', label: 'Klassendienste' },
  { id: 'trafficlight', icon: '🚦', label: 'Arbeitsampel' },
  { id: 'instruction', icon: '📝', label: 'Arbeitsauftrag' },
  { id: 'image', icon: '🖼️', label: 'Bild' },
  { id: 'qrcode', icon: '🔗', label: 'QR-Code' },
] as const;

export type CockpitQuickbarId = (typeof COCKPIT_QUICKBAR_ITEMS)[number]['id'];
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

/** Preserve the teacher's order when adding a new favorite. */
export function toggleCockpitQuickbarItem(settings: CockpitQuickbarSettings, id: CockpitQuickbarId): CockpitQuickbarSettings {
  if (!ALLOWED.has(id)) return settings;
  return { ...settings, itemIds: settings.itemIds.includes(id)
    ? settings.itemIds.filter(item => item !== id)
    : [...settings.itemIds, id] };
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

import { PLANNED_COCKPIT_WIDGETS } from '../components/cockpit/plannedCockpitCatalog';
import {
  COCKPIT_WIDGET_LIBRARY_ITEMS, getCockpitWidgetCanonicalDisplayLabel,
  getCockpitWidgetLibraryItem, matchesCockpitWidgetSearch, normalizeWidgetSearch,
  type CockpitWidgetLibraryId,
} from './cockpitWidgetCatalog';
import { TIME_TOOL_MODES, TIME_TOOL_LABELS, type TimeToolMode } from './timeToolsSettings';
import { RANDOM_SELECTION_MODES, RANDOM_SELECTION_LABELS, type RandomSelectionMode } from './randomSelectionSettings';

export type CockpitWidgetModeTarget =
  | { type: 'timer'; mode: TimeToolMode }
  | { type: 'randomname'; mode: RandomSelectionMode };
type WidgetModeSearchMatch = CockpitWidgetModeTarget & { label: string };

interface CockpitWidgetGroup {
  id: CockpitWidgetLibraryId;
  label: string;
  sources: readonly CockpitWidgetLibraryId[];
  openMode?: WidgetModeSearchMatch;
}

// Only the picker groups these entries. Saved widget IDs and settings stay intact.
export const COCKPIT_REGULAR_WIDGETS: readonly CockpitWidgetGroup[] = [
  ...PLANNED_COCKPIT_WIDGETS.map(group => ({
    ...group,
    label: group.id === 'groups' ? 'Gruppen & Zufall' : group.id === 'timer' ? 'Timer' : group.label,
    sources: group.id === 'vocabulary' ? [...group.sources, 'spellingdetective'] as const : group.sources,
  })),
  { id: 'homework', label: 'Hausübungen', sources: ['homework'] },
  { id: 'starsreview', label: 'Sterne der Woche', sources: ['starsreview'] },
  { id: 'dictionary', label: 'Bildwörterbuch', sources: ['dictionary'] },
  { id: 'waldruhe', label: getCockpitWidgetCanonicalDisplayLabel('waldruhe'), sources: ['waldruhe'] },
  { id: 'breathing', label: 'Atempause', sources: ['breathing'] },
];

const coreWidgetIds = ['kidattendance', 'waldruhe', 'timeline', 'instruction', 'timer', 'groups'] as const;
export const COCKPIT_CORE_WIDGETS = coreWidgetIds.map(id =>
  COCKPIT_REGULAR_WIDGETS.find(group => group.id === id)!,
);

const groupedTypes = new Set(COCKPIT_REGULAR_WIDGETS.flatMap(group => group.sources));
const allWidgetGroups: readonly CockpitWidgetGroup[] = [
  ...COCKPIT_REGULAR_WIDGETS,
  ...COCKPIT_WIDGET_LIBRARY_ITEMS
    .filter(item => !groupedTypes.has(item.type))
    .map(item => ({ id: item.type, label: getCockpitWidgetCanonicalDisplayLabel(item.type), sources: [item.type] })),
];

const timeAliases: Record<TimeToolMode, readonly string[]> = {
  timer: ['Countdown', 'Sanduhr'],
  stopwatch: ['Stopwatch', 'Stop Uhr'],
  clock: ['Uhr', 'Digitale Uhr'],
};
const selectionAliases: Record<RandomSelectionMode, readonly string[]> = {
  names: ['Zufälliges Kind', 'Namensziehung'],
  wheel: ['Glücks Rad', 'Drehrad'],
  fair: ['Fair Call', 'Faire Namensrunde'],
};
const searchableModes: readonly (WidgetModeSearchMatch & { terms: string[] })[] = [
  ...TIME_TOOL_MODES.map(mode => ({
    type: 'timer' as const, mode, label: TIME_TOOL_LABELS[mode],
    terms: [TIME_TOOL_LABELS[mode], ...timeAliases[mode]].map(normalizeWidgetSearch),
  })),
  ...RANDOM_SELECTION_MODES.map(mode => ({
    type: 'randomname' as const, mode, label: RANDOM_SELECTION_LABELS[mode],
    terms: [RANDOM_SELECTION_LABELS[mode], ...selectionAliases[mode]].map(normalizeWidgetSearch),
  })),
];

function getWidgetModeMatch(type: CockpitWidgetLibraryId, normalized: string): WidgetModeSearchMatch | undefined {
  const candidates = searchableModes.filter(mode => mode.type === type);
  const exact = candidates.find(mode => mode.terms.includes(normalized));
  const partial = normalized.length >= 3
    ? candidates.filter(mode => mode.terms.some(term => term.startsWith(normalized)))
    : [];
  const match = exact ?? (partial.length === 1 ? partial[0] : undefined);
  if (!match) return undefined;
  const { terms, ...target } = match;
  return target;
}

export function getRegularCockpitGroups(category = 'core', query = '') {
  if (query.trim()) {
    const normalized = normalizeWidgetSearch(query);
    return allWidgetGroups.flatMap(group => {
      const openMode = getWidgetModeMatch(group.id, normalized);
      if (openMode) return [{ ...group, openMode }];
      const matchesGroup = group.sources.some(type => {
        const item = getCockpitWidgetLibraryItem(type);
        return item && matchesCockpitWidgetSearch({ ...item, label: `${item.label} ${group.label}` }, query);
      });
      return matchesGroup ? [group] : [];
    });
  }
  if (category === 'core') return COCKPIT_CORE_WIDGETS;
  return allWidgetGroups.filter(group => getCockpitWidgetLibraryItem(group.id)?.category === category);
}

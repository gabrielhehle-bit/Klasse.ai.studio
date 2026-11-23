import { PLANNED_COCKPIT_WIDGETS } from '../components/cockpit/plannedCockpitCatalog';
import {
  COCKPIT_WIDGET_LIBRARY_ITEMS,
  getCockpitWidgetCanonicalDisplayLabel,
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

export const COCKPIT_TEACHING_WIDGET_SECTIONS = [
  { id: 'core', label: 'Kernwidgets', icon: '🧩', widgets: ['kidattendance', 'waldruhe', 'timeline', 'instruction', 'timer', 'groups'] },
  { id: 'classroom', label: 'Klassenalltag', icon: '🎒', widgets: ['tischcheck', 'classweeklyplan'] },
  { id: 'mathe', label: 'Mathe', icon: '🔢', widgets: ['zahlenraum', 'kopfrechnen', 'geometry'] },
  { id: 'deutsch', label: 'Deutsch', icon: '📖', widgets: ['vocabulary', 'wortsatzwerkstatt'] },
  { id: 'sachunterricht', label: 'Sachunterricht', icon: '🌍', widgets: ['compass', 'watercycle'] },
  { id: 'musik', label: 'Musik', icon: '🎵', widgets: ['sounds'] },
  { id: 'play', label: 'Spiele', icon: '🎲', widgets: ['dice'] },
] as const satisfies readonly { id: string; label: string; icon: string; widgets: readonly CockpitWidgetLibraryId[] }[];

const integratedWidgetIds = new Set<CockpitWidgetLibraryId>(['timer', 'zahlenraum', 'sounds']);

function makeWidgetGroup(id: CockpitWidgetLibraryId): CockpitWidgetGroup {
  const planned = PLANNED_COCKPIT_WIDGETS.find(group => group.id === id);
  return {
    id,
    label: id === 'groups' ? 'Gruppen & Zufall' : id === 'timer' ? 'Timer' : planned?.label ?? getCockpitWidgetCanonicalDisplayLabel(id),
    sources: id === 'groups' ? ['groups', 'randomname', 'wheel', 'faircall']
      : planned && integratedWidgetIds.has(id) ? planned.sources : [id],
  };
}

const teachingGroups = new Map<string, readonly CockpitWidgetGroup[]>(
  COCKPIT_TEACHING_WIDGET_SECTIONS.map(section => [section.id, section.widgets.map(makeWidgetGroup)]),
);
export const COCKPIT_CORE_WIDGETS = teachingGroups.get('core')!;
export const COCKPIT_REGULAR_WIDGETS = Array.from(teachingGroups.values()).flat();
const addableWidgetIds = new Set<string>(COCKPIT_REGULAR_WIDGETS.map(group => group.id));
const sectionsByWidgetId = new Map<string, string>(
  COCKPIT_TEACHING_WIDGET_SECTIONS.flatMap(section => section.widgets.map(id => [id, section.label] as const)),
);

export function getCockpitTeachingSectionLabel(type: string): string | undefined {
  return sectionsByWidgetId.get(type);
}
const groupsBySource = new Map<string, CockpitWidgetGroup>(
  COCKPIT_REGULAR_WIDGETS.flatMap(group => group.sources.map(type => [type, group] as const)),
);

export function isCockpitWidgetAddable(type: string): boolean {
  return addableWidgetIds.has(type);
}

export function isCockpitTeachingBoardWidget(type: string): boolean {
  // These tools are opened from the group card and the mascot control.
  return isCockpitWidgetAddable(type) || type === 'randomname' || type === 'pet';
}

export const COCKPIT_ARCHIVED_WIDGETS = COCKPIT_WIDGET_LIBRARY_ITEMS.filter(
  item => !isCockpitTeachingBoardWidget(item.type),
);

export function getCockpitGroupsForTypes(types: readonly string[]): CockpitWidgetGroup[] {
  const chosen = new Map<string, CockpitWidgetGroup>();
  for (const type of types) {
    const group = groupsBySource.get(type);
    if (group) chosen.set(group.id, group);
  }
  return [...chosen.values()];
}

const timeAliases: Record<TimeToolMode, readonly string[]> = {
  timer: ['Countdown', 'Sanduhr'],
  stopwatch: ['Stopwatch', 'Stop Uhr'],
  clock: ['Uhr', 'Digitale Uhr'],
};
const selectionAliases: Record<RandomSelectionMode, readonly string[]> = {
  names: ['Zufallsauswahl', 'Zufälliges Kind', 'Namensziehung'],
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
    return COCKPIT_REGULAR_WIDGETS.flatMap(group => {
      const openMode = getWidgetModeMatch(group.id === 'groups' ? 'randomname' : group.id, normalized);
      if (openMode) return [{ ...group, openMode }];
      const matchesGroup = group.sources.some(type => {
        const item = getCockpitWidgetLibraryItem(type);
        return item && matchesCockpitWidgetSearch({
          ...item,
          label: `${item.label} ${group.label} ${getCockpitTeachingSectionLabel(group.id) ?? ''}`,
        }, query);
      });
      return matchesGroup ? [group] : [];
    });
  }
  return teachingGroups.get(category) ?? [];
}

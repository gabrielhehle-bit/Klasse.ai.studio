import { PLANNED_COCKPIT_WIDGETS } from '../components/cockpit/plannedCockpitCatalog';
import {
  COCKPIT_WIDGET_LIBRARY_ITEMS, getCockpitWidgetCanonicalDisplayLabel,
  getCockpitWidgetLibraryItem, matchesCockpitWidgetSearch,
  type CockpitWidgetLibraryId,
} from './cockpitWidgetCatalog';

interface CockpitWidgetGroup {
  id: CockpitWidgetLibraryId;
  label: string;
  sources: readonly CockpitWidgetLibraryId[];
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

export function getRegularCockpitGroups(category = 'core', query = '') {
  if (query.trim()) {
    return allWidgetGroups.filter(group =>
      group.sources.some(type => {
        const item = getCockpitWidgetLibraryItem(type);
        return item && matchesCockpitWidgetSearch({ ...item, label: `${item.label} ${group.label}` }, query);
      }),
    );
  }
  if (category === 'core') return COCKPIT_CORE_WIDGETS;
  return allWidgetGroups.filter(group => getCockpitWidgetLibraryItem(group.id)?.category === category);
}

import { PLANNED_COCKPIT_WIDGETS } from '../components/cockpit/plannedCockpitCatalog';
import { COCKPIT_WIDGET_LIBRARY_ITEMS, matchesCockpitWidgetSearch } from './cockpitWidgetCatalog';

// Selection only: saved types, layouts and per-widget settings are not migrated.
export const COCKPIT_REGULAR_WIDGETS = [
  ...PLANNED_COCKPIT_WIDGETS.map(group => ({
    ...group,
    sources: group.id === 'vocabulary' ? [...group.sources, 'spellingdetective'] : [...group.sources],
  })),
  { id: 'homework', label: 'Hausübungen', sources: ['homework'] },
  { id: 'starsreview', label: 'Sterne der Woche', sources: ['starsreview'] },
  { id: 'dictionary', label: 'Bildwörterbuch', sources: ['dictionary'] },
  { id: 'breathing', label: 'Atempause', sources: ['breathing'] },
];

export function getRegularCockpitGroups(category = 'core', query = '') {
  return COCKPIT_REGULAR_WIDGETS.filter(group => {
    const primary = COCKPIT_WIDGET_LIBRARY_ITEMS.find(item => item.type === group.id);
    if (query.trim()) {
      return group.sources.some(type => {
        const item = COCKPIT_WIDGET_LIBRARY_ITEMS.find(candidate => candidate.type === type);
        return item && matchesCockpitWidgetSearch(item, query);
      });
    }
    return category === 'core' || primary?.category === category;
  });
}

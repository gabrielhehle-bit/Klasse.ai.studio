/** Defaults for NEW public child-week widgets, not private pupil records. */
export interface ClassroomWeeklyWidgetPreferences {
  taskCardsPerPage: 1 | 2;
  showMaterials: boolean;
  startSize: 'compact' | 'standard' | 'large';
}

export function getClassroomWeeklyWidgetPreferences(settings: unknown): ClassroomWeeklyWidgetPreferences {
  const value = settings && typeof settings === 'object' ? settings as Record<string, unknown> : {};
  return {
    taskCardsPerPage: value.taskCardsPerPage === 2 ? 2 : 1,
    showMaterials: value.showMaterials !== false,
    startSize: value.startSize === 'compact' || value.startSize === 'standard' ? value.startSize : 'large',
  };
}

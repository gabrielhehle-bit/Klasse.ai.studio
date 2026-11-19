import type { CockpitWidgetConfig } from '../types';
import { COCKPIT_AUTO_ARRANGE_DOCK_CLEARANCE_PX } from './cockpitAutoArrange';

export type CockpitWidgetGeometry = Pick<CockpitWidgetConfig, 'x' | 'y' | 'w' | 'h'>;
export type CockpitWidgetGeometryChange = {
  id: string;
  before: CockpitWidgetGeometry;
  after: CockpitWidgetGeometry;
};

type UntrustedGeometry = { [K in keyof CockpitWidgetGeometry]?: unknown };

const finite = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export function normalizeCockpitWidgetGeometry(source: UntrustedGeometry, anchor = false): CockpitWidgetGeometry {
  const width = finite(source.w, 25);
  const height = finite(source.h, 20);
  const w = width > 0 ? Math.min(100, width) : 25;
  const h = height > 0 ? Math.min(100, height) : 20;
  return {
    x: Math.max(0, Math.min(anchor ? 100 : 100 - w, finite(source.x, 50))),
    y: Math.max(0, Math.min(anchor ? 100 : 100 - h, finite(source.y, 50))),
    w,
    h,
  };
}

// On a smaller board, these teaching tools keep their lower controls above the
// dock. This is a display limit and is never written back to a saved layout.
const dockSafeTypes = new Set([
  'riddle', 'randomname', 'rhythm', 'soundmemory', 'guitartuner', 'tonetrainer',
  'animalvoice', 'challenge', 'secretagent', 'weightscale', 'reflexgame', 'clockpuzzle',
  'geometry', 'shapepuzzle', 'angledetective', 'estimationjar', 'divrobot', 'bodyparts',
  'compass', 'weekdays', 'trafficquiz', 'watercycle', 'constellation', 'planetarium',
  'flagquiz', 'geographyquiz', 'wastebin',
]);

export function getCockpitWidgetUsableHeight(type: string, boardHeight: number): number {
  return dockSafeTypes.has(type)
    ? boardHeight - Math.min(COCKPIT_AUTO_ARRANGE_DOCK_CLEARANCE_PX, boardHeight * 0.16)
    : boardHeight;
}

function geometryOf({ x, y, w, h }: CockpitWidgetGeometry): CockpitWidgetGeometry {
  return { x, y, w, h };
}

function sameGeometry(a: CockpitWidgetGeometry, b: CockpitWidgetGeometry): boolean {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

export function getCockpitGeometryChanges(
  before: readonly CockpitWidgetConfig[], after: readonly CockpitWidgetConfig[],
): CockpitWidgetGeometryChange[] {
  const previousById = new Map(before.map(widget => [widget.id, widget]));
  return after.flatMap(widget => {
    const old = previousById.get(widget.id);
    return old && !sameGeometry(old, widget)
      ? [{ id: widget.id, before: geometryOf(old), after: geometryOf(widget) }]
      : [];
  });
}

export function applyCockpitGeometryChanges(
  widgets: CockpitWidgetConfig[], changes: readonly CockpitWidgetGeometryChange[], direction: 'apply' | 'undo',
): CockpitWidgetConfig[] {
  if (!changes.length) return widgets;
  const byId = new Map(widgets.map(widget => [widget.id, widget]));
  const expected = direction === 'undo' ? 'after' : 'before';
  const target = direction === 'undo' ? 'before' : 'after';
  // An arrange is one action. Leave the entire layout alone if a later change
  // made any of the recorded rectangles stale.
  const available = changes.every(change => {
    const widget = byId.get(change.id);
    return widget && sameGeometry(widget, change[expected]);
  });
  if (!available) return widgets;
  const geometryById = new Map(changes.map(change => [change.id, change[target]]));
  return widgets.map(widget => {
    const geometry = geometryById.get(widget.id);
    return geometry ? { ...widget, ...geometry } : widget;
  });
}

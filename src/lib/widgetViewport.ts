/** Shared physical-space rules for the cockpit: no widget-type migrations. */
export type WidgetViewportDensity = 'tight' | 'compact' | 'comfortable';

export function getWidgetViewportDensity(width: number, height: number): WidgetViewportDensity {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 'comfortable'; // Do not prematurely shrink while a portal is mounting.
  }
  if (width < 345 || height < 255) return 'tight';
  if (width < 535 || height < 385) return 'compact';
  return 'comfortable';
}

/** No padding should consume the scarce teaching area on legacy scaled widgets.
 * Content scale itself remains unchanged for backwards-compatible layouts. */
export function getLegacyWidgetPadding(width: number, height: number): number {
  switch (getWidgetViewportDensity(width, height)) {
    case 'tight': return 3;
    case 'compact': return 6;
    default: return 10;
  }
}

/** The viewport must have a reachable content fallback even when an old widget
 * does not yet implement its own pagination. Native scrolling only activates
 * when content is genuinely larger than the available frame. */
export const WIDGET_VIEWPORT_OVERFLOW = 'auto' as const;

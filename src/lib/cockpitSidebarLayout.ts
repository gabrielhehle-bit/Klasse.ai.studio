/**
 * A sidebar is a viewport presentation preference, never a stored widget
 * rectangle. Keep the per-class width modest enough to leave working space.
 */
export const DEFAULT_COCKPIT_SIDEBAR_WIDTH = 320;
export const COMPACT_COCKPIT_SIDEBAR_WIDTH = 292;
export const LEGACY_COCKPIT_SIDEBAR_WIDTH = 420;
export const COCKPIT_SIDEBAR_DOCK_GAP = 6;

export type CockpitSidebarMode = 'hidden' | 'mini' | 'expanded';

export function clampCockpitSidebarWidth(raw: unknown): number {
  const width = typeof raw === 'number' && Number.isFinite(raw) ? raw : DEFAULT_COCKPIT_SIDEBAR_WIDTH;
  return Math.round(Math.max(292, Math.min(620, width)));
}


/**
 * Retain intentionally customized widths. Migrate only the former 420px default
 * so classes configured before the compact layout also regain board space.
 */
export function getCockpitSidebarPreferredWidth(raw: unknown): number {
  if (raw === LEGACY_COCKPIT_SIDEBAR_WIDTH) return DEFAULT_COCKPIT_SIDEBAR_WIDTH;
  return clampCockpitSidebarWidth(raw);
}

export function getCockpitSidebarReservedRightPx(
  mode: CockpitSidebarMode,
  expandedWidth: unknown,
): number {
  if (mode === 'hidden') return 0;
  const sidebarWidth = mode === 'mini'
    ? COMPACT_COCKPIT_SIDEBAR_WIDTH
    : clampCockpitSidebarWidth(expandedWidth);
  return sidebarWidth + COCKPIT_SIDEBAR_DOCK_GAP;
}

export function resizeCockpitSidebarWidth(startWidth: number, startX: number, currentX: number): number {
  return clampCockpitSidebarWidth(startWidth + startX - currentX);
}

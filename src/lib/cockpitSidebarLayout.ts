/**
 * A sidebar is a viewport presentation preference, never a stored widget
 * rectangle. Keep the per-class width modest enough to leave working space.
 */
export const DEFAULT_COCKPIT_SIDEBAR_WIDTH = 420;
export function clampCockpitSidebarWidth(raw: unknown): number {
  const width = typeof raw === 'number' && Number.isFinite(raw) ? raw : DEFAULT_COCKPIT_SIDEBAR_WIDTH;
  return Math.round(Math.max(300, Math.min(620, width)));
}
export function resizeCockpitSidebarWidth(startWidth: number, startX: number, currentX: number): number {
  return clampCockpitSidebarWidth(startWidth + startX - currentX);
}

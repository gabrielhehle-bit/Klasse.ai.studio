import type { CockpitWidgetConfig } from "../types";

export const DEFAULT_COCKPIT_BOARD_PAGE_ID = "page-1";
export const MAX_COCKPIT_BOARD_PAGES = 12;

const PAGE_ID = /^page-(\d+)$/;

export function normalizeCockpitBoardPageIds(raw: unknown): string[] {
  const source = Array.isArray(raw) ? raw : [];
  const unique: string[] = [];
  for (const value of source) {
    if (typeof value !== "string" || !PAGE_ID.test(value) || unique.includes(value)) continue;
    unique.push(value);
    if (unique.length >= MAX_COCKPIT_BOARD_PAGES) break;
  }
  return unique.length > 0 ? unique : [DEFAULT_COCKPIT_BOARD_PAGE_ID];
}

export function normalizeCockpitActiveBoardPage(raw: unknown, pageIds: readonly string[]): string {
  const pages = normalizeCockpitBoardPageIds(pageIds);
  return typeof raw === "string" && pages.includes(raw) ? raw : pages[0];
}

/**
 * Page 1 deliberately keeps the historic per-class storage key. That means
 * existing text, ink and paper settings remain readable without migration.
 */
export function getCockpitBoardPageStorageKey(classKey: string, pageId: string): string {
  return pageId === DEFAULT_COCKPIT_BOARD_PAGE_ID ? classKey : `${classKey}::${pageId}`;
}

export function createNextCockpitBoardPageId(pageIds: readonly string[]): string {
  const used = new Set(normalizeCockpitBoardPageIds(pageIds));
  for (let number = 2; number <= MAX_COCKPIT_BOARD_PAGES; number += 1) {
    const candidate = `page-${number}`;
    if (!used.has(candidate)) return candidate;
  }
  return `page-${MAX_COCKPIT_BOARD_PAGES}`;
}

/**
 * New pages start as a clean teaching surface. Widget definitions/settings stay
 * available, but no widget is open and no prior page rectangle is reused.
 */
export function createEmptyCockpitBoardLayout(defaultLayout: readonly CockpitWidgetConfig[]): CockpitWidgetConfig[] {
  return defaultLayout.map((widget) => ({
    ...widget,
    visible: false,
    hasBeenOpened: false,
    settings: widget.settings ? { ...widget.settings } : widget.settings,
  }));
}

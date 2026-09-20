import type { GeneratedGroup } from './groupsAlgorithm';

/**
 * All teaching-surface cards are rendered in whole, without an inner scroll.
 * The geometry reserves the existing size/generate controls, feedback,
 * footer and (when needed) page navigation.
 */
export const GROUP_WIDGET_GRID = {
  minCardWidth: 190,
  studentRowHeight: 54,
  cardChromeHeight: 90,
  gap: 8,
  reservedHeight: 224,
} as const;

export interface GroupPageLayout {
  columns: number;
  rows: number;
  pageSize: number;
  pageCount: number;
  page: number;
  start: number;
  cardHeight: number;
  fits: boolean;
}

export function getGroupPageLayout(
  width: number,
  height: number,
  groups: readonly Pick<GeneratedGroup, 'studentIds'>[],
  requestedPage: number,
): GroupPageLayout {
  const availableWidth = Number.isFinite(width) ? Math.max(0, width - 24) : 0;
  const availableHeight = Number.isFinite(height) ? Math.max(0, height - GROUP_WIDGET_GRID.reservedHeight) : 0;
  const columns = Math.max(1, Math.min(6, Math.floor(
    (availableWidth + GROUP_WIDGET_GRID.gap) / (GROUP_WIDGET_GRID.minCardWidth + GROUP_WIDGET_GRID.gap),
  )));
  const maxMembers = Math.max(0, ...groups.map(group => group.studentIds.length));
  const cardHeight = GROUP_WIDGET_GRID.cardChromeHeight + maxMembers * GROUP_WIDGET_GRID.studentRowHeight;
  const rows = Math.max(1, Math.floor(
    (availableHeight + GROUP_WIDGET_GRID.gap) / (cardHeight + GROUP_WIDGET_GRID.gap),
  ));
  const fits = availableWidth >= GROUP_WIDGET_GRID.minCardWidth && availableHeight >= cardHeight;
  const pageSize = Math.max(1, columns * rows);
  const pageCount = Math.max(1, Math.ceil(groups.length / pageSize));
  const page = Number.isFinite(requestedPage)
    ? Math.min(pageCount - 1, Math.max(0, Math.floor(requestedPage)))
    : 0;
  return { columns, rows, pageSize, pageCount, page, start: page * pageSize, cardHeight, fits };
}

import type { GeneratedGroup } from './groupsAlgorithm';

/**
 * Each group is divided into complete, readable segments if its member list
 * cannot fit on a physical teaching screen. No member is omitted or scrolled
 * behind a clipped inner list; saved GeneratedGroup objects remain unchanged.
 */
export const GROUP_WIDGET_GRID = {
  minCardWidth: 190,
  studentRowHeight: 52,
  cardChromeHeight: 66,
  gap: 8,
  reservedHeight: 155,
} as const;

export interface GroupCardSegment {
  group: GeneratedGroup;
  memberIds: string[];
  part: number;
  parts: number;
}

export interface GroupPageLayout {
  columns: number;
  rows: number;
  pageSize: number;
  pageCount: number;
  page: number;
  start: number;
  cardHeight: number;
  fits: boolean;
  cards: GroupCardSegment[];
}

export function getGroupPageLayout(
  width: number,
  height: number,
  groups: readonly GeneratedGroup[],
  requestedPage: number,
  options: { reservedHeight?: number } = {},
): GroupPageLayout {
  const reservedHeight = Number.isFinite(options.reservedHeight)
    ? Math.max(0, options.reservedHeight ?? GROUP_WIDGET_GRID.reservedHeight)
    : GROUP_WIDGET_GRID.reservedHeight;
  const availableWidth = Number.isFinite(width) ? Math.max(0, width - 24) : 0;
  const availableHeight = Number.isFinite(height) ? Math.max(0, height - reservedHeight) : 0;
  const columns = Math.max(1, Math.min(6, Math.floor(
    (availableWidth + GROUP_WIDGET_GRID.gap) / (GROUP_WIDGET_GRID.minCardWidth + GROUP_WIDGET_GRID.gap),
  )));
  const singleRowHeight = GROUP_WIDGET_GRID.cardChromeHeight + GROUP_WIDGET_GRID.studentRowHeight;
  const fits = availableWidth >= GROUP_WIDGET_GRID.minCardWidth && availableHeight >= singleRowHeight;
  const maximumRowsPerCard = Math.max(
    1,
    Math.floor((availableHeight - GROUP_WIDGET_GRID.cardChromeHeight) / GROUP_WIDGET_GRID.studentRowHeight),
  );
  const cards: GroupCardSegment[] = [];
  for (const group of groups) {
    const parts = Math.max(1, Math.ceil(group.studentIds.length / maximumRowsPerCard));
    for (let part = 0; part < parts; part++) {
      cards.push({
        group,
        memberIds: group.studentIds.slice(part * maximumRowsPerCard, (part + 1) * maximumRowsPerCard),
        part: part + 1,
        parts,
      });
    }
  }
  const maxVisibleMembers = Math.max(0, ...cards.map(card => card.memberIds.length));
  const cardHeight = GROUP_WIDGET_GRID.cardChromeHeight + maxVisibleMembers * GROUP_WIDGET_GRID.studentRowHeight;
  const rows = Math.max(1, Math.floor(
    (availableHeight + GROUP_WIDGET_GRID.gap) / (cardHeight + GROUP_WIDGET_GRID.gap),
  ));
  const pageSize = Math.max(1, columns * rows);
  const pageCount = Math.max(1, Math.ceil(cards.length / pageSize));
  const page = Number.isFinite(requestedPage)
    ? Math.min(pageCount - 1, Math.max(0, Math.floor(requestedPage)))
    : 0;
  return { columns, rows, pageSize, pageCount, page, start: page * pageSize, cardHeight, fits, cards };
}

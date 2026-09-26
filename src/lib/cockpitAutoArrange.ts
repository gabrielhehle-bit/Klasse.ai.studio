export interface CockpitAutoArrangeItem {
  id: string;
  minW: number;
  minH: number;
  prefW: number;
  prefH: number;
}

export interface CockpitAutoArrangeRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CockpitAutoArrangeResult {
  rects: CockpitAutoArrangeRect[];
  rows: number;
  constrained: boolean;
}

const OUTER_PADDING_PX = 14;
const GAP_PX = 14;
const MAX_SCALE_OVER_PREFERRED = 1.25;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

function balancedRowCounts(count: number, rows: number): number[] {
  const base = Math.floor(count / rows);
  const extra = count % rows;
  // Larger widgets are ordered first. Put surplus cells in the later rows so a
  // leading high-demand widget lands in the less crowded row (5 => 2 + 3).
  return Array.from(
    { length: rows },
    (_, index) => base + (extra > 0 && index >= rows - extra ? 1 : 0),
  );
}

function allocateSizes(total: number, mins: number[], prefs: number[]): number[] | null {
  const safeTotal = Math.max(0, total);
  const minTotal = mins.reduce((sum, value) => sum + value, 0);
  if (minTotal > safeTotal + 0.5) return null;

  const sizes = mins.slice();
  let remaining = safeTotal - minTotal;
  if (remaining <= 0.5) return sizes;

  const needs = prefs.map((pref, index) => Math.max(0, pref - sizes[index]));
  const totalNeed = needs.reduce((sum, value) => sum + value, 0);
  if (totalNeed > 0) {
    const grant = Math.min(remaining, totalNeed);
    needs.forEach((need, index) => {
      sizes[index] += grant * (need / totalNeed);
    });
    remaining -= grant;
  }

  if (remaining > 0.5) {
    const share = remaining / sizes.length;
    for (let index = 0; index < sizes.length; index += 1) sizes[index] += share;
  }
  return sizes;
}

function splitIntoRows(items: CockpitAutoArrangeItem[], rows: number): CockpitAutoArrangeItem[][] {
  const rowCounts = balancedRowCounts(items.length, rows);
  const result: CockpitAutoArrangeItem[][] = [];
  let offset = 0;
  for (const count of rowCounts) {
    result.push(items.slice(offset, offset + count));
    offset += count;
  }
  return result;
}

function buildCandidate(
  items: CockpitAutoArrangeItem[],
  usableWidth: number,
  usableHeight: number,
  rows: number,
): { rects: CockpitAutoArrangeRect[]; score: number } | null {
  const grouped = splitIntoRows(items, rows);
  const innerWidth = usableWidth - OUTER_PADDING_PX * 2;
  const innerHeight = usableHeight - OUTER_PADDING_PX * 2;
  if (innerWidth <= 0 || innerHeight <= 0) return null;

  const rowMins = grouped.map(row => Math.max(...row.map(item => item.minH)));
  const rowPrefs = grouped.map(row => Math.max(...row.map(item => item.prefH)));
  const availableRowsHeight = innerHeight - GAP_PX * Math.max(0, rows - 1);
  const rowHeights = allocateSizes(availableRowsHeight, rowMins, rowPrefs);
  if (!rowHeights) return null;

  const rects: CockpitAutoArrangeRect[] = [];
  let score = 0;
  let y = OUTER_PADDING_PX;

  grouped.forEach((row, rowIndex) => {
    const availableRowWidth = innerWidth - GAP_PX * Math.max(0, row.length - 1);
    const widths = allocateSizes(
      availableRowWidth,
      row.map(item => item.minW),
      row.map(item => item.prefW),
    );
    if (!widths) {
      score = Number.POSITIVE_INFINITY;
      return;
    }

    let x = OUTER_PADDING_PX;
    row.forEach((item, itemIndex) => {
      const cellW = widths[itemIndex];
      const cellH = rowHeights[rowIndex];
      const targetW = Math.min(cellW, Math.max(item.minW, item.prefW * MAX_SCALE_OVER_PREFERRED));
      const targetH = Math.min(cellH, Math.max(item.minH, item.prefH * MAX_SCALE_OVER_PREFERRED));
      const widgetX = x + (cellW - targetW) / 2;
      const widgetY = y + (cellH - targetH) / 2;

      const widthShortfall = Math.max(0, item.prefW - cellW) / Math.max(1, item.prefW);
      const heightShortfall = Math.max(0, item.prefH - cellH) / Math.max(1, item.prefH);
      const preferredAspect = item.prefW / Math.max(1, item.prefH);
      const targetAspect = targetW / Math.max(1, targetH);
      const aspectPenalty = Math.abs(Math.log(Math.max(0.1, targetAspect / preferredAspect)));

      score += widthShortfall * 4 + heightShortfall * 4 + aspectPenalty * 0.35;
      rects.push({ id: item.id, x: widgetX, y: widgetY, w: targetW, h: targetH });
      x += cellW + GAP_PX;
    });

    y += rowHeights[rowIndex] + GAP_PX;
  });

  if (!Number.isFinite(score)) return null;

  // Prefer balanced layouts when two candidates satisfy the same preferred sizes.
  const widestRow = Math.max(...grouped.map(row => row.length));
  const boardAspect = usableWidth / Math.max(1, usableHeight);
  const gridAspect = widestRow / Math.max(1, rows);
  score += Math.abs(Math.log(Math.max(0.1, gridAspect / boardAspect))) * 0.12;

  return { rects, score };
}

/**
 * Builds a non-overlapping layout in real board pixels. The caller converts the
 * returned rectangles to percentages relative to the full whiteboard. The
 * available area may already exclude an overlaying student sidebar and the dock.
 */
export function getCockpitAutoArrangeLayout(
  items: CockpitAutoArrangeItem[],
  usableWidth: number,
  usableHeight: number,
): CockpitAutoArrangeResult {
  if (items.length === 0 || usableWidth <= 0 || usableHeight <= 0) {
    return { rects: [], rows: 0, constrained: true };
  }

  // Keep the existing visual order, but put widgets with larger hard requirements
  // first so balanced row splitting does not strand a large widget in a crowded row.
  const ordered = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const pressureA = a.item.minW * a.item.minH + a.item.prefW * a.item.prefH * 0.25;
      const pressureB = b.item.minW * b.item.minH + b.item.prefW * b.item.prefH * 0.25;
      return pressureB - pressureA || a.index - b.index;
    })
    .map(entry => entry.item);

  let best: { rects: CockpitAutoArrangeRect[]; score: number; rows: number } | null = null;
  const maxRows = Math.min(items.length, 6);
  for (let rows = 1; rows <= maxRows; rows += 1) {
    const candidate = buildCandidate(ordered, usableWidth, usableHeight, rows);
    if (!candidate) continue;
    if (!best || candidate.score < best.score) {
      best = { ...candidate, rows };
    }
  }

  if (!best) return { rects: [], rows: 0, constrained: true };

  const inside = best.rects.every(rect =>
    rect.x >= 0 &&
    rect.y >= 0 &&
    rect.x + rect.w <= usableWidth + 0.5 &&
    rect.y + rect.h <= usableHeight + 0.5,
  );

  return {
    rects: best.rects.map(rect => ({
      ...rect,
      x: clamp(rect.x, 0, Math.max(0, usableWidth - rect.w)),
      y: clamp(rect.y, 0, Math.max(0, usableHeight - rect.h)),
    })),
    rows: best.rows,
    constrained: !inside,
  };
}

export const COCKPIT_AUTO_ARRANGE_DOCK_CLEARANCE_PX = 70;

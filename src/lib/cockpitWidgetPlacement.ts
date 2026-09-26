export interface CockpitPlacementRect {
  id?: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CockpitPlacementRequest {
  usableWidth: number;
  usableHeight: number;
  desiredW: number;
  desiredH: number;
  minW: number;
  minH: number;
  occupied: CockpitPlacementRect[];
  gap?: number;
  padding?: number;
}

export interface CockpitPlacementResult {
  x: number;
  y: number;
  w: number;
  h: number;
  overlapArea: number;
  usedOverlapFallback: boolean;
  shrankToFit: boolean;
}

const DEFAULT_GAP = 14;
const DEFAULT_PADDING = 14;
const SCAN_STEP = 24;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

function intersectionArea(a: CockpitPlacementRect, b: CockpitPlacementRect): number {
  const overlapW = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const overlapH = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return overlapW * overlapH;
}

function totalOverlap(rect: CockpitPlacementRect, occupied: CockpitPlacementRect[], gap: number): number {
  return occupied.reduce((sum, obstacle) => {
    const padded: CockpitPlacementRect = {
      x: obstacle.x - gap,
      y: obstacle.y - gap,
      w: obstacle.w + gap * 2,
      h: obstacle.h + gap * 2,
    };
    return sum + intersectionArea(rect, padded);
  }, 0);
}

function uniqueSorted(values: number[], min: number, max: number): number[] {
  return [...new Set(
    values
      .map(value => Math.round(clamp(value, min, max) * 100) / 100)
      .filter(value => Number.isFinite(value)),
  )].sort((a, b) => a - b);
}

function getCandidateAxes(
  usable: number,
  size: number,
  occupied: CockpitPlacementRect[],
  axis: "x" | "y",
  gap: number,
  padding: number,
): number[] {
  const maxStart = Math.max(padding, usable - padding - size);
  const values = [padding, maxStart];

  for (const obstacle of occupied) {
    const start = axis === "x" ? obstacle.x : obstacle.y;
    const span = axis === "x" ? obstacle.w : obstacle.h;
    values.push(start - size - gap, start + span + gap);
  }

  // Edge-derived positions catch most gaps. A modest scan makes the placement
  // resilient to freely dragged windows whose edges do not line up nicely.
  for (let pos = padding; pos <= maxStart; pos += SCAN_STEP) values.push(pos);
  values.push(maxStart);

  return uniqueSorted(values, padding, maxStart);
}

function candidateScore(
  rect: CockpitPlacementRect,
  overlapArea: number,
  usableWidth: number,
  usableHeight: number,
  padding: number,
): number {
  const topBias = rect.y / Math.max(1, usableHeight);
  const leftBias = rect.x / Math.max(1, usableWidth);
  const centerX = rect.x + rect.w / 2;
  const centerY = rect.y + rect.h / 2;
  const boardCenterX = usableWidth / 2;
  const boardCenterY = usableHeight / 2;
  const centerDistance =
    Math.abs(centerX - boardCenterX) / Math.max(1, usableWidth) +
    Math.abs(centerY - boardCenterY) / Math.max(1, usableHeight);
  const edgePenalty =
    (rect.x <= padding + 0.5 ? 0 : 0.03) +
    (rect.y <= padding + 0.5 ? 0 : 0.03);

  // Overlap dominates every aesthetic preference. Among equally free options,
  // use a calm reading order: upper area first, then left-to-right.
  return overlapArea * 1000 + topBias * 8 + leftBias * 3 + centerDistance * 0.2 + edgePenalty;
}

/**
 * Finds a stable opening position for one new widget.
 *
 * 1. Keep the requested size when it fits the currently usable board.
 * 2. Search edge-aligned and free-grid candidates.
 * 3. Prefer zero overlap.
 * 4. Only if no free candidate exists, pick the position with the least overlap.
 *
 * Returned coordinates are pixels inside the already measured usable board area.
 */
export function findCockpitWidgetOpeningPlacement(
  request: CockpitPlacementRequest,
): CockpitPlacementResult {
  const gap = Math.max(0, request.gap ?? DEFAULT_GAP);
  const padding = Math.max(0, request.padding ?? DEFAULT_PADDING);
  const usableWidth = Math.max(1, request.usableWidth);
  const usableHeight = Math.max(1, request.usableHeight);

  const availableW = Math.max(1, usableWidth - padding * 2);
  const availableH = Math.max(1, usableHeight - padding * 2);
  const hardMinW = Math.min(availableW, Math.max(1, request.minW));
  const hardMinH = Math.min(availableH, Math.max(1, request.minH));
  const requestedW = clamp(request.desiredW, hardMinW, availableW);
  const requestedH = clamp(request.desiredH, hardMinH, availableH);

  const occupied = request.occupied.filter(rect =>
    rect.w > 0 &&
    rect.h > 0 &&
    rect.x < usableWidth &&
    rect.y < usableHeight &&
    rect.x + rect.w > 0 &&
    rect.y + rect.h > 0,
  );

  const searchSize = (w: number, h: number) => {
    const xs = getCandidateAxes(usableWidth, w, occupied, "x", gap, padding);
    const ys = getCandidateAxes(usableHeight, h, occupied, "y", gap, padding);
    let best: { rect: CockpitPlacementRect; overlap: number; score: number } | null = null;

    for (const y of ys) {
      for (const x of xs) {
        const rect: CockpitPlacementRect = { x, y, w, h };
        const overlap = totalOverlap(rect, occupied, gap);
        const score = candidateScore(rect, overlap, usableWidth, usableHeight, padding);
        if (!best || score < best.score) best = { rect, overlap, score };
      }
    }
    return best;
  };

  // Preserve the requested size when possible. If it has no free home, shrink
  // in small steps but never below the widget's readable minimum. This avoids
  // overlap when a compact yet still safe placement exists.
  const scaleSteps = [1, 0.92, 0.84, 0.76];
  const sizes: Array<{ w: number; h: number }> = [];
  for (const scale of scaleSteps) {
    const w = Math.max(hardMinW, requestedW * scale);
    const h = Math.max(hardMinH, requestedH * scale);
    if (!sizes.some(size => Math.abs(size.w - w) < 0.5 && Math.abs(size.h - h) < 0.5)) {
      sizes.push({ w, h });
    }
  }
  if (!sizes.some(size => Math.abs(size.w - hardMinW) < 0.5 && Math.abs(size.h - hardMinH) < 0.5)) {
    sizes.push({ w: hardMinW, h: hardMinH });
  }

  let bestFallback: { rect: CockpitPlacementRect; overlap: number; score: number; shrink: number } | null = null;

  for (const size of sizes) {
    const found = searchSize(size.w, size.h);
    if (!found) continue;
    const shrink =
      1 -
      ((size.w / Math.max(1, requestedW)) + (size.h / Math.max(1, requestedH))) / 2;

    if (found.overlap <= 0.5) {
      return {
        ...found.rect,
        overlapArea: 0,
        usedOverlapFallback: false,
        shrankToFit: shrink > 0.01,
      };
    }

    if (
      !bestFallback ||
      found.overlap < bestFallback.overlap - 0.5 ||
      (Math.abs(found.overlap - bestFallback.overlap) <= 0.5 &&
        shrink < bestFallback.shrink)
    ) {
      bestFallback = { ...found, shrink };
    }
  }

  const fallback = bestFallback ?? {
    rect: { x: padding, y: padding, w: requestedW, h: requestedH },
    overlap: 0,
    score: 0,
    shrink: 0,
  };
  return {
    ...fallback.rect,
    overlapArea: fallback.overlap,
    usedOverlapFallback: fallback.overlap > 0.5,
    shrankToFit: fallback.shrink > 0.01,
  };
}


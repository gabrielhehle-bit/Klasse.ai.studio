import type { CSSProperties } from 'react';

export type CockpitPaper = 'blank' | 'lined' | 'grid' | 'handwriting';

/** One spacing setting per class; clamp legacy/untrusted backup values. */
export function normalizeCockpitPaperSpacing(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? Math.max(16, Math.min(80, Math.round(numeric))) : 32;
}

export const COCKPIT_PAPERS: ReadonlyArray<{ id: CockpitPaper; label: string }> = [
  { id: 'blank', label: 'Weiß' },
  { id: 'lined', label: 'Liniert' },
  { id: 'grid', label: 'Kariert' },
  { id: 'handwriting', label: 'Häuschen' },
];

/**
 * Pure visual styles: no student data, no asset migration. A Canva background
 * takes precedence over a paper pattern; switching back restores the pattern.
 */
export function getCockpitPaperStyle(
  paper: CockpitPaper,
  canvaImage?: string | null,
  spacing?: number,
): CSSProperties {
  const gap = normalizeCockpitPaperSpacing(spacing);
  if (canvaImage && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(canvaImage)) {
    return { backgroundColor: '#ffffff', backgroundImage: `url("${canvaImage}")`, backgroundPosition: 'center', backgroundSize: 'contain', backgroundRepeat: 'no-repeat' };
  }
  if (paper === 'lined') {
    return { backgroundColor: '#ffffff', backgroundImage: `linear-gradient(to bottom, transparent ${gap - 1}px, #b5d1f0 ${gap}px)`, backgroundSize: `100% ${gap}px` };
  }
  if (paper === 'grid') {
    return { backgroundColor: '#ffffff', backgroundImage: 'linear-gradient(to right, #d1e4f5 1px, transparent 1px), linear-gradient(to bottom, #d1e4f5 1px, transparent 1px)', backgroundSize: `${gap}px ${gap}px` };
  }
  if (paper === 'handwriting') {
    const zone = Math.max(8, Math.round(gap / 2));
    const row = zone * 4;
    // The little house marks roof, main floor and basement at the start of EACH writing row.
    // The horizontal ruled zones cover the complete width, not only the width of the house.
    const houseSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="44" height="' + row + '" viewBox="0 0 44 ' + row + '">' +
      '<path d="M 3 ' + zone + ' L 22 2 L 41 ' + zone + ' Z" fill="#e8f1fd" stroke="#7196c4" stroke-width="1.5"/>' +
      '<rect x="3" y="' + zone + '" width="38" height="' + zone + '" fill="#f2f8ff" stroke="#7196c4" stroke-width="1.5"/>' +
      '<rect x="3" y="' + (zone * 2) + '" width="38" height="' + zone + '" fill="#f8fbff" stroke="#7196c4" stroke-width="1.5"/>' +
      '</svg>';
    const ruledLines = 'linear-gradient(to bottom, transparent ' + (zone - 1) + 'px, #93b5d9 ' + zone + 'px, transparent ' + (zone + 1) + 'px, transparent ' + (zone * 2 - 1) + 'px, #7196c4 ' + (zone * 2) + 'px, transparent ' + (zone * 2 + 1) + 'px, transparent ' + (zone * 3 - 1) + 'px, #93b5d9 ' + (zone * 3) + 'px, transparent ' + (zone * 3 + 1) + 'px)';
    return {
      backgroundColor: '#ffffff',
      backgroundImage: 'url("data:image/svg+xml,' + encodeURIComponent(houseSvg) + '"), ' + ruledLines,
      backgroundSize: '44px ' + row + 'px, 100% ' + row + 'px',
      backgroundPosition: '12px 8px, 0 8px',
      backgroundRepeat: 'repeat-y, repeat',
    };
  }
  return { backgroundColor: '#ffffff', backgroundImage: 'none' };
}

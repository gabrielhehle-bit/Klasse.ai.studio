import type { CSSProperties } from 'react';

export type CockpitPaper = 'blank' | 'lined' | 'grid' | 'handwriting';

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
): CSSProperties {
  if (canvaImage && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(canvaImage)) {
    return { backgroundColor: '#ffffff', backgroundImage: `url("${canvaImage}")`, backgroundPosition: 'center', backgroundSize: 'contain', backgroundRepeat: 'no-repeat' };
  }
  if (paper === 'lined') {
    return { backgroundColor: '#ffffff', backgroundImage: 'linear-gradient(to bottom, transparent 31px, #b5d1f0 32px)', backgroundSize: '100% 32px' };
  }
  if (paper === 'grid') {
    return { backgroundColor: '#ffffff', backgroundImage: 'linear-gradient(to right, #d1e4f5 1px, transparent 1px), linear-gradient(to bottom, #d1e4f5 1px, transparent 1px)', backgroundSize: '24px 24px' };
  }
  if (paper === 'handwriting') {
    return { backgroundColor: '#ffffff', backgroundImage: 'linear-gradient(to right, #bbd7ee 1px, transparent 1px), linear-gradient(to bottom, #bbd7ee 1px, transparent 1px), linear-gradient(to bottom, transparent 31px, #7eaedb 32px)', backgroundSize: '16px 32px, 16px 16px, 100% 32px' };
  }
  return { backgroundColor: '#ffffff', backgroundImage: 'none' };
}

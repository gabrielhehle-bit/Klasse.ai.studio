import { initializeDefaultDienste, migrateLegacyDienste, type DiensteItem } from './diensteAlgorithm';

/** A deliberately emptied list must never be silently replaced by template services. */
export function readClassDienste(
  classDienste: unknown,
  savedWidgetDienste: unknown,
): DiensteItem[] {
  if (Array.isArray(classDienste)) return classDienste.length ? migrateLegacyDienste(classDienste) : [];
  if (Array.isArray(savedWidgetDienste)) return savedWidgetDienste.length ? migrateLegacyDienste(savedWidgetDienste) : [];
  return initializeDefaultDienste();
}

/** One page is always reachable, even when the original widget is very small. */
export function dienstPageWindow(total: number, width: number, height: number, page: number) {
  const columns = width >= 550 ? 2 : 1;
  // Reserve the header, page controls and padding. A row must also fit a long
  // title and two touch-sized assignee cards; additional children use the dialog.
  const rows = Math.max(1, Math.min(4, Math.floor((height - 112) / 340)));
  const perPage = columns * rows;
  const pageCount = Math.max(1, Math.ceil(Math.max(0, total) / perPage));
  const current = Math.max(0, Math.min(pageCount - 1, Math.floor(Number.isFinite(page) ? page : 0)));
  return { page: current, pageCount, perPage, start: current * perPage,
    end: Math.min(total, (current + 1) * perPage) };
}

export { localDienstDate } from './diensteAlgorithm';

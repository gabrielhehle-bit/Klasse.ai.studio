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
  const rows = height < 320 ? 1 : height < 430 ? 2 : height < 600 ? 3 : 4;
  const perPage = columns * rows;
  const pageCount = Math.max(1, Math.ceil(Math.max(0, total) / perPage));
  const current = Math.max(0, Math.min(pageCount - 1, Math.floor(Number.isFinite(page) ? page : 0)));
  return { page: current, pageCount, perPage, start: current * perPage,
    end: Math.min(total, (current + 1) * perPage) };
}

/** Local calendar day, not UTC: substitute appointments must not spill into tomorrow. */
export function localDienstDate(now: Date = new Date()): string {
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')].join('-');
}

/** Page calculation for the teacher-facing To-do panel (no inner scrolling).
 * Reserve vertical space for the header, paging controls and the add form.
 * Conservative height budgeting keeps ordinary two-line tasks readable.
 * Very long free-text tasks still require visual overflow acceptance.
 */
export function getTodoRowsPerPage(
  height: number,
  isCompact: boolean,
  showPresetsMenu: boolean,
  showConfirmReset: boolean,
): number {
  const reservedHeight = (showPresetsMenu ? 360 : 240) + (showConfirmReset ? 64 : 0);
  const rowBudget = isCompact ? 76 : 84;
  return Math.max(1, Math.min(4, Math.floor((height - reservedHeight) / rowBudget)));
}

export function getTodoPageWindow(itemCount: number, rowsPerPage: number, requestedPage: number) {
  const safeRows = Math.max(1, Math.floor(rowsPerPage));
  const pageCount = Math.max(1, Math.ceil(Math.max(0, itemCount) / safeRows));
  const visiblePage = Math.max(0, Math.min(pageCount - 1, Math.floor(requestedPage)));
  return { pageCount, visiblePage, firstVisibleItem: visiblePage * safeRows };
}

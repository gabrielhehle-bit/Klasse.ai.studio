export const DAILY_PAGES = ['dashboard', 'klasse', 'verhalten', 'planung', 'leistungen', 'unterricht', 'lehrerzimmer'];
export const UTILITY_PAGES = ['datensicherung', 'settings'];

export function groupSidebarItems<T extends { id: string; section: string }>(items: T[], disabled: string[], currentPage: string, showMore: boolean) {
  // Keep a directly opened page visible even if it is outside the everyday selection.
  const available = items.filter(item => UTILITY_PAGES.includes(item.id) || !disabled.includes(item.id) || item.id === currentPage);
  const daily = DAILY_PAGES.flatMap(id => available.filter(item => item.id === id));
  const utilities = available.filter(item => UTILITY_PAGES.includes(item.id));
  const extra = available.filter(item => !DAILY_PAGES.includes(item.id) && !UTILITY_PAGES.includes(item.id));
  const expanded = showMore;
  return { daily, utilities, extra, expanded };
}

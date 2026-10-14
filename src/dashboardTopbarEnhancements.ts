const DASHBOARD_EDIT_MENU_MARKER = 'data-klassio-dashboard-edit-menu';
const DASHBOARD_HIDDEN_EDIT_MARKER = 'data-klassio-dashboard-hidden-edit';
const CUSTOMIZER_CLASS = 'klassio-dashboard-customizer';

function getTopbarMoreButton(): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>('button[title="Weitere Optionen & Werkzeuge"]');
}

function isDashboardActive(moreButton: HTMLButtonElement): boolean {
  const topbar = moreButton.closest('header');
  if (!topbar) return false;

  return Array.from(topbar.querySelectorAll('span')).some((span) => {
    const label = span.textContent?.trim();
    return label === 'Heute' && span.classList.contains('font-black');
  });
}

function restoreHiddenEditButtons() {
  document
    .querySelectorAll<HTMLButtonElement>(`button[${DASHBOARD_HIDDEN_EDIT_MARKER}]`)
    .forEach((button) => {
      button.hidden = false;
      button.removeAttribute(DASHBOARD_HIDDEN_EDIT_MARKER);
    });
}

function hideOldTopEditButton() {
  Array.from(document.querySelectorAll<HTMLButtonElement>('button')).forEach((button) => {
    if (button.hasAttribute(DASHBOARD_EDIT_MENU_MARKER)) return;
    const label = button.textContent?.trim();
    if (label !== 'Bearbeiten' && label !== 'Dashboard bearbeiten') return;

    const rect = button.getBoundingClientRect();
    const isTopAction = Boolean(button.closest('.topbar')) || (rect.top >= 0 && rect.top < 220);
    if (!isTopAction) return;

    button.hidden = true;
    button.setAttribute(DASHBOARD_HIDDEN_EDIT_MARKER, 'true');
  });
}

function addDashboardEditToMoreMenu(moreButton: HTMLButtonElement) {
  const wrapper = moreButton.parentElement;
  if (!wrapper) return;

  const dropdown = Array.from(wrapper.children).find((element) =>
    element instanceof HTMLDivElement && element.classList.contains('absolute')
  ) as HTMLDivElement | undefined;

  if (!dropdown || dropdown.querySelector(`[${DASHBOARD_EDIT_MENU_MARKER}]`)) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute(DASHBOARD_EDIT_MENU_MARKER, 'true');
  button.className = 'w-full rounded-2xl border border-[var(--border-default,var(--border))] bg-[var(--surface-subtle,var(--surface2))] px-3 py-3 text-left transition-colors hover:border-[var(--accent)]/35 hover:bg-[var(--accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,var(--accent))]';

  const title = document.createElement('span');
  title.className = 'block text-sm font-black text-[var(--text-primary)]';
  title.textContent = 'Dashboard bearbeiten';

  const subtitle = document.createElement('span');
  subtitle.className = 'mt-0.5 block text-[0.6875rem] font-medium text-[var(--text-muted)]';
  subtitle.textContent = 'Layout, Farben und Vorschau anpassen';

  button.append(title, subtitle);
  button.addEventListener('click', () => {
    moreButton.click();
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('open-dashboard-customize'));
    }, 0);
  });

  dropdown.prepend(button);
}

function markDashboardCustomizer() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>('h3')).find((element) =>
    element.textContent?.includes('Dashboard anpassen')
  );
  if (!heading) return;

  const panel = heading.closest<HTMLElement>('.bg-neutral-950');
  panel?.classList.add(CUSTOMIZER_CLASS);
}

function syncDashboardEnhancements() {
  markDashboardCustomizer();

  const moreButton = getTopbarMoreButton();
  if (!moreButton || !isDashboardActive(moreButton)) {
    restoreHiddenEditButtons();
    document.querySelectorAll(`[${DASHBOARD_EDIT_MENU_MARKER}]`).forEach((node) => node.remove());
    return;
  }

  hideOldTopEditButton();
  addDashboardEditToMoreMenu(moreButton);
}

let scheduled = false;
function scheduleSync() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    syncDashboardEnhancements();
  });
}

function startDashboardEnhancements() {
  syncDashboardEnhancements();
  const observer = new MutationObserver(scheduleSync);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startDashboardEnhancements, { once: true });
} else {
  startDashboardEnhancements();
}

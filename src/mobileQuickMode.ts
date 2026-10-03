const MOBILE_QUERY = '(max-width: 767px)';
const SHELL_ID = 'klassio-mobile-quick-mode';
const STYLE_ID = 'klassio-mobile-quick-mode-style';

const pageLabels: Record<string, string> = {
  dashboard: 'Heute',
  klasse: 'Klassen',
  anwesenheit: 'Anwesenheit',
  verhalten: 'Notizen',
  noten: 'Notenmappe',
  dossier: 'Schülerdossier',
  schueler: 'Klassenliste',
  settings: 'Mehr',
};

const entryPages = new Set(['anwesenheit', 'verhalten', 'noten']);
const mainPages = new Set(['dashboard', 'klasse']);

let refreshScheduled = false;
let observer: MutationObserver | null = null;

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${SHELL_ID} { display: none; }

    @media (max-width: 767px) {
      html[data-klassio-mobile-quick='true'] [data-klassio-desktop-sidebar='true'],
      html[data-klassio-mobile-quick='true'] [data-klassio-sidebar-overlay='true'],
      html[data-klassio-mobile-quick='true'] .topbar {
        display: none !important;
      }

      html[data-klassio-mobile-quick='true'] #root main {
        padding-top: calc(3.5rem + env(safe-area-inset-top));
        padding-bottom: calc(4.75rem + env(safe-area-inset-bottom));
      }

      #${SHELL_ID} {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 8500;
        pointer-events: none;
        color: var(--text-primary, var(--text, #0f172a));
        font-family: inherit;
      }

      #${SHELL_ID} .kqm-header {
        pointer-events: auto;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        min-height: calc(3.5rem + env(safe-area-inset-top));
        padding: calc(.55rem + env(safe-area-inset-top)) .9rem .55rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: .75rem;
        background: color-mix(in srgb, var(--surface-card, var(--surface, #fff)) 95%, transparent);
        border-bottom: 1px solid var(--border-default, var(--border, #e2e8f0));
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
      }

      #${SHELL_ID} .kqm-brand {
        min-width: 0;
      }

      #${SHELL_ID} .kqm-brand small {
        display: block;
        margin-bottom: .1rem;
        color: var(--text-muted, var(--text3, #94a3b8));
        font-size: .58rem;
        font-weight: 800;
        letter-spacing: .12em;
        text-transform: uppercase;
      }

      #${SHELL_ID} .kqm-title {
        display: block;
        max-width: 72vw;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--text-primary, var(--text, #0f172a));
        font-size: 1rem;
        font-weight: 850;
        line-height: 1.15;
      }

      #${SHELL_ID} .kqm-sync {
        width: 2.4rem;
        height: 2.4rem;
        flex: 0 0 auto;
        display: grid;
        place-items: center;
        border: 1px solid var(--border-default, var(--border, #e2e8f0));
        border-radius: .85rem;
        background: var(--surface-subtle, var(--surface2, #f8fafc));
      }

      #${SHELL_ID} .kqm-sync-dot {
        width: .72rem;
        height: .72rem;
        border-radius: 999px;
        background: #f59e0b;
        box-shadow: 0 0 0 4px rgba(245, 158, 11, .13);
      }

      #${SHELL_ID} .kqm-sync[data-ready='true'] .kqm-sync-dot {
        background: #16a34a;
        box-shadow: 0 0 0 4px rgba(22, 163, 74, .13);
      }

      #${SHELL_ID} .kqm-backdrop {
        pointer-events: auto;
        position: absolute;
        inset: 0;
        background: rgba(15, 23, 42, .38);
        opacity: 0;
        visibility: hidden;
        transition: opacity .16s ease, visibility .16s ease;
      }

      #${SHELL_ID}[data-sheet-open='true'] .kqm-backdrop {
        opacity: 1;
        visibility: visible;
      }

      #${SHELL_ID} .kqm-sheet {
        pointer-events: auto;
        position: absolute;
        left: .65rem;
        right: .65rem;
        bottom: calc(4.45rem + env(safe-area-inset-bottom));
        max-height: min(68dvh, 34rem);
        overflow-y: auto;
        padding: .8rem;
        border: 1px solid var(--border-default, var(--border, #e2e8f0));
        border-radius: 1.35rem;
        background: var(--surface-card, var(--surface, #fff));
        box-shadow: 0 22px 60px rgba(15, 23, 42, .24);
        opacity: 0;
        transform: translateY(1rem) scale(.98);
        visibility: hidden;
        transition: opacity .16s ease, transform .16s ease, visibility .16s ease;
      }

      #${SHELL_ID}[data-sheet-open='true'] .kqm-sheet[data-open='true'] {
        opacity: 1;
        transform: translateY(0) scale(1);
        visibility: visible;
      }

      #${SHELL_ID} .kqm-sheet-title {
        padding: .25rem .25rem .65rem;
        font-size: .78rem;
        font-weight: 850;
        color: var(--text-primary, var(--text, #0f172a));
      }

      #${SHELL_ID} .kqm-action-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: .55rem;
      }

      #${SHELL_ID} .kqm-action {
        min-height: 5rem;
        padding: .78rem;
        text-align: left;
        border: 1px solid var(--border-default, var(--border, #e2e8f0));
        border-radius: 1rem;
        background: var(--surface-subtle, var(--surface2, #f8fafc));
        color: var(--text-primary, var(--text, #0f172a));
      }

      #${SHELL_ID} .kqm-action:active {
        transform: scale(.985);
      }

      #${SHELL_ID} .kqm-action strong,
      #${SHELL_ID} .kqm-action span {
        display: block;
      }

      #${SHELL_ID} .kqm-action strong {
        font-size: .82rem;
        line-height: 1.25;
      }

      #${SHELL_ID} .kqm-action span {
        margin-top: .25rem;
        color: var(--text-muted, var(--text3, #64748b));
        font-size: .65rem;
        line-height: 1.3;
      }

      #${SHELL_ID} .kqm-note {
        margin-top: .65rem;
        padding: .65rem .75rem;
        border-radius: .85rem;
        background: var(--accent-soft, rgba(16, 185, 129, .1));
        color: var(--text-secondary, var(--text2, #475569));
        font-size: .67rem;
        line-height: 1.4;
      }

      #${SHELL_ID} .kqm-nav {
        pointer-events: auto;
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        min-height: calc(4.2rem + env(safe-area-inset-bottom));
        padding: .38rem .35rem calc(.38rem + env(safe-area-inset-bottom));
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: .18rem;
        background: color-mix(in srgb, var(--surface-card, var(--surface, #fff)) 96%, transparent);
        border-top: 1px solid var(--border-default, var(--border, #e2e8f0));
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
      }

      #${SHELL_ID} .kqm-nav-button {
        min-width: 0;
        min-height: 3.3rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: .2rem;
        border: 0;
        border-radius: .9rem;
        background: transparent;
        color: var(--text-muted, var(--text3, #64748b));
        font: inherit;
        font-size: .65rem;
        font-weight: 750;
      }

      #${SHELL_ID} .kqm-nav-button::before {
        content: '';
        width: .42rem;
        height: .42rem;
        border-radius: 999px;
        background: currentColor;
        opacity: .55;
      }

      #${SHELL_ID} .kqm-nav-button[data-active='true'] {
        color: var(--accent, #10b981);
        background: var(--accent-soft, rgba(16, 185, 129, .1));
      }

      #${SHELL_ID} .kqm-nav-button[data-kind='entry']::before {
        width: 1.55rem;
        height: 1.55rem;
        display: grid;
        place-items: center;
        content: '+';
        color: var(--btn-text, #fff);
        background: var(--accent, #10b981);
        font-size: 1.15rem;
        font-weight: 500;
        line-height: 1;
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
}

function getDesktopSidebar(): HTMLElement | null {
  const dashboardButton = document.querySelector<HTMLElement>('[data-menu-id="dashboard"]');
  return dashboardButton?.closest('aside') as HTMLElement | null;
}

function markDesktopNavigation() {
  const sidebar = getDesktopSidebar();
  if (!sidebar) return;
  sidebar.dataset.klassioDesktopSidebar = 'true';
  const overlay = sidebar.previousElementSibling as HTMLElement | null;
  if (overlay && overlay.tagName === 'DIV') overlay.dataset.klassioSidebarOverlay = 'true';
}

function findDestination(pageId: string): HTMLButtonElement | null {
  const sidebar = getDesktopSidebar();
  if (!sidebar) return null;

  const direct = sidebar.querySelector<HTMLButtonElement>(`button[data-menu-id="${pageId}"]`);
  if (direct) return direct;

  if (pageId === 'settings') {
    return sidebar.querySelector<HTMLButtonElement>('button[title="Einstellungen"]');
  }

  return null;
}

function revealMorePages() {
  const sidebar = getDesktopSidebar();
  if (!sidebar) return;
  const buttons = Array.from(sidebar.querySelectorAll<HTMLButtonElement>('button'));
  const moreButton = buttons.find(button => {
    const label = button.getAttribute('aria-label') || '';
    const title = button.getAttribute('title') || '';
    return label.includes('weitere Bereiche anzeigen') || title === 'Alle Bereiche anzeigen';
  });
  moreButton?.click();
}

function clickButtonByText(label: string) {
  const candidates = Array.from(document.querySelectorAll<HTMLButtonElement>('main button'));
  const button = candidates.find(candidate => candidate.textContent?.trim() === label);
  button?.click();
}

function navigate(pageId: string, afterNavigate?: () => void) {
  closeSheets();
  const run = () => {
    const destination = findDestination(pageId);
    if (destination) {
      destination.click();
      if (afterNavigate) window.setTimeout(afterNavigate, 220);
      return true;
    }
    return false;
  };

  if (run()) return;
  revealMorePages();
  window.setTimeout(() => {
    if (!run()) console.warn(`[Klassio mobile] Ziel ${pageId} konnte nicht geöffnet werden.`);
  }, 70);
}

function currentPageId(): string {
  const current = document.querySelector<HTMLElement>('[data-menu-id][aria-current="page"]');
  if (current?.dataset.menuId) return current.dataset.menuId;

  const sidebar = getDesktopSidebar();
  const utilityCurrent = sidebar?.querySelector<HTMLButtonElement>('button[aria-current="page"]');
  if (utilityCurrent?.title === 'Einstellungen') return 'settings';
  return 'dashboard';
}

function getSyncReady(): boolean {
  const status = document.querySelector<HTMLElement>('[data-device-switch-ready]');
  return status?.dataset.deviceSwitchReady === 'true';
}

function openSyncDetails() {
  const status = document.querySelector<HTMLDetailsElement>('[data-device-switch-ready]');
  status?.querySelector<HTMLElement>('summary')?.click();
}

function closeSheets() {
  const shell = document.getElementById(SHELL_ID);
  if (!shell) return;
  shell.dataset.sheetOpen = 'false';
  shell.querySelectorAll<HTMLElement>('.kqm-sheet').forEach(sheet => { sheet.dataset.open = 'false'; });
}

function openSheet(name: 'entry' | 'more') {
  const shell = document.getElementById(SHELL_ID);
  if (!shell) return;
  const sheet = shell.querySelector<HTMLElement>(`.kqm-sheet[data-sheet="${name}"]`);
  if (!sheet) return;
  const alreadyOpen = shell.dataset.sheetOpen === 'true' && sheet.dataset.open === 'true';
  closeSheets();
  if (!alreadyOpen) {
    shell.dataset.sheetOpen = 'true';
    sheet.dataset.open = 'true';
  }
}

function createAction(label: string, hint: string, pageId: string, afterNavigate?: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'kqm-action';
  button.innerHTML = `<strong>${label}</strong><span>${hint}</span>`;
  button.addEventListener('click', () => navigate(pageId, afterNavigate));
  return button;
}

function buildSheet(name: 'entry' | 'more'): HTMLElement {
  const sheet = document.createElement('section');
  sheet.className = 'kqm-sheet';
  sheet.dataset.sheet = name;
  sheet.dataset.open = 'false';
  sheet.setAttribute('aria-label', name === 'entry' ? 'Schnell eintragen' : 'Weitere mobile Bereiche');

  const title = document.createElement('div');
  title.className = 'kqm-sheet-title';
  title.textContent = name === 'entry' ? 'Schnell eintragen' : 'Mehr';
  sheet.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'kqm-action-grid';

  if (name === 'entry') {
    grid.append(
      createAction('Anwesenheit & Befinden', 'Da · Fehlt · Entschuldigt · Befinden', 'anwesenheit'),
      createAction('Mitarbeit +1', 'Direkt zur Mitarbeit der Notenmappe', 'noten', () => clickButtonByText('Mitarbeit')),
      createAction('Verhalten / Sozial', 'Status eines Kindes schnell festhalten', 'verhalten'),
      createAction('Kurze Notiz', 'Beobachtung oder Notiz erfassen', 'verhalten'),
      createAction('Schüler suchen', 'Kind in der Klassenliste öffnen', 'schueler'),
    );
  } else {
    grid.append(
      createAction('Notenmappe', 'Leistungen und Mitarbeit nachsehen', 'noten'),
      createAction('Schülerdossier', 'Kompakter Überblick pro Kind', 'dossier'),
      createAction('Klassenliste', 'Kinder suchen und Stammdaten ansehen', 'schueler'),
      createAction('Einstellungen', 'Nur wenn du wirklich etwas ändern musst', 'settings'),
    );
  }

  sheet.appendChild(grid);

  if (name === 'more') {
    const note = document.createElement('div');
    note.className = 'kqm-note';
    note.textContent = 'Lehrercockpit, Tafel, Widget-Dock und große Auswertungen sind am Smartphone bewusst ausgeblendet. Dafür Tablet oder Laptop verwenden.';
    sheet.appendChild(note);
  }

  return sheet;
}

function ensureShell() {
  if (document.getElementById(SHELL_ID)) return;

  const shell = document.createElement('div');
  shell.id = SHELL_ID;
  shell.dataset.sheetOpen = 'false';

  const header = document.createElement('header');
  header.className = 'kqm-header';
  header.innerHTML = `
    <div class="kqm-brand">
      <small>Klassio · Handy</small>
      <span class="kqm-title">Heute</span>
    </div>
    <button type="button" class="kqm-sync" aria-label="Synchronisierungsstatus öffnen" title="Synchronisierungsstatus öffnen" data-ready="false">
      <span class="kqm-sync-dot" aria-hidden="true"></span>
    </button>
  `;
  header.querySelector<HTMLButtonElement>('.kqm-sync')?.addEventListener('click', openSyncDetails);

  const backdrop = document.createElement('button');
  backdrop.type = 'button';
  backdrop.className = 'kqm-backdrop';
  backdrop.setAttribute('aria-label', 'Menü schließen');
  backdrop.addEventListener('click', closeSheets);

  const entrySheet = buildSheet('entry');
  const moreSheet = buildSheet('more');

  const nav = document.createElement('nav');
  nav.className = 'kqm-nav';
  nav.setAttribute('aria-label', 'Mobile Hauptnavigation');

  const navItems: Array<{ kind: string; label: string; page?: string; sheet?: 'entry' | 'more' }> = [
    { kind: 'today', label: 'Heute', page: 'dashboard' },
    { kind: 'classes', label: 'Klassen', page: 'klasse' },
    { kind: 'entry', label: 'Eintragen', sheet: 'entry' },
    { kind: 'more', label: 'Mehr', sheet: 'more' },
  ];

  navItems.forEach(item => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'kqm-nav-button';
    button.dataset.kind = item.kind;
    button.textContent = item.label;
    button.addEventListener('click', () => {
      if (item.page) navigate(item.page);
      if (item.sheet) openSheet(item.sheet);
    });
    nav.appendChild(button);
  });

  shell.append(header, backdrop, entrySheet, moreSheet, nav);
  document.body.appendChild(shell);
}

function updateShellState() {
  const shell = document.getElementById(SHELL_ID);
  if (!shell) return;

  const page = currentPageId();
  if (page === 'cockpit') {
    navigate('dashboard');
    return;
  }

  const title = shell.querySelector<HTMLElement>('.kqm-title');
  if (title) title.textContent = pageLabels[page] || 'Klassio';

  shell.querySelectorAll<HTMLButtonElement>('.kqm-nav-button').forEach(button => {
    const kind = button.dataset.kind;
    let active = false;
    if (kind === 'today') active = page === 'dashboard';
    if (kind === 'classes') active = page === 'klasse';
    if (kind === 'entry') active = entryPages.has(page);
    if (kind === 'more') active = !mainPages.has(page) && !entryPages.has(page);
    button.dataset.active = active ? 'true' : 'false';
  });

  const sync = shell.querySelector<HTMLElement>('.kqm-sync');
  if (sync) {
    const ready = getSyncReady();
    sync.dataset.ready = ready ? 'true' : 'false';
    sync.title = ready ? 'Synchronisiert · Details öffnen' : 'Synchronisierung läuft oder benötigt Aufmerksamkeit · Details öffnen';
    sync.setAttribute('aria-label', sync.title);
  }
}

function refreshMobileMode() {
  refreshScheduled = false;
  const mobile = window.matchMedia(MOBILE_QUERY).matches;
  document.documentElement.dataset.klassioMobileQuick = mobile ? 'true' : 'false';
  if (!mobile) {
    closeSheets();
    return;
  }

  ensureStyles();
  markDesktopNavigation();
  ensureShell();
  updateShellState();
}

function scheduleRefresh() {
  if (refreshScheduled) return;
  refreshScheduled = true;
  window.requestAnimationFrame(refreshMobileMode);
}

function startMobileQuickMode() {
  ensureStyles();
  scheduleRefresh();

  const media = window.matchMedia(MOBILE_QUERY);
  media.addEventListener('change', scheduleRefresh);

  observer = new MutationObserver(scheduleRefresh);
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['aria-current', 'data-device-switch-ready', 'data-account-sync-status', 'data-local-save-status'],
  });

  window.addEventListener('pageshow', scheduleRefresh);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startMobileQuickMode, { once: true });
} else {
  startMobileQuickMode();
}

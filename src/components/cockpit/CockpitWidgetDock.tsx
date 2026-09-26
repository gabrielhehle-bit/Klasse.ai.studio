import React, { useEffect, useRef, useState } from 'react';
import {
  COCKPIT_QUICKBAR_ITEMS,
  addCockpitQuickbarItem,
  moveCockpitQuickbarItem,
  removeCockpitQuickbarItem,
  type CockpitQuickbarId,
  type CockpitQuickbarSettings,
} from '../../lib/cockpitQuickbar';

type Props = {
  settings: CockpitQuickbarSettings;
  onChange: (update: (settings: CockpitQuickbarSettings) => CockpitQuickbarSettings) => void;
  onReset: () => void;
  onOpenWidget: (id: CockpitQuickbarId) => void;
  onAddWidget: () => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  activeTypes: readonly string[];
  minimizedTypes?: readonly string[];
  onRestoreMinimized?: (type: string) => void;
  hasClass: boolean;
  /** Width occupied by the pupil sidebar to the right of the actual board. */
  reservedRightPx?: number;
};

/** The dock only sends commands; it never copies, resets or writes widget layouts. */
export function CockpitWidgetDock({
  settings, onChange, onReset, onOpenWidget, onAddWidget, onToggleSidebar,
  sidebarOpen, activeTypes, minimizedTypes = [], onRestoreMinimized, hasClass,
  reservedRightPx = 0,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [draggedFavoriteId, setDraggedFavoriteId] = useState<CockpitQuickbarId | null>(null);
  const [search, setSearch] = useState('');
  const [confirmRemoveId, setConfirmRemoveId] = useState<CockpitQuickbarId | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'favorites' | 'add'>('favorites');
  const dockAreaRef = useRef<HTMLDivElement>(null);
  const draggedFavoriteRef = useRef<CockpitQuickbarId | null>(null);

  const favorites = COCKPIT_QUICKBAR_ITEMS.filter(item => settings.itemIds.includes(item.id))
    .sort((a, b) => settings.itemIds.indexOf(a.id) - settings.itemIds.indexOf(b.id));
  const metaFor = (type: string) => COCKPIT_QUICKBAR_ITEMS.find(item => item.id === type);

  const normalizedSearch = search.trim().toLocaleLowerCase('de');
  const matchesSearch = (item: (typeof COCKPIT_QUICKBAR_ITEMS)[number]) =>
    !normalizedSearch ||
    item.label.toLocaleLowerCase('de').includes(normalizedSearch) ||
    item.id.toLocaleLowerCase('de').includes(normalizedSearch);
  const selectedMatches = favorites.filter(matchesSearch);
  const availableMatches = COCKPIT_QUICKBAR_ITEMS.filter(item =>
    !settings.itemIds.includes(item.id) && matchesSearch(item));

  useEffect(() => {
    const node = dockAreaRef.current;
    if (!node) return;
    const update = () => setAvailableWidth(node.getBoundingClientRect().width);
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [reservedRightPx]);

  useEffect(() => {
    if (editing) return;
    setSearch('');
    setConfirmRemoveId(null);
    setConfirmReset(false);
    setSettingsTab('favorites');
  }, [editing]);

  useEffect(() => {
    if (!editing) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setEditing(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [editing]);

  // 6–8 favorites may keep their labels when the board is wide enough.
  // Larger sets automatically become icon-only instead of turning into a menu bar.
  const showFavoriteLabels =
    favorites.length <= 8 &&
    availableWidth >= Math.max(720, favorites.length * 86 + 220);

  const finishFavoriteDrag = (event?: React.PointerEvent<HTMLButtonElement>) => {
    if (event?.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    draggedFavoriteRef.current = null;
    setDraggedFavoriteId(null);
  };

  const moveDraggedFavorite = (event: React.PointerEvent<HTMLButtonElement>) => {
    const sourceId = draggedFavoriteRef.current;
    if (!editing || !sourceId) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-dock-favorite-id]');
    const targetId = target?.dataset.dockFavoriteId as CockpitQuickbarId | undefined;
    if (!targetId || targetId === sourceId) return;

    onChange(current => {
      const from = current.itemIds.indexOf(sourceId);
      const to = current.itemIds.indexOf(targetId);
      if (from < 0 || to < 0 || from === to) return current;
      const itemIds = [...current.itemIds];
      const [moved] = itemIds.splice(from, 1);
      itemIds.splice(to, 0, moved);
      return { ...current, itemIds };
    });
  };

  const requestRemove = (id: CockpitQuickbarId) => {
    if (confirmRemoveId !== id) {
      setConfirmRemoveId(id);
      setConfirmReset(false);
      return;
    }
    onChange(current => removeCockpitQuickbarItem(current, id));
    setConfirmRemoveId(null);
  };

  return (
    <div
      className="klassio-dock-row relative z-40 flex w-full min-w-0 shrink-0 pb-0.5 pt-1 no-print"
      style={{ paddingLeft: 4, paddingRight: Math.max(4, reservedRightPx + 4) }}
      data-board-right-inset={Math.round(reservedRightPx)}
    >
      <div ref={dockAreaRef} className="relative flex w-full min-w-0 justify-center">
      {minimizedTypes.length > 0 && (
        <div className="klassio-minimized-strip absolute bottom-full left-1/2 mb-1.5 flex w-max max-w-full -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-2xl border border-accent bg-white/95 p-1.5 shadow-lg backdrop-blur" aria-label="Minimierte Widgets">
          <span className="sticky left-0 z-10 flex min-h-10 shrink-0 items-center gap-1 rounded-xl bg-accent-soft px-2 text-[10px] font-black uppercase tracking-wide text-accent" aria-hidden="true">
            <span>▾</span><span>Minimiert</span>
          </span>
          {minimizedTypes.map(type => {
            const meta = metaFor(type);
            return <button type="button" key={type}
              onClick={() => onRestoreMinimized?.(type)}
              className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-accent bg-white px-2.5 text-xs font-bold text-slate-800 shadow-sm hover:bg-accent-soft"
              aria-label={(meta?.label || type) + ' wiederherstellen'}
              title={(meta?.label || type) + ' wiederherstellen'}>
              <span aria-hidden="true">{meta?.icon || '▣'}</span>
              <span>{meta?.label || type}</span>
            </button>;
          })}
        </div>
      )}
      <nav aria-label="Meine Widget-Favoriten"
        className="klassio-widget-dock relative flex w-fit max-w-full min-w-0 items-center gap-1.5 rounded-[20px] border border-slate-200 bg-white/95 p-1.5 text-slate-900 shadow-xl backdrop-blur">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:thin]"
          aria-label="Widget-Schnellzugriffe">
          {settings.enabled && favorites.map(item => {
            const isActive = activeTypes.includes(item.id);
            const isMinimized = minimizedTypes.includes(item.id);
            const actionLabel = isMinimized
              ? item.label + ' wieder einblenden'
              : isActive
                ? item.label + ' einklappen'
                : item.label + ' öffnen';
            return (
            <button type="button" key={item.id} disabled={!hasClass}
              data-dock-favorite-id={item.id}
              onClick={() => { if (!editing) onOpenWidget(item.id); }}
              onPointerDown={event => {
                if (!editing || !hasClass) return;
                event.preventDefault();
                event.stopPropagation();
                draggedFavoriteRef.current = item.id;
                setDraggedFavoriteId(item.id);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={moveDraggedFavorite}
              onPointerUp={finishFavoriteDrag}
              onPointerCancel={finishFavoriteDrag}
              title={editing ? item.label + ' · ziehen zum Verschieben' : actionLabel}
              aria-label={editing ? item.label + ' in der Favoritenleiste verschieben' : actionLabel}
              aria-pressed={isActive && !isMinimized}
              data-minimized={isMinimized ? "true" : "false"}
              className={`klassio-dock-favorite relative flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-xl border py-1 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus-ring disabled:opacity-40 ${showFavoriteLabels ? 'px-2.5' : 'px-2'} ${editing ? 'touch-none select-none cursor-grab active:cursor-grabbing' : ''} ${draggedFavoriteId === item.id ? 'scale-95 opacity-60 ring-2 ring-accent' : ''} ${
                isMinimized
                  ? 'border-accent bg-accent-soft text-accent opacity-80'
                  : isActive
                    ? 'border-accent bg-accent-soft text-accent shadow-sm'
                    : 'border-transparent text-slate-800 hover:border-accent hover:bg-accent-soft'
              }`}>
              <span aria-hidden="true" className="text-xl leading-none">{item.icon}</span>
              {showFavoriteLabels && <span className="max-w-24 truncate text-[11px] font-semibold leading-tight">{item.label}</span>}
              {isActive && !isMinimized && <span className="absolute -bottom-0.5 left-1/2 h-1.5 w-5 -translate-x-1/2 rounded-full bg-accent" aria-hidden="true" />}
              {isMinimized && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-black text-accent-text" aria-hidden="true">▾</span>}
            </button>
          )})}
        </div>
        <div className="klassio-dock-system flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        <button type="button" disabled={!hasClass} onClick={onAddWidget}
          aria-label="Weitere Widgets hinzufügen" title="Alle Widgets"
          className="klassio-dock-add klassio-dock-primary flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-accent px-3 text-accent-text shadow-md ring-1 ring-black/10 transition-all hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus-ring disabled:translate-y-0 disabled:opacity-40">
          <span className="text-2xl font-semibold leading-none" aria-hidden="true">+</span>
          <span className="hidden text-xs font-black sm:inline">Widgets</span>
        </button>
        <button type="button" disabled={!hasClass} onClick={() => setEditing(open => !open)}
          aria-label="Meine Widget-Leiste anpassen" aria-expanded={editing} title="Widget-Leiste anpassen"
          className={`flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border text-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus-ring disabled:opacity-40 ${editing ? 'border-accent bg-accent-soft text-accent' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-100'}`}>⚙️</button>
        <button type="button" onClick={onToggleSidebar}
          aria-label={sidebarOpen ? 'Schülerliste ausblenden' : 'Schülerliste einblenden'}
          aria-expanded={sidebarOpen} title={sidebarOpen ? 'Schülerliste ausblenden' : 'Schülerliste öffnen'}
          className={`flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border text-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus-ring ${sidebarOpen ? 'border-accent bg-accent-soft text-accent' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-100'}`}>👥</button>
        </div>

        {editing && (
          <section role="dialog" aria-label="Widget-Leiste anpassen"
            className="klassio-dock-config absolute bottom-full right-0 z-[1100] mb-2 flex max-h-[min(76dvh,640px)] w-[min(30rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 text-slate-900 shadow-2xl">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="min-w-0">
                <h2 className="text-base font-black">Widget-Leiste anpassen</h2>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  Füge jedes Widget hinzu. Entfernen ist absichtlich zweistufig, damit nichts durch einen Fehlklick verschwindet.
                </p>
              </div>
              <button type="button" onClick={() => setEditing(false)} aria-label="Widget-Leiste schließen"
                className="min-h-11 min-w-11 shrink-0 rounded-xl border border-slate-200 bg-white text-lg hover:bg-slate-50">✕</button>
            </div>

            <div className="mt-3 flex shrink-0 items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
              <div>
                <p className="text-sm font-bold">Leiste anzeigen</p>
                <p className="text-[11px] text-slate-500">{settings.itemIds.length} Widgets angeheftet</p>
              </div>
              <label className="relative inline-flex min-h-11 min-w-14 cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" checked={settings.enabled}
                  onChange={event => onChange(current => ({ ...current, enabled: event.target.checked }))} />
                <span className="h-7 w-12 rounded-full bg-slate-300 transition-colors peer-checked:bg-accent" />
                <span className="absolute left-1 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                <span className="sr-only">Widget-Leiste anzeigen</span>
              </label>
            </div>

            <div className="mt-3 grid shrink-0 grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Widget-Leiste verwalten">
              <button type="button" role="tab" aria-selected={settingsTab === 'favorites'}
                onClick={() => { setSettingsTab('favorites'); setSearch(''); setConfirmRemoveId(null); }}
                className={`min-h-11 rounded-lg px-3 text-xs font-black transition-colors ${settingsTab === 'favorites' ? 'klassio-dock-accent bg-white text-accent shadow-sm' : 'text-slate-600 hover:bg-white/70'}`}>
                Meine Leiste · {favorites.length}
              </button>
              <button type="button" role="tab" aria-selected={settingsTab === 'add'}
                onClick={() => { setSettingsTab('add'); setConfirmRemoveId(null); }}
                className={`min-h-11 rounded-lg px-3 text-xs font-black transition-colors ${settingsTab === 'add' ? 'klassio-dock-accent bg-white text-accent shadow-sm' : 'text-slate-600 hover:bg-white/70'}`}>
                Widget hinzufügen
              </button>
            </div>

            {settingsTab === 'add' && (
              <div className="relative mt-3 shrink-0">
                <input type="search" value={search} onChange={event => {
                    setSearch(event.target.value);
                    setConfirmRemoveId(null);
                  }}
                  placeholder="Widget suchen …"
                  aria-label="Widgets für die Leiste suchen"
                  autoFocus
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pr-12 text-sm font-semibold outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft" />
                {search && <button type="button" onClick={() => setSearch('')} aria-label="Suche leeren"
                  className="absolute right-0 top-0 flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100">✕</button>}
              </div>
            )}

            <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
              {settingsTab === 'favorites' ? (
              <section aria-labelledby="dock-selected-heading">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 id="dock-selected-heading" className="text-xs font-black uppercase tracking-wide text-slate-500">In meiner Leiste</h3>
                  <span className="rounded-full bg-accent-soft px-2 py-1 text-[10px] font-black text-accent">{selectedMatches.length}</span>
                </div>
                {selectedMatches.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-500">
                    {normalizedSearch ? 'Kein angeheftetes Widget passt zur Suche.' : 'Noch keine Widgets angeheftet.'}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedMatches.map(item => {
                      const index = settings.itemIds.indexOf(item.id);
                      const confirming = confirmRemoveId === item.id;
                      return <div key={item.id} className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg" aria-hidden="true">{item.icon}</span>
                        <span className="min-w-0 flex-1 truncate text-sm font-bold">{item.label}</span>
                        <div className="flex shrink-0 items-center gap-1">
                          <button type="button" aria-label={item.label + ' nach links verschieben'} disabled={index <= 0}
                            onClick={() => { setConfirmRemoveId(null); onChange(current => moveCockpitQuickbarItem(current, item.id, -1)); }}
                            className="min-h-11 min-w-10 rounded-lg border border-slate-200 bg-white text-sm font-bold disabled:opacity-30">←</button>
                          <button type="button" aria-label={item.label + ' nach rechts verschieben'} disabled={index >= settings.itemIds.length - 1}
                            onClick={() => { setConfirmRemoveId(null); onChange(current => moveCockpitQuickbarItem(current, item.id, 1)); }}
                            className="min-h-11 min-w-10 rounded-lg border border-slate-200 bg-white text-sm font-bold disabled:opacity-30">→</button>
                          <button type="button"
                            onClick={() => requestRemove(item.id)}
                            aria-label={confirming ? item.label + ' wirklich aus der Leiste entfernen' : item.label + ' aus der Leiste entfernen'}
                            className={`min-h-11 rounded-lg border px-2.5 text-xs font-black transition-colors ${confirming ? 'klassio-dock-danger border-danger bg-danger text-white' : 'border-slate-200 bg-white text-danger hover:bg-danger-soft'}`}>
                            {confirming ? 'Ja, entfernen' : 'Entfernen'}
                          </button>
                        </div>
                      </div>;
                    })}
                  </div>
                )}
              </section>
              ) : (
              <section aria-labelledby="dock-available-heading">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <h3 id="dock-available-heading" className="text-xs font-black uppercase tracking-wide text-slate-500">Weitere Widgets</h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">Alle Widgets aus der Bibliothek können angeheftet werden.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">{availableMatches.length}</span>
                </div>
                {availableMatches.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-500">
                    {normalizedSearch ? 'Keine weiteren Widgets passen zur Suche.' : 'Alle verfügbaren Widgets sind bereits angeheftet.'}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {availableMatches.map(item => <div key={item.id}
                      className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg" aria-hidden="true">{item.icon}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{item.label}</span>
                      <button type="button"
                        onClick={() => { setConfirmRemoveId(null); onChange(current => addCockpitQuickbarItem(current, item.id)); }}
                        aria-label={item.label + ' zur Widget-Leiste hinzufügen'}
                        className="klassio-dock-primary min-h-11 shrink-0 rounded-lg bg-accent px-3 text-xs font-black text-accent-text hover:bg-accent-hover">
                        + Hinzufügen
                      </button>
                    </div>)}
                  </div>
                )}
              </section>
              )}
            </div>

            <div className="mt-3 flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <p className="text-[11px] text-slate-500">Reihenfolge: hier mit Pfeilen oder direkt unten per Ziehen.</p>
              <button type="button"
                onClick={() => {
                  if (!confirmReset) {
                    setConfirmReset(true);
                    setConfirmRemoveId(null);
                    return;
                  }
                  onReset();
                  setConfirmReset(false);
                  setEditing(false);
                }}
                className={`min-h-11 shrink-0 rounded-xl border px-3 text-xs font-bold ${confirmReset ? 'border-amber-300 bg-amber-100 text-amber-900' : 'border-slate-300 bg-slate-50 text-slate-700'}`}>
                {confirmReset ? 'Ja, Standard laden' : 'Standard wiederherstellen'}
              </button>
            </div>
          </section>
        )}
      </nav>
      </div>
    </div>
  );
}

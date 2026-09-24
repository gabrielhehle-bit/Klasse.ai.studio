import React, { useState } from 'react';
import {
  COCKPIT_QUICKBAR_ITEMS, moveCockpitQuickbarItem, toggleCockpitQuickbarItem,
  type CockpitQuickbarId, type CockpitQuickbarSettings,
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
  hasClass: boolean;
};

/** The dock only sends commands; it never copies, resets or writes widget layouts. */
export function CockpitWidgetDock({
  settings, onChange, onReset, onOpenWidget, onAddWidget, onToggleSidebar,
  sidebarOpen, activeTypes, hasClass,
}: Props) {
  const [editing, setEditing] = useState(false);
  const favorites = COCKPIT_QUICKBAR_ITEMS.filter(item => settings.itemIds.includes(item.id))
    .sort((a, b) => settings.itemIds.indexOf(a.id) - settings.itemIds.indexOf(b.id));
  return (
    <div className="klassio-dock-row relative z-40 flex w-full min-w-0 shrink-0 justify-center px-1 pb-0.5 pt-1 no-print">
      <nav aria-label="Meine Widget-Favoriten"
        className="klassio-widget-dock relative flex w-fit max-w-full items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 text-slate-900 shadow-lg">
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:thin]"
          aria-label="Widget-Schnellzugriffe">
          {settings.enabled && favorites.map(item => (
            <button type="button" key={item.id} disabled={!hasClass}
              onClick={() => onOpenWidget(item.id)}
              title={item.label}
              aria-label={item.label + ' auf der Tafel öffnen'}
              aria-pressed={activeTypes.includes(item.id)}
              className="klassio-dock-favorite flex min-h-11 min-w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-transparent px-2 py-1 text-slate-800 hover:border-indigo-200 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 aria-pressed:bg-indigo-100 aria-pressed:text-indigo-950 disabled:opacity-40">
              <span aria-hidden="true" className="text-xl leading-none">{item.icon}</span>
              <span className="hidden max-w-24 truncate text-[11px] font-semibold leading-tight md:block">{item.label}</span>
            </button>
          ))}
        </div>
        <div className="mx-0.5 h-8 w-px shrink-0 bg-slate-200" aria-hidden="true" />
        <button type="button" disabled={!hasClass} onClick={onAddWidget}
          aria-label="Weitere Widgets hinzufügen" title="Alle Widgets"
          className="klassio-dock-add flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-700 px-2 text-2xl font-semibold text-white hover:bg-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-40">+</button>
        <button type="button" disabled={!hasClass} onClick={() => setEditing(open => !open)}
          aria-label="Meine Widget-Leiste anpassen" aria-expanded={editing} title="Favoriten bearbeiten"
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl text-slate-800 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-40">⚙️</button>
        <button type="button" onClick={onToggleSidebar}
          aria-label={sidebarOpen ? 'Schülerliste ausblenden' : 'Schülerliste einblenden'}
          aria-expanded={sidebarOpen} title={sidebarOpen ? 'Schülerliste ausblenden' : 'Schülerliste öffnen'}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl text-slate-800 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">👥</button>
        {editing && (
          <section role="dialog" aria-label="Widget-Leiste anpassen"
            className="klassio-dock-config absolute bottom-full right-0 z-[1100] mb-2 flex max-h-[min(70dvh,540px)] w-[min(23rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 shadow-2xl">
            <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
              <h2 className="text-base font-bold">Meine Widget-Leiste</h2>
              <button type="button" onClick={() => setEditing(false)} aria-label="Widget-Leiste schließen"
                className="min-h-11 min-w-11 rounded-xl border border-slate-200 bg-white text-lg">✕</button>
            </div>
            <label className="mb-2 flex min-h-11 items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={settings.enabled}
                onChange={event => onChange(current => ({ ...current, enabled: event.target.checked }))} />
              Favoriten anzeigen
            </label>
            <p className="mb-2 text-xs text-slate-600">Wähle deine Favoriten und bestimme ihre Reihenfolge. Mit + bleiben alle Widgets erreichbar.</p>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain">
              {COCKPIT_QUICKBAR_ITEMS.map(item => {
                const selected = settings.itemIds.includes(item.id);
                const index = settings.itemIds.indexOf(item.id);
                return <div key={item.id} className="flex min-h-11 items-center gap-1 rounded-xl border border-slate-200 px-2">
                  <label className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" checked={selected}
                      onChange={() => onChange(current => toggleCockpitQuickbarItem(current, item.id))} />
                    <span className="shrink-0" aria-hidden="true">{item.icon}</span>
                    <span className="min-w-0 break-words">{item.label}</span>
                  </label>
                  {selected && <div className="flex shrink-0 gap-1">
                    <button type="button" aria-label={item.label + ' nach links verschieben'} disabled={index <= 0}
                      onClick={() => onChange(current => moveCockpitQuickbarItem(current, item.id, -1))}
                      className="min-h-11 min-w-9 rounded-lg border border-slate-200 bg-white disabled:opacity-30">←</button>
                    <button type="button" aria-label={item.label + ' nach rechts verschieben'} disabled={index >= settings.itemIds.length - 1}
                      onClick={() => onChange(current => moveCockpitQuickbarItem(current, item.id, 1))}
                      className="min-h-11 min-w-9 rounded-lg border border-slate-200 bg-white disabled:opacity-30">→</button>
                  </div>}
                </div>;
              })}
            </div>
            <button type="button" onClick={onReset}
              className="mt-2 min-h-11 shrink-0 rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-semibold">
              Favoriten zurücksetzen
            </button>
          </section>
        )}
      </nav>
    </div>
  );
}

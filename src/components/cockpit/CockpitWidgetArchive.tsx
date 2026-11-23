import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { COCKPIT_ARCHIVED_WIDGETS } from '../../lib/cockpitRegularCatalog';
import { matchesCockpitWidgetSearch, splitCockpitWidgetLabel, type CockpitWidgetLibraryId } from '../../lib/cockpitWidgetCatalog';

const archiveItems = COCKPIT_ARCHIVED_WIDGETS
  .map(item => ({ ...item, ...splitCockpitWidgetLabel(item.label) }))
  .sort((a, b) => a.label.localeCompare(b.label, 'de'));

type Props = {
  savedTypes: readonly string[];
  pinnedTypes: readonly string[];
  onOpenWidget: (type: CockpitWidgetLibraryId) => void;
  onClose: () => void;
};

export function CockpitWidgetArchive({ savedTypes, pinnedTypes, onOpenWidget, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, []);

  const hasSavedData = (type: string) => savedTypes.includes(type) || pinnedTypes.includes(type);
  const ordered = archiveItems.filter(item => hasSavedData(item.type) && matchesCockpitWidgetSearch(item, query));

  return createPortal(
    <dialog ref={dialogRef} onClose={onClose} aria-labelledby="cockpit-archive-title"
      onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation(); }}
      className="fixed inset-0 m-auto h-[min(78dvh,42rem)] w-[min(94vw,36rem)] max-w-none rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50">
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div>
            <h2 id="cockpit-archive-title" className="text-lg font-black">Widget-Archiv</h2>
            <p className="mt-1 text-sm text-slate-600">Alte Werkzeuge und ihre gespeicherten Einstellungen für diese Tafelseite.</p>
          </div>
          <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Widget-Archiv schließen"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 hover:bg-slate-100">
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <label className="mx-4 my-3 flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-300 px-3 focus-within:border-accent sm:mx-5">
          <Search size={17} className="shrink-0 text-slate-500" aria-hidden="true" />
          <input type="search" autoFocus aria-label="Archivierte Widgets suchen" placeholder="Archiv durchsuchen" value={query}
            onChange={event => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-5">
          <p role="status" className="mb-2 text-xs text-slate-600">{ordered.length} {ordered.length === 1 ? 'Widget' : 'Widgets'}</p>
          <ul className="space-y-1.5">
            {ordered.map(item => (
              <li key={item.type}>
                <button type="button" data-archived-widget={item.type} onClick={() => onOpenWidget(item.type)}
                  className="flex min-h-11 w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-slate-200 px-3 py-2 text-left text-sm font-semibold hover:border-accent hover:bg-accent-soft">
                  <span><span className="mr-2" aria-hidden="true">{item.icon}</span>{item.label}</span>
                  {hasSavedData(item.type) && (
                    <span className="text-xs font-medium text-slate-600">
                      {savedTypes.includes(item.type) ? 'Auf dieser Tafel gespeichert' : 'Früher angeheftet'}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {!ordered.length && <p className="py-3 text-sm text-slate-600">{query.trim() ? 'Kein passendes Widget im Archiv.' : 'Auf dieser Tafelseite sind keine früheren Widgets gespeichert oder angeheftet.'}</p>}
        </div>
      </div>
    </dialog>,
    document.body,
  );
}

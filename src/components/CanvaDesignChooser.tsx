import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';

export interface CanvaDesignChoice {
  id: string;
  title?: string;
  thumbnail?: { url?: string };
  urls?: { edit_url?: string };
}

interface Props {
  onChoose: (design: CanvaDesignChoice) => void | Promise<void>;
  onClose: () => void;
  busy?: boolean;
}

/** Shared chooser for the Canva tab and the cockpit's own background control. */
export function CanvaDesignChooser({ onChoose, onClose, busy = false }: Props) {
  const [designs, setDesigns] = useState<CanvaDesignChoice[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const statusResponse = await fetch('/api/canva/status');
        const status = await statusResponse.json().catch(() => ({}));
        if (!statusResponse.ok || !status.connected) {
          if (!cancelled) { setConnected(false); setError('Bitte Canva zuerst unter Tools → Canva verbinden.'); }
          return;
        }
        if (!cancelled) setConnected(true);
        const response = await fetch('/api/canva/designs?limit=50&sort_by=modified_descending');
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || 'Canva-Designs konnten nicht geladen werden.');
        if (!cancelled) setDesigns(data?.items || data?.designs || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Canva ist nicht erreichbar.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const visible = useMemo(() => designs.filter(design =>
    (design.title || 'Unbenanntes Design').toLocaleLowerCase('de').includes(query.toLocaleLowerCase('de'))
  ), [designs, query]);

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 p-4"
      role="dialog" aria-modal="true" aria-label="Canva-Design auswählen"
      onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-[var(--text)] shadow-2xl">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black">Canva-Design auswählen</h2>
            <p className="text-xs text-[var(--text2)]">Für mehrseitige Designs wird die erste Seite übernommen.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Schließen"
            className="rounded-lg p-2 hover:bg-[var(--surface2)]"><X size={20} /></button>
        </header>
        {connected && !loading && !error && (
          <label className="relative my-4 block">
            <Search size={16} className="absolute left-3 top-3 text-[var(--text2)]" />
            <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface2)] py-2.5 pl-10 pr-3"
              placeholder="Design suchen" value={query} onChange={event => setQuery(event.target.value)} />
          </label>
        )}
        {loading ? <div className="p-12 text-center"><Loader2 className="mx-auto animate-spin" /></div>
          : error ? <p role="alert" className="py-8 text-sm">{error}</p>
          : visible.length === 0 ? <p className="py-10 text-center text-sm">Keine passenden Designs gefunden.</p>
          : (
            <div className="grid grid-cols-2 gap-3 overflow-y-auto py-4 sm:grid-cols-3">
              {visible.map(design => (
                <button type="button" key={design.id} disabled={busy} onClick={() => void onChoose(design)}
                  className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface2)] text-left hover:border-[var(--accent)] disabled:opacity-60">
                  <div className="flex h-28 items-center justify-center bg-white">
                    {design.thumbnail?.url
                      ? <img alt="" src={design.thumbnail.url} className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                      : <span className="text-xs text-slate-500">Keine Vorschau</span>}
                  </div>
                  <span className="block truncate p-2 text-xs font-semibold">{design.title || 'Unbenanntes Design'}</span>
                </button>
              ))}
            </div>
          )}
        {busy && <p role="status" className="py-2 text-center text-sm">Canva-Bild wird importiert …</p>}
      </div>
    </div>
  );
}

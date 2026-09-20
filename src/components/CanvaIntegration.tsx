import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ExternalLink, FileDown, FileText, Image, Loader2, LogOut, Palette,
  Plus, Presentation, RefreshCw, Search, ShieldCheck, Sparkles
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useApp } from '../context/AppContext';
import { addCanvaImageWidget, canSaveCanvaMaterial, createCanvaMaterial, importCanvaImage } from '../lib/canvaImageImport';
import { isTrustedOAuthPopupMessage } from '../lib/oauthPopupSecurity';

type CanvaDesign = {
  id: string;
  title?: string;
  design_type?: { type?: string; name?: string };
  urls?: { edit_url?: string; view_url?: string };
  thumbnail?: { url?: string };
  updated_at?: string;
};

type CanvaStatus = {
  configured: boolean;
  connected: boolean;
  requiresEmailLogin?: boolean;
  reason?: string;
};

const apiJson = async (url: string, init?: RequestInit) => {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `Canva-Anfrage fehlgeschlagen (${response.status})`);
  return data;
};

export default function CanvaIntegration() {
  const { showToast } = useToast();
  const { app, setApp, setPage } = useApp();
  const [status, setStatus] = useState<CanvaStatus>({ configured: false, connected: false });
  const [designs, setDesigns] = useState<CanvaDesign[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [designLoading, setDesignLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const oauthPopupRef = useRef<Window | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const data = await apiJson('/api/canva/status');
      setStatus(data);
      return data as CanvaStatus;
    } catch {
      setStatus({ configured: false, connected: false });
      return { configured: false, connected: false } as CanvaStatus;
    }
  }, []);

  const loadDesigns = useCallback(async (search = '') => {
    setDesignLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50', sort_by: 'modified_descending' });
      if (search.trim()) params.set('query', search.trim());
      const data = await apiJson(`/api/canva/designs?${params.toString()}`);
      setDesigns(data?.items || data?.designs || []);
    } catch (error: any) {
      if (!/nicht verbunden|401/i.test(error?.message || '')) {
        showToast(error?.message || 'Canva-Designs konnten nicht geladen werden.', 'error');
      }
      setDesigns([]);
    } finally {
      setDesignLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    let active = true;
    (async () => {
      const next = await refreshStatus();
      if (active && next.connected) await loadDesigns();
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [refreshStatus, loadDesigns]);

  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (!isTrustedOAuthPopupMessage(event.origin, event.source, window.location.origin, oauthPopupRef.current)) return;
      if (event.data?.type === 'CANVA_AUTH_SUCCESS') {
        oauthPopupRef.current = null;
        const verified = await refreshStatus();
        if (!verified.connected) {
          showToast('Canva hat die Verbindung nicht bestätigt. Bitte Cookies zulassen und erneut verbinden.', 'error');
          return;
        }
        await loadDesigns();
        showToast('Canva ist verbunden.', 'success');
      }
      if (event.data?.type === 'CANVA_AUTH_ERROR') {
        oauthPopupRef.current = null;
        showToast(event.data?.error || 'Canva-Verbindung fehlgeschlagen.', 'error');
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [loadDesigns, refreshStatus, showToast]);

  const connect = async () => {
    // Open synchronously in the click gesture. An asynchronous window.open()
    // after fetching the OAuth URL is rejected by pop-up blockers in Chrome.
    const popup = window.open('', 'klassio-canva-oauth', 'width=720,height=780,resizable=yes,scrollbars=yes');
    if (!popup) {
      showToast('Bitte Pop-ups für Klassio erlauben, damit Canva geöffnet werden kann.', 'info');
      return;
    }
    oauthPopupRef.current = popup;
    try {
      const data = await apiJson('/api/canva/auth-url');
      if (!data?.configured) {
        popup.close();
        oauthPopupRef.current = null;
        showToast('Canva ist serverseitig noch nicht konfiguriert.', 'info');
        return;
      }
      const target = new URL(String(data.url));
      if (target.protocol !== 'https:' || target.hostname !== 'www.canva.com' || target.pathname !== '/api/oauth/authorize') {
        throw new Error('Canva hat eine unerwartete Anmeldeadresse geliefert.');
      }
      popup.location.replace(target.toString());
    } catch (error: any) {
      popup.close();
      oauthPopupRef.current = null;
      showToast(error?.message || 'Canva-Verbindung konnte nicht gestartet werden.', 'error');
    }
  };

  const disconnect = async () => {
    setActionLoading('disconnect');
    try {
      await apiJson('/api/canva/disconnect', { method: 'POST' });
      setStatus(prev => ({ ...prev, connected: false }));
      setDesigns([]);
      showToast('Canva wurde getrennt.', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Canva konnte nicht getrennt werden.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const createDesign = async (kind: 'a4' | 'presentation' | 'whiteboard' | 'doc') => {
    const editor = window.open('', '_blank', 'width=1100,height=850,resizable=yes,scrollbars=yes');
    if (!editor) {
      showToast('Bitte Pop-ups für Klassio erlauben, um Canva zu öffnen.', 'info');
      return;
    }
    editor.document.body.textContent = 'Canva-Design wird vorbereitet …';
    setActionLoading(kind);
    try {
      const titles: Record<typeof kind, string> = {
        a4: 'Klassio Arbeitsblatt',
        presentation: 'Klassio Präsentation',
        whiteboard: 'Klassio Whiteboard',
        doc: 'Klassio Dokument'
      };
      const data = await apiJson('/api/canva/designs', {
        method: 'POST',
        body: JSON.stringify({ kind, title: titles[kind] })
      });
      const design: CanvaDesign | undefined = data?.design;
      const editUrl = design?.urls?.edit_url || data?.urls?.edit_url;
      if (!editUrl) throw new Error('Canva hat keine Bearbeitungsadresse geliefert.');
      const target = new URL(editUrl);
      if (target.protocol !== 'https:' || !['www.canva.com', 'canva.com'].includes(target.hostname)) {
        throw new Error('Canva hat eine unerwartete Bearbeitungsadresse geliefert.');
      }
      editor.location.replace(target.toString());
      await loadDesigns(query);
      showToast('Canva-Design wurde erstellt.', 'success');
    } catch (error: any) {
      editor.close();
      showToast(error?.message || 'Design konnte nicht erstellt werden.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const exportDesign = async (design: CanvaDesign, format: 'pdf' | 'png' | 'jpg' | 'pptx') => {
    const download = window.open('', '_blank', 'width=640,height=480,resizable=yes');
    if (!download) {
      showToast('Bitte Pop-ups für Klassio erlauben, um den Canva-Export zu öffnen.', 'info');
      return;
    }
    download.document.body.textContent = 'Canva bereitet den Download vor …';
    const key = `export-${design.id}-${format}`;
    setActionLoading(key);
    try {
      const created = await apiJson('/api/canva/exports', {
        method: 'POST',
        body: JSON.stringify({ design_id: design.id, format })
      });
      const jobId = created?.job?.id || created?.id;
      if (!jobId) throw new Error('Canva hat keine Export-ID zurückgegeben.');

      for (let attempt = 0; attempt < 30; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const job = await apiJson(`/api/canva/exports/${encodeURIComponent(jobId)}`);
        const state = job?.job?.status || job?.status;
        const urls = job?.job?.urls || job?.urls;
        if (state === 'success' && Array.isArray(urls) && urls[0]) {
          const target = new URL(urls[0]);
          if (target.protocol !== 'https:' || target.hostname !== 'export-download.canva.com') {
            throw new Error('Canva hat eine unerwartete Exportadresse geliefert.');
          }
          download.location.replace(target.toString());
          return;
        }
        if (state === 'failed') throw new Error(job?.job?.error?.message || 'Canva-Export fehlgeschlagen.');
      }
      throw new Error('Der Canva-Export dauert länger als erwartet. Bitte später erneut versuchen.');
    } catch (error: any) {
      download.close();
      showToast(error?.message || 'Canva-Export fehlgeschlagen.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const useDesignInKlassio = async (design: CanvaDesign, destination: 'background' | 'widget' | 'library') => {
    const key = 'import-' + design.id + '-' + destination;
    setActionLoading(key);
    try {
      const image = await importCanvaImage(design.id);
      const title = design.title || 'Canva-Design';
      if (destination === 'background') {
        setApp(prev => ({
          ...prev,
          unterrichtsmodus_canvaBild: image,
          unterrichtsmodus_canvaTitel: title,
          unterrichtsmodus_hintergrund: 'canva',
        }));
        showToast('Canva-Hintergrund übernommen. Die Tafelfläche bleibt beschreibbar.', 'success');
        setPage('cockpit');
      } else if (destination === 'widget') {
        // Do not create a second full-size library copy merely to display a widget.
        setApp(prev => ({
          ...prev,
          cockpitLayout: addCanvaImageWidget(prev.cockpitLayout, image, title),
        }));
        showToast('Canva-Bild im Lehrercockpit eingefügt.', 'success');
        setPage('cockpit');
      } else {
        const material = createCanvaMaterial(title, image);
        if (!canSaveCanvaMaterial(app.materialien || [], material)) {
          throw new Error('Die Materialbibliothek ist voll (maximal 5 MB). Bitte zuerst alte Dateien entfernen.');
        }
        setApp(prev => ({
          ...prev,
          materialien: [...(prev.materialien || []), material],
        }));
        showToast('Canva-Bild in der Materialbibliothek gespeichert.', 'success');
      }
    } catch (error: any) {
      showToast(error?.message || 'Canva-Bild konnte nicht importiert werden.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const visibleDesigns = useMemo(() => designs, [designs]);

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-[var(--accent)]" size={28} /></div>;
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <header className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--accent)]">
              <Palette size={16} /> Canva
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">Mit Canva gestalten</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-[var(--text2)]">
              Designs werden in deinem Canva-Konto erstellt und im offiziellen Canva-Editor bearbeitet. Klassio speichert keine Canva-Zugangstokens im Browser.
            </p>
          </div>
          {status.connected ? (
            <button type="button" onClick={disconnect} disabled={actionLoading === 'disconnect'}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border2)] bg-[var(--surface2)] px-4 text-sm font-bold text-[var(--text2)] hover:bg-[var(--surface3)]">
              {actionLoading === 'disconnect' ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />} Trennen
            </button>
          ) : null}
        </div>
      </header>

      {!status.configured ? (
        <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6">
          <h2 className="font-black text-amber-950">Canva muss einmal serverseitig eingerichtet werden</h2>
          <p className="mt-2 text-sm leading-relaxed text-amber-900">
            Dafür werden eine Canva-Integration, Client-ID, Client-Secret und die Klassio-Callback-URL benötigt. Bis dahin bleiben alle anderen Klassio-Funktionen unverändert nutzbar.
          </p>
        </section>
      ) : !status.connected ? (
        <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]"><ShieldCheck size={23} /></span>
            <div className="flex-1">
              <h2 className="font-black text-[var(--text)]">Canva verbinden</h2>
              <p className="mt-1 text-sm leading-relaxed text-[var(--text2)]">
                {status.requiresEmailLogin
                  ? 'Bitte melde dich zuerst mit deiner E-Mail-Adresse bei Klassio an. Die Canva-Verbindung gehört nur zu deinem Konto.'
                  : 'Die Anmeldung läuft über Canva OAuth 2.0 mit PKCE. Zugangstokens bleiben verschlüsselt und kontogebunden auf dem Klassio-Server.'}
              </p>
            </div>
            <button type="button" onClick={connect} disabled={status.requiresEmailLogin}
              title={status.requiresEmailLogin ? 'Zuerst mit der Schul-E-Mail-Adresse bei Klassio anmelden' : undefined}
              className="min-h-11 rounded-xl bg-[var(--accent)] px-5 text-sm font-black text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50">Mit Canva verbinden</button>
          </div>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {([
              ['a4', 'A4-Arbeitsblatt', FileText],
              ['presentation', 'Präsentation', Presentation],
              ['whiteboard', 'Whiteboard', Sparkles],
              ['doc', 'Canva Doc', FileText]
            ] as const).map(([kind, label, Icon]) => (
              <button key={kind} type="button" onClick={() => createDesign(kind)} disabled={Boolean(actionLoading)}
                className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-4 text-center font-black text-[var(--text)] shadow-sm transition hover:border-[var(--accent)]/40 hover:shadow-md">
                {actionLoading === kind ? <Loader2 className="animate-spin text-[var(--accent)]" size={22} /> : <Icon className="text-[var(--accent)]" size={22} />}
                <span className="text-sm">{label}</span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--text3)]"><Plus size={12} /> Neu</span>
              </button>
            ))}
          </section>

          <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative flex-1">
                <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
                <input value={query} onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void loadDesigns(query); }}
                  placeholder="Canva-Designs suchen..."
                  className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface2)] pl-10 pr-3 text-sm text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--accent)]" />
              </label>
              <button type="button" onClick={() => loadDesigns(query)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 text-sm font-bold text-[var(--text2)] hover:bg-[var(--surface2)]">
                <RefreshCw size={15} className={designLoading ? 'animate-spin' : ''} /> Aktualisieren
              </button>
            </div>

            {designLoading ? (
              <div className="flex min-h-48 items-center justify-center"><Loader2 className="animate-spin text-[var(--accent)]" size={24} /></div>
            ) : visibleDesigns.length === 0 ? (
              <div className="py-16 text-center text-sm font-medium text-[var(--text3)]">Keine Canva-Designs gefunden.</div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleDesigns.map(design => (
                  <article key={design.id} className="overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface2)]">
                    {design.thumbnail?.url ? <img src={design.thumbnail.url} alt="" className="h-36 w-full object-cover" referrerPolicy="no-referrer" /> : null}
                    <div className="p-4">
                      <h3 className="truncate font-black text-[var(--text)]">{design.title || 'Unbenanntes Design'}</h3>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {([
                          ['background', 'Als Cockpit-Hintergrund'],
                          ['widget', 'Als Bild-Widget'],
                          ['library', 'In Materialbibliothek']
                        ] as const).map(([destination, label]) => (
                          <button key={destination} type="button"
                            onClick={() => void useDesignInKlassio(design, destination)}
                            disabled={Boolean(actionLoading)}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--accent)] px-2.5 text-xs font-bold text-[var(--text)] hover:bg-[var(--surface3)] disabled:opacity-50">
                            {actionLoading === 'import-' + design.id + '-' + destination ? <Loader2 size={12} className="animate-spin" /> : <Image size={12} />}
                            {label}
                          </button>
                        ))}
                        {design.urls?.edit_url ? (
                          <a href={design.urls.edit_url} target="_blank" rel="noreferrer"
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 text-xs font-black text-white">
                            <ExternalLink size={13} /> Bearbeiten
                          </a>
                        ) : null}
                        {(['pdf', 'png', 'jpg', 'pptx'] as const).map(format => (
                          <button key={format} type="button" onClick={() => exportDesign(design, format)} disabled={Boolean(actionLoading)}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-xs font-bold text-[var(--text2)] hover:bg-[var(--surface3)]">
                            {actionLoading === `export-${design.id}-${format}` ? <Loader2 size={12} className="animate-spin" /> : format === 'png' || format === 'jpg' ? <Image size={12} /> : <FileDown size={12} />}
                            {format.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

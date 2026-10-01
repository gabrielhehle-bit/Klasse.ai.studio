import { createPortal } from 'react-dom';
import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { saveSyncPresentation } from '../lib/saveSyncPresentation';
import { classRoomFingerprint } from '../lib/teamTeachingCrypto';
import { syncActiveClass } from '../lib/appState';
const time = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('de-AT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Noch keine Bestätigung';
export default function SaveSyncStatus({ onOpenTeam, fullWidth = false, compact = false }: { onOpenTeam?: () => void; fullWidth?: boolean; compact?: boolean }) {
  const { app, localSaveStatus, localSaveLastAt, accountSyncStatus, accountSyncLastAt, accountLiveStatus, accountSyncMessage, retryAccountSync, setPage } = useApp();
  const [online, setOnline] = useState(() => navigator.onLine);
  const [detailsOpen, setDetailsOpen] = useState(false);
  useEffect(() => {
    if (!detailsOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setDetailsOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [detailsOpen]);
  const [retrying, setRetrying] = useState(false);
  useEffect(() => { const update = () => setOnline(navigator.onLine); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); }; }, []);
  const room = syncActiveClass(app).classes?.find(candidate => candidate.id === app.activeClassId);
  const meta = room?.teamTeaching;
  const team = meta ? meta.syncStatus === 'conflict' ? 'conflict' : meta.syncStatus === 'error' ? 'error' : meta.syncStatus === 'synced' && classRoomFingerprint(room!) === meta.lastSyncedHash ? 'synced' : 'pending' : room?.teamTeachingSharedClassId ? 'pending' : undefined;
  const state = saveSyncPresentation(localSaveStatus, accountSyncStatus, online, team);
  return <details open={detailsOpen} onToggle={event => setDetailsOpen(event.currentTarget.open)} className={`relative min-w-0 text-left text-slate-900 ${compact ? "w-fit self-start" : ""} ${fullWidth ? "w-full" : "max-w-[min(15rem,45vw)]"}`} data-account-live-status={accountLiveStatus} data-account-sync-status={accountSyncStatus} data-local-save-status={localSaveStatus} data-device-switch-ready={state.ready}>
    <summary aria-label={`Speicherstatus: ${state.label}`} title={`${state.label}${accountLiveStatus === 'live' ? ' · Live-Abgleich aktiv' : ''} · Details öffnen`}
      className={`${compact ? 'min-h-6 rounded-md px-1.5 py-0.5 text-[10px]' : 'min-h-11 rounded-lg px-2 py-1 text-[11px]'} cursor-pointer list-none border font-semibold leading-tight flex items-center gap-1.5 ${state.ready ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : state.attention ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
      {compact && <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${state.ready ? 'bg-emerald-600' : state.attention ? 'bg-rose-600' : 'bg-amber-500'}`} />}
      <span role="status">{compact ? `${state.compactLabel}${accountLiveStatus === 'live' ? ' · live' : ''}` : state.label}{!compact && accountLiveStatus === 'live' && <span className="block text-[10px] font-normal">Live-Abgleich aktiv</span>}</span>
    </summary>
    {detailsOpen && createPortal(<><div className="fixed inset-0 z-[14999] bg-black/20" onClick={() => setDetailsOpen(false)} /><div role="dialog" aria-label="Speicher- und Synchronisierungsstatus" className="fixed left-4 right-4 top-20 z-[15000] mx-auto w-[min(22rem,calc(100vw-2rem))] max-h-[calc(100dvh-6rem)] overflow-y-auto space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 shadow-xl">
      <button autoFocus type="button" aria-label="Speicherstatus schließen" className="min-h-11 w-full rounded-lg border px-2 font-semibold" onClick={() => setDetailsOpen(false)}>Schließen</button>
      <p className="font-bold">{state.ready ? 'Die neuesten Änderungen sind am Server bestätigt. Du kannst auf einem anderen Gerät weiterarbeiten.' : 'Vor dem Gerätewechsel auf „Synchronisiert“ warten.'}</p>
      <p>Dieses Gerät: {localSaveStatus === 'saved' ? `gespeichert · ${time(localSaveLastAt)}` : localSaveStatus === 'error' ? 'Letzte Änderung nicht gespeichert' : 'Änderung noch ausstehend'}</p>
      <p>Konto: {accountSyncStatus === 'synced' ? 'Synchronisiert' : accountSyncStatus === 'disabled' ? 'Geräteübergreifender Sync nicht aktiv' : 'Bestätigung der neuesten Änderung ausstehend'} · {time(accountSyncLastAt)}</p>
      <p>Live-Abgleich: {accountLiveStatus === 'live' ? 'Aktiv – gespeicherte Änderungen anderer Geräte werden automatisch übernommen.' : accountLiveStatus === 'offline' ? 'Offline – lokale Änderungen bleiben gespeichert.' : accountLiveStatus === 'disabled' ? 'Nicht aktiv – E-Mail-Anmeldung und entsperrter Tresor erforderlich.' : 'Verbindung wird hergestellt. Der regelmäßige Abgleich bleibt aktiv.'}</p>
      <p>Gleichzeitige Änderungen werden geprüft; Konflikte werden nicht automatisch überschrieben.</p>
      {!online && <p>Offline: Änderungen werden nach der Verbindung erneut übertragen.</p>}
      {accountSyncMessage && <p>{accountSyncMessage}</p>}
      {(meta || room?.teamTeachingSharedClassId) && <div className="space-y-1 border-t pt-2"><p className="font-bold">Teamteaching: {team === 'synced' ? 'Synchronisiert' : team === 'conflict' ? 'Konflikt – keine Änderung überschrieben' : team === 'error' ? 'Sync prüfen' : 'Änderung noch ausstehend'}</p><p>Zuletzt geändert: {meta?.lastChangedBy || 'Noch nicht bestätigt'} · {time(meta?.lastChangedAt)}</p><p>Letzter Team-Abgleich: {time(meta?.lastSyncedAt)}</p>{meta?.syncMessage && <p>{meta.syncMessage}</p>}<button type="button" className="min-h-11 w-full rounded-lg border px-2 font-semibold" onClick={() => onOpenTeam ? onOpenTeam() : setPage('teamteaching')}>Klassenteam öffnen</button></div>}
      <button type="button" disabled={!online || retrying} className="min-h-11 w-full rounded-lg border px-2 font-semibold disabled:opacity-50" onClick={async () => { setRetrying(true); try { await retryAccountSync(); } finally { setRetrying(false); } }}>Jetzt synchronisieren</button>
    </div></>, document.body)}
  </details>;
}

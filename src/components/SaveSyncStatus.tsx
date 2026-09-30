import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { saveSyncPresentation } from '../lib/saveSyncPresentation';
import { classRoomFingerprint } from '../lib/teamTeachingCrypto';
import { syncActiveClass } from '../lib/appState';
const time = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('de-AT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Noch keine Bestätigung';
export default function SaveSyncStatus({ onOpenTeam }: { onOpenTeam?: () => void }) {
  const { app, localSaveStatus, localSaveLastAt, accountSyncStatus, accountSyncLastAt, accountSyncMessage, retryAccountSync, setPage } = useApp();
  const [online, setOnline] = useState(() => navigator.onLine);
  const [retrying, setRetrying] = useState(false);
  useEffect(() => { const update = () => setOnline(navigator.onLine); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); }; }, []);
  const room = syncActiveClass(app).classes?.find(candidate => candidate.id === app.activeClassId);
  const meta = room?.teamTeaching;
  const team = meta ? meta.syncStatus === 'conflict' ? 'conflict' : meta.syncStatus === 'error' ? 'error' : meta.syncStatus === 'synced' && classRoomFingerprint(room!) === meta.lastSyncedHash ? 'synced' : 'pending' : room?.teamTeachingSharedClassId ? 'pending' : undefined;
  const state = saveSyncPresentation(localSaveStatus, accountSyncStatus, online, team);
  return <details className="relative min-w-0 max-w-[min(15rem,45vw)] text-left text-slate-900" data-account-sync-status={accountSyncStatus} data-local-save-status={localSaveStatus} data-device-switch-ready={state.ready}>
    <summary aria-label={`Speicherstatus: ${state.label}`} className={`min-h-11 cursor-pointer list-none rounded-lg border px-2 py-1 text-[11px] font-semibold leading-tight flex items-center ${state.ready ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : state.attention ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}><span role="status">{state.label}</span></summary>
    <div className="fixed left-4 right-4 top-20 z-[15000] mx-auto w-[min(22rem,calc(100vw-2rem))] max-h-[calc(100dvh-6rem)] overflow-y-auto space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl">
      <p className="font-bold">{state.ready ? 'Die neuesten Änderungen sind am Server bestätigt. Du kannst auf einem anderen Gerät weiterarbeiten.' : 'Vor dem Gerätewechsel auf „Synchronisiert“ warten.'}</p>
      <p>Dieses Gerät: {localSaveStatus === 'saved' ? `gespeichert · ${time(localSaveLastAt)}` : localSaveStatus === 'error' ? 'Letzte Änderung nicht gespeichert' : 'Änderung noch ausstehend'}</p>
      <p>Konto: {accountSyncStatus === 'synced' ? 'Synchronisiert' : accountSyncStatus === 'disabled' ? 'Geräteübergreifender Sync nicht aktiv' : 'Bestätigung der neuesten Änderung ausstehend'} · {time(accountSyncLastAt)}</p>
      {!online && <p>Offline: Änderungen werden nach der Verbindung erneut übertragen.</p>}
      {accountSyncMessage && <p>{accountSyncMessage}</p>}
      {(meta || room?.teamTeachingSharedClassId) && <div className="space-y-1 border-t pt-2"><p className="font-bold">Teamteaching: {team === 'synced' ? 'Synchronisiert' : team === 'conflict' ? 'Konflikt – keine Änderung überschrieben' : team === 'error' ? 'Sync prüfen' : 'Änderung noch ausstehend'}</p><p>Zuletzt geändert: {meta?.lastChangedBy || 'Noch nicht bestätigt'} · {time(meta?.lastChangedAt)}</p><p>Letzter Team-Abgleich: {time(meta?.lastSyncedAt)}</p>{meta?.syncMessage && <p>{meta.syncMessage}</p>}<button type="button" className="min-h-11 w-full rounded-lg border px-2 font-semibold" onClick={() => onOpenTeam ? onOpenTeam() : setPage('teamteaching')}>Klassenteam öffnen</button></div>}
      <button type="button" disabled={!online || retrying} className="min-h-11 w-full rounded-lg border px-2 font-semibold disabled:opacity-50" onClick={async () => { setRetrying(true); try { await retryAccountSync(); } finally { setRetrying(false); } }}>Jetzt synchronisieren</button>
    </div>
  </details>;
}

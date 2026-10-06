import AccountServerLoadButton from './AccountServerLoadButton';
import { createPortal } from 'react-dom';
import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTeamDeviceAuthorization } from '../hooks/useTeamDeviceAuthorization';
import { saveSyncPresentation } from '../lib/saveSyncPresentation';
import { syncActiveClass } from '../lib/appState';
import { teamSyncPresentation } from '../lib/teamSyncPresentation';

const time = (value?: string | null) => value && Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleString('de-AT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  : 'Noch keine Bestätigung';

export default function SaveSyncStatus({
  onOpenTeam,
  compact = false,
}: {
  onOpenTeam?: () => void;
  fullWidth?: boolean;
  compact?: boolean;
}) {
  const {
    app,
    localSaveStatus,
    localSaveLastAt,
    accountSyncStatus,
    accountSyncLastAt,
    accountLiveStatus,
    accountSyncMessage,
    retryAccountSync,
    setPage,
  } = useApp();
  const [online, setOnline] = useState(() => navigator.onLine);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const isDashboard = (app.currentPage || 'dashboard') === 'dashboard';

  useEffect(() => {
    if (!detailsOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDetailsOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [detailsOpen]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const room = syncActiveClass(app).classes?.find(candidate => candidate.id === app.activeClassId);
  const meta = room?.teamTeaching;
  const sharedClassId = meta?.sharedClassId || room?.teamTeachingSharedClassId;
  const deviceAuthorization = useTeamDeviceAuthorization(sharedClassId);
  const team = teamSyncPresentation(room)?.status;
  const state = saveSyncPresentation(localSaveStatus, accountSyncStatus, online, team);
  const statusTitle = `${state.label}${accountLiveStatus === 'live' ? ' · Live-Abgleich aktiv' : ''} · Details öffnen`;

  return (
    <div className="flex shrink-0 items-center gap-1" data-save-sync-status>
      <details
        open={detailsOpen}
        onToggle={event => setDetailsOpen(event.currentTarget.open)}
        className="relative inline-block w-fit shrink-0 text-left text-slate-900"
        data-account-live-status={accountLiveStatus}
        data-account-sync-status={accountSyncStatus}
        data-local-save-status={localSaveStatus}
        data-device-switch-ready={state.ready}
      >
        <summary
          aria-label={`Speicherstatus: ${statusTitle}`}
          title={statusTitle}
          className="flex h-8 w-8 shrink-0 cursor-pointer list-none items-center justify-center rounded-full outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-400 [&::-webkit-details-marker]:hidden"
        >
          <span
            aria-hidden="true"
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${state.ready ? 'bg-emerald-500' : 'bg-amber-400'}`}
          />
          <span role="status" className="sr-only">
            {state.label}{accountLiveStatus === 'live' ? ' · Live-Abgleich aktiv' : ''}
          </span>
        </summary>

        {detailsOpen && createPortal(
          <>
            <div className="fixed inset-0 z-[14999] bg-black/20" onClick={() => setDetailsOpen(false)} />
            <div
              role="dialog"
              aria-label="Speicher- und Synchronisierungsstatus"
              className="fixed left-4 right-4 top-20 z-[15000] mx-auto w-[min(22rem,calc(100vw-2rem))] max-h-[calc(100dvh-6rem)] overflow-y-auto space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 shadow-xl"
            >
              <button
                autoFocus
                type="button"
                aria-label="Speicherstatus schließen"
                className="min-h-11 w-full rounded-lg border px-2 font-semibold"
                onClick={() => setDetailsOpen(false)}
              >
                Schließen
              </button>
              <p className="font-bold">
                {state.ready
                  ? 'Die neuesten Änderungen sind am Server bestätigt. Du kannst auf einem anderen Gerät weiterarbeiten.'
                  : 'Vor dem Gerätewechsel auf den grünen Punkt warten.'}
              </p>
              <p>
                Dieses Gerät: {localSaveStatus === 'saved'
                  ? `gespeichert · ${time(localSaveLastAt)}`
                  : localSaveStatus === 'error'
                    ? 'Letzte Änderung nicht gespeichert'
                    : 'Änderung noch ausstehend'}
              </p>
              <p>
                Konto: {accountSyncStatus === 'synced'
                  ? 'Synchronisiert'
                  : accountSyncStatus === 'disabled'
                    ? 'Geräteübergreifender Sync nicht aktiv'
                    : 'Bestätigung der neuesten Änderung ausstehend'} · {time(accountSyncLastAt)}
              </p>
              <p>
                Live-Abgleich: {accountLiveStatus === 'live'
                  ? 'Aktiv – gespeicherte Änderungen anderer Geräte werden automatisch übernommen.'
                  : accountLiveStatus === 'offline'
                    ? 'Offline – lokale Änderungen bleiben gespeichert.'
                    : accountLiveStatus === 'disabled'
                      ? 'Nicht aktiv – E-Mail-Anmeldung und entsperrter Tresor erforderlich.'
                      : 'Verbindung wird hergestellt. Der regelmäßige Abgleich bleibt aktiv.'}
              </p>
              <p>Gleichzeitige Änderungen werden geprüft; Konflikte werden nicht automatisch überschrieben.</p>
              {!online && <p>Offline: Änderungen werden nach der Verbindung erneut übertragen.</p>}
              {accountSyncMessage && <p>{accountSyncMessage}</p>}
              {(meta || room?.teamTeachingSharedClassId) && (
                <div className="space-y-1 border-t pt-2">
                  <p className="font-bold">
                    Teamteaching: {deviceAuthorization === 'unauthorized'
                      ? 'Teamzugang wird automatisch eingerichtet'
                      : deviceAuthorization === 'checking'
                        ? 'Teamzugang wird geprüft'
                        : team === 'synced'
                          ? 'Synchronisiert'
                          : team === 'conflict'
                            ? 'Konflikt – keine Änderung überschrieben'
                            : team === 'error'
                              ? 'Sync prüfen'
                              : 'Änderung noch ausstehend'}
                  </p>
                  {deviceAuthorization === 'unauthorized' && (
                    <p>
                      Dieses Gerät wird automatisch freigeschaltet, sobald ein bereits berechtigtes Teamgerät die Klasse geöffnet hat. Es muss nicht manuell im Klassenteam hinzugefügt werden.
                    </p>
                  )}
                  <p>Zuletzt geändert: {meta?.lastChangedBy || 'Noch nicht bestätigt'} · {time(meta?.lastChangedAt)}</p>
                  <p>Letzter Team-Abgleich: {time(meta?.lastSyncedAt)}</p>
                  {meta?.syncMessage && deviceAuthorization !== 'unauthorized' && <p>{meta.syncMessage}</p>}
                  <button
                    type="button"
                    className="min-h-11 w-full rounded-lg border px-2 font-semibold"
                    onClick={() => onOpenTeam ? onOpenTeam() : setPage('teamteaching')}
                  >
                    Klassenteam öffnen
                  </button>
                </div>
              )}
              <AccountServerLoadButton />
              <button
                type="button"
                disabled={!online || retrying}
                className="min-h-11 w-full rounded-lg border px-2 font-semibold disabled:opacity-50"
                onClick={async () => {
                  setRetrying(true);
                  try {
                    await retryAccountSync();
                  } finally {
                    setRetrying(false);
                  }
                }}
              >
                Jetzt synchronisieren
              </button>
            </div>
          </>,
          document.body,
        )}
      </details>

      {!compact && isDashboard && (
        <button
          type="button"
          aria-label="Heute bearbeiten"
          title="Heute anpassen"
          onClick={() => window.dispatchEvent(new Event('open-dashboard-customize'))}
          className="hidden h-8 w-[5.75rem] shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-black uppercase tracking-wide text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 sm:inline-flex"
        >
          Bearbeiten
        </button>
      )}
    </div>
  );
}

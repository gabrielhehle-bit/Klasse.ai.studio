import React from 'react';
import { useApp } from '../context/AppContext';
import { useTeamDeviceAuthorization } from '../hooks/useTeamDeviceAuthorization';
import { syncActiveClass } from '../lib/appState';
import { teamSyncPresentation } from '../lib/teamSyncPresentation';

const formatTime = (value?: string) => value && Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })
  : 'offen';

export default function ClassTeamStatus({ onOpen }: { onOpen?: () => void }) {
  const { app, setPage } = useApp();
  const [online, setOnline] = React.useState(() => navigator.onLine);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);

  React.useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const room = syncActiveClass(app).classes?.find(candidate => candidate.id === app.activeClassId);
  const sharedClassId = room?.teamTeaching?.sharedClassId || room?.teamTeachingSharedClassId;
  const deviceAuthorization = useTeamDeviceAuthorization(sharedClassId);
  const deviceAuthorized = deviceAuthorization === 'authorized'
    ? true
    : deviceAuthorization === 'unauthorized'
      ? false
      : deviceAuthorization === 'checking'
        ? null
        : undefined;
  const team = teamSyncPresentation(room, { online, deviceAuthorized });
  const isCockpitSurface = app.currentPage === 'cockpit' || app.currentPage === 'unterricht';
  if (!team || isCockpitSurface) return null;

  const detail = `${team.label}. ${team.description} Zuletzt geändert: ${team.editor}, ${team.changedAt ? new Date(team.changedAt).toLocaleString('de-AT') : 'offen'}. Letzter Abgleich: ${team.syncedAt ? new Date(team.syncedAt).toLocaleString('de-AT') : 'offen'}.`;
  const isAttention = team.status === 'approval' || team.status === 'conflict' || team.status === 'error';
  const isReady = team.status === 'synced';
  const tone = isReady
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : isAttention
      ? 'border-rose-200 bg-rose-50 text-rose-800'
      : 'border-amber-200 bg-amber-50 text-amber-900';

  return <>
    <div
      data-team-sync-shell
      data-team-sync-status={team.status}
      data-advanced-open={advancedOpen ? 'true' : 'false'}
      className="mt-2 max-w-2xl space-y-1.5"
    >
      <button
        type="button"
        aria-label={detail}
        title={`${detail} Klassenteam öffnen`}
        onClick={() => onOpen ? onOpen() : setPage('teamteaching')}
        className={`inline-flex min-h-8 items-center gap-2 rounded-lg border px-2.5 py-1 text-xs font-black ${tone}`}
      >
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${isReady ? 'bg-emerald-600' : isAttention ? 'bg-rose-600' : 'bg-amber-500'}`} />
        <span role="status">{team.label}</span>
      </button>

      {team.status !== 'synced' && (
        <p className={`text-xs leading-5 ${isAttention ? 'font-semibold text-rose-800' : 'text-[var(--text2)]'}`}>
          {team.description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--text2)]">
        {team.status === 'synced' && <span>Letzter Abgleich: {formatTime(team.syncedAt)}</span>}
        <button
          type="button"
          onClick={() => setAdvancedOpen(value => !value)}
          className="rounded-md px-1 py-0.5 font-semibold underline decoration-dotted underline-offset-2"
          aria-expanded={advancedOpen}
        >
          {advancedOpen ? 'Technische Details ausblenden' : 'Technische Details'}
        </button>
      </div>
    </div>

    <style>{`
      section:has([data-team-sync-shell]) [data-team-sync-shell] ~ .mt-3.space-y-1,
      section:has([data-team-sync-shell]) [data-team-sync-shell] ~ .mt-2.max-w-2xl {
        display: none;
      }
      section:has([data-team-sync-shell]) > .flex.flex-wrap.items-center.justify-between.gap-4 > .flex.flex-wrap.gap-2 {
        display: none;
      }
      section:has([data-team-sync-shell][data-advanced-open="true"]) [data-team-sync-shell] ~ .mt-3.space-y-1,
      section:has([data-team-sync-shell][data-advanced-open="true"]) [data-team-sync-shell] ~ .mt-2.max-w-2xl {
        display: block;
      }
      section:has([data-team-sync-shell][data-advanced-open="true"]) > .flex.flex-wrap.items-center.justify-between.gap-4 > .flex.flex-wrap.gap-2 {
        display: flex;
      }
      section:has([data-team-sync-shell][data-team-sync-status="conflict"]):not(:has([data-team-sync-shell][data-advanced-open="true"])) > .flex.flex-wrap.items-center.justify-between.gap-4 > .flex.flex-wrap.gap-2 {
        display: flex;
      }
      section:has([data-team-sync-shell][data-team-sync-status="conflict"]):not(:has([data-team-sync-shell][data-advanced-open="true"])) > .flex.flex-wrap.items-center.justify-between.gap-4 > .flex.flex-wrap.gap-2 > button {
        display: none;
      }
      section:has([data-team-sync-shell][data-team-sync-status="conflict"]):not(:has([data-team-sync-shell][data-advanced-open="true"])) > .flex.flex-wrap.items-center.justify-between.gap-4 > .flex.flex-wrap.gap-2 > button:first-child,
      section:has([data-team-sync-shell][data-team-sync-status="conflict"]):not(:has([data-team-sync-shell][data-advanced-open="true"])) > .flex.flex-wrap.items-center.justify-between.gap-4 > .flex.flex-wrap.gap-2 > button.border-indigo-400 {
        display: inline-flex;
      }
    `}</style>
  </>;
}

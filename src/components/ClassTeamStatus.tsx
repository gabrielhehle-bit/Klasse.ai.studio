import React from 'react';
import { useApp } from '../context/AppContext';
import { syncActiveClass } from '../lib/appState';
import { teamSyncPresentation } from '../lib/teamSyncPresentation';

const formatTime = (value?: string) => value && Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' }) : 'offen';
export default function ClassTeamStatus({ onOpen }: { onOpen?: () => void }) {
  const { app, setPage } = useApp();
  const room = syncActiveClass(app).classes?.find(candidate => candidate.id === app.activeClassId);
  const team = teamSyncPresentation(room);
  if (!team) return null;
  const compactLabel = team.status === 'synced' ? 'Team ✓' : team.status === 'pending' ? 'Team ausstehend' : team.status === 'conflict' ? 'Team-Konflikt' : 'Team-Sync prüfen';
  const detail = `${team.label} · Zuletzt geändert: ${team.editor}, ${team.changedAt ? new Date(team.changedAt).toLocaleString('de-AT') : 'offen'} · Letzter Abgleich: ${team.syncedAt ? new Date(team.syncedAt).toLocaleString('de-AT') : 'offen'}`;
  return <button type="button" data-team-sync-status={team.status} aria-label={detail} title={`${detail} · Klassenteam öffnen`} onClick={() => onOpen ? onOpen() : setPage('teamteaching')}
    className={`max-w-56 truncate rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${team.status === 'synced' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : team.status === 'pending' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
    <span role="status">{compactLabel} · {team.editor.split(/\s+/)[0]} · {formatTime(team.syncedAt)}</span>
  </button>;
}

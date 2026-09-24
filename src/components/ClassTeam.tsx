import React from 'react';
import { RefreshCw, ShieldCheck, UserPlus, Users, LockKeyhole, Trash2, Download, Upload, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { syncActiveClass, switchClassState } from '../lib/appState';
import {
  addTeamTeachingMember,
  createSharedClass,
  deleteSharedClass,
  ensureRegisteredTeamTeachingDevice,
  listSharedClasses,
  listTeamTeachingColleagues,
  listTeamTeachingSchoolUsers,
  pullSharedClass,
  pushSharedClass,
  removeTeamTeachingMember,
  refreshTeamTeachingMemberDevices,
  updateTeamTeachingMemberRole,
  type SharedClassSummary,
  type TeamTeachingColleague,
} from '../lib/teamTeachingService';
import { classRoomFingerprint, classRoomWithoutTeamMetadata } from '../lib/teamTeachingCrypto';
import type { ClassRoom } from '../types';
import EmailAccountLogin from './EmailAccountLogin';

function replaceOrAddRoom(prev: any, room: ClassRoom) {
  const synced = syncActiveClass(prev);
  const existing = synced.classes?.findIndex((candidate: ClassRoom) => candidate.id === room.id) ?? -1;
  const classes = [...(synced.classes || [])];
  if (existing >= 0) classes[existing] = room;
  else classes.push(room);
  return switchClassState({ ...synced, classes, activeClassId: undefined }, room.id);
}

export default function ClassTeam() {
  const { app, setApp } = useApp();
  const [shared, setShared] = React.useState<SharedClassSummary[]>([]);
  const [colleagues, setColleagues] = React.useState<TeamTeachingColleague[]>([]);
  const [schoolUsers, setSchoolUsers] = React.useState<TeamTeachingColleague[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [needsSchoolLogin, setNeedsSchoolLogin] = React.useState(false);

  const synced = React.useMemo(() => syncActiveClass(app), [app]);
  const activeRoom = synced.classes?.find(room => room.id === synced.activeClassId);
  const activeSharedId = activeRoom?.teamTeaching?.sharedClassId;
  const activeSummary = shared.find(item => item.id === activeSharedId);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await ensureRegisteredTeamTeachingDevice();
      const [classes, users, allSchoolUsers] = await Promise.all([
        listSharedClasses(),
        listTeamTeachingColleagues(),
        listTeamTeachingSchoolUsers(),
      ]);
      setShared(classes);
      setColleagues(users);
      setSchoolUsers(allSchoolUsers);
      setNeedsSchoolLogin(false);
    } catch (cause: any) {
      const schoolLoginRequired = cause?.status === 403;
      setNeedsSchoolLogin(schoolLoginRequired);
      setError(schoolLoginRequired
        ? 'Für Teamteaching brauchst du eine Anmeldung mit einer verifizierten Schulmail.'
        : cause instanceof Error ? cause.message : 'Klassenteam konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const enableSharing = async () => {
    if (!activeRoom) return;
    setBusy('enable');
    setError(null);
    try {
      const result = await createSharedClass(activeRoom);
      setApp(prev => {
        const current = syncActiveClass(prev);
        const classes = (current.classes || []).map(room => room.id === activeRoom.id ? result.localRoom : room);
        return { ...current, classes };
      });
      setNotice('Die Klasse ist jetzt verschlüsselt für Teamteaching vorbereitet.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Die Klasse konnte nicht freigegeben werden.');
    } finally {
      setBusy(null);
    }
  };

  const adopt = async (summary: SharedClassSummary) => {
    setBusy('adopt:' + summary.id);
    setError(null);
    try {
      const { room } = await pullSharedClass(summary.id);
      setApp(prev => replaceOrAddRoom(prev, room));
      setNotice(summary.classLabel + ' wurde auf diesem Gerät geöffnet.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Die geteilte Klasse konnte nicht geöffnet werden.');
    } finally {
      setBusy(null);
    }
  };

  const pull = async () => {
    if (!activeSharedId) return;
    setBusy('pull');
    setError(null);
    try {
      const { room } = await pullSharedClass(activeSharedId);
      const hasUnsyncedLocalWork = Boolean(activeRoom?.teamTeaching && (
        activeRoom.teamTeaching.syncStatus === 'conflict'
        || !activeRoom.teamTeaching.lastSyncedHash
        || classRoomFingerprint(activeRoom) !== activeRoom.teamTeaching.lastSyncedHash
      ));
      let preservedCopy = hasUnsyncedLocalWork;

      setApp(prev => {
        const current = syncActiveClass(prev);
        let classes = [...(current.classes || [])];
        const currentLocal = classes.find(candidate => candidate.teamTeaching?.sharedClassId === activeSharedId);
        // Recheck INSIDE the updater: editing might continue while fetching.
        // A manual remote load must never erase unsent lesson drafts or notes.
        const needsCopy = Boolean(currentLocal?.teamTeaching && (
          currentLocal.teamTeaching.syncStatus === 'conflict'
          || !currentLocal.teamTeaching.lastSyncedHash
          || classRoomFingerprint(currentLocal) !== currentLocal.teamTeaching.lastSyncedHash
        ));
        if (needsCopy && currentLocal) {
          preservedCopy = true;
          const localCopy = classRoomWithoutTeamMetadata(currentLocal);
          classes.push({
            ...localCopy,
            id: localCopy.id + '-conflict-' + Date.now().toString(36),
            name: localCopy.name + ' – Konfliktkopie',
          });
        }

        const remoteIndex = classes.findIndex(candidate => candidate.id === room.id);
        if (remoteIndex >= 0) classes[remoteIndex] = room;
        else classes.push(room);

        return switchClassState({ ...current, classes, activeClassId: undefined }, room.id);
      });

      setNotice(
        preservedCopy
          ? 'Neuester Teamstand geladen. Deine vorherigen lokalen Änderungen wurden zusätzlich als „Konfliktkopie“ behalten.'
          : 'Neuester verschlüsselter Stand wurde geladen.'
      );
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Synchronisieren fehlgeschlagen.');
    } finally {
      setBusy(null);
    }
  };

  const push = async () => {
    if (!activeRoom?.teamTeaching) return;
    setBusy('push');
    setError(null);
    try {
      const summary = await pushSharedClass(activeRoom);
      const hash = classRoomFingerprint(activeRoom);
      setApp(prev => {
        const current = syncActiveClass(prev);
        const classes = (current.classes || []).map(room => room.id === activeRoom.id ? {
          ...room,
          teamTeaching: {
            ...room.teamTeaching!,
            revision: summary.revision,
            lastSyncedHash: hash,
            lastSyncedAt: new Date().toISOString(),
          },
        } : room);
        return { ...current, classes };
      });
      setNotice('Deine Änderungen wurden verschlüsselt für das Klassenteam gespeichert.');
      await load();
    } catch (cause: any) {
      setError(cause?.code === 'REVISION_CONFLICT'
        ? 'Zwischenzeitlich wurde die Klasse von einer anderen Lehrperson geändert. Bitte zuerst „Neueste Version laden“ und prüfe deine lokalen Änderungen.'
        : cause instanceof Error ? cause.message : 'Änderungen konnten nicht synchronisiert werden.');
    } finally {
      setBusy(null);
    }
  };

  const addMember = async (colleague: TeamTeachingColleague) => {
    if (!activeSharedId) return;
    setBusy('add:' + colleague.userId);
    setError(null);
    try {
      await addTeamTeachingMember(activeSharedId, colleague, 'editor');
      setNotice(colleague.displayName + ' wurde als Teamlehrkraft hinzugefügt.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Lehrperson konnte nicht hinzugefügt werden.');
    } finally {
      setBusy(null);
    }
  };

  const changeRole = async (userId: string, role: 'editor' | 'viewer') => {
    if (!activeSharedId) return;
    setBusy('role:' + userId);
    try {
      await updateTeamTeachingMemberRole(activeSharedId, userId, role);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Rolle konnte nicht geändert werden.');
    } finally {
      setBusy(null);
    }
  };

  const refreshMemberDevices = async (userId: string) => {
    if (!activeSharedId) return;
    const target = schoolUsers.find(user => user.userId === userId);
    if (!target) {
      setError('Diese Lehrperson ist im Schulkollegium noch nicht verfügbar.');
      return;
    }
    setBusy('keys:' + userId);
    setError(null);
    try {
      await refreshTeamTeachingMemberDevices(activeSharedId, target);
      setNotice('Gerätefreigabe für ' + target.displayName + ' wurde aktualisiert.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gerätefreigabe konnte nicht aktualisiert werden.');
    } finally {
      setBusy(null);
    }
  };

  const removeMember = async (userId: string) => {
    if (!activeSharedId) return;
    setBusy('remove:' + userId);
    try {
      await removeTeamTeachingMember(activeSharedId, userId);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Lehrperson konnte nicht entfernt werden.');
    } finally {
      setBusy(null);
    }
  };

  const stopSharing = async () => {
    if (!activeSharedId || !window.confirm('Teamteaching für diese Klasse wirklich beenden? Die lokalen Klassendaten bleiben erhalten.')) return;
    setBusy('delete');
    try {
      await deleteSharedClass(activeSharedId);
      setApp(prev => {
        const current = syncActiveClass(prev);
        const classes = (current.classes || []).map(room => {
          if (room.id !== activeRoom?.id) return room;
          const clone = { ...room };
          delete clone.teamTeaching;
          return clone;
        });
        return { ...current, classes };
      });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Teamteaching konnte nicht beendet werden.');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <div className="min-h-[420px] flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  const memberIds = new Set(activeSummary?.members.map(member => member.userId) || []);
  const available = colleagues.filter(colleague => !memberIds.has(colleague.userId));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <header className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]"><Users size={23} /></span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent)]">Klassenteam</p>
            <h1 className="mt-1 text-2xl font-black text-[var(--text)]">Eine Klasse gemeinsam führen</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-[var(--text2)]">
              Jede Lehrperson nutzt ihr eigenes Schulkonto. Nur ausdrücklich hinzugefügte Kolleg:innen erhalten Zugriff auf die verschlüsselte Klasse.
            </p>
          </div>
        </div>
      </header>

      {error && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-700">{error}</div>}
      {needsSchoolLogin && (
        <EmailAccountLogin
          onSuccess={() => {
            setError(null);
            setNeedsSchoolLogin(false);
            void load();
          }}
        />
      )}
      {notice && <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-semibold">{notice}</div>}

      <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-black text-[var(--text)]">Aktuelle Klasse: {activeRoom?.name || 'Keine Klasse'}</h2>
            <p className="mt-1 text-sm text-[var(--text2)]">
              {activeRoom?.teamTeaching
                ? `Teamteaching aktiv · Rolle: ${activeRoom.teamTeaching.role}`
                : 'Noch nicht für gemeinsame Bearbeitung freigegeben.'}
            </p>
            {activeRoom?.teamTeaching?.syncStatus && (
              <div className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                activeRoom.teamTeaching.syncStatus === 'conflict'
                  ? 'bg-amber-500/15 text-amber-700'
                  : activeRoom.teamTeaching.syncStatus === 'error'
                    ? 'bg-rose-500/15 text-rose-700'
                    : activeRoom.teamTeaching.syncStatus === 'syncing'
                      ? 'bg-blue-500/15 text-blue-700'
                      : 'bg-emerald-500/15 text-emerald-700'
              }`}>
                {activeRoom.teamTeaching.syncStatus === 'conflict'
                  ? 'Konflikt – lokale Arbeit bleibt erhalten'
                  : activeRoom.teamTeaching.syncStatus === 'error'
                    ? 'Synchronisierung prüfen'
                    : activeRoom.teamTeaching.syncStatus === 'syncing'
                      ? 'Wird verschlüsselt synchronisiert …'
                      : 'Synchronisiert'}
              </div>
            )}
            {activeRoom?.teamTeaching?.syncMessage && (
              <p className="mt-2 max-w-2xl text-xs leading-5 text-[var(--text2)]">
                {activeRoom.teamTeaching.syncMessage}
              </p>
            )}
          </div>
          {!activeRoom?.teamTeaching ? (
            <button onClick={enableSharing} disabled={!activeRoom || busy === 'enable'} className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">
              {busy === 'enable' ? 'Wird vorbereitet …' : 'Gemeinsame Klasse aktivieren'}
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button onClick={pull} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold"><Download size={16}/> Neueste Version laden</button>
              {activeRoom.teamTeaching.role !== 'viewer' && <button onClick={push} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-black text-white"><Upload size={16}/> Änderungen senden</button>}
            </div>
          )}
        </div>
      </section>

      {activeSummary && (
        <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4">
          <div>
            <h2 className="font-black text-[var(--text)]">Lehrpersonen in dieser Klasse</h2>
            <p className="mt-1 text-sm text-[var(--text2)]">Owner kann Teamlehrkräfte hinzufügen, auf Lesen beschränken oder wieder entfernen.</p>
          </div>
          <div className="space-y-2">
            {activeSummary.members.map(member => (
              <div key={member.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--surface2)] p-3">
                <div>
                  <div className="font-bold">{member.displayName}</div>
                  <div className="text-xs text-[var(--text3)]">{member.role === 'owner' ? 'Besitzer:in' : member.role === 'editor' ? 'Teamlehrkraft · bearbeiten' : 'Nur ansehen'}</div>
                </div>
                {activeSummary.myRole === 'owner' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => void refreshMemberDevices(member.userId)}
                      disabled={Boolean(busy)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-bold disabled:opacity-50"
                      title="Neu registrierte Geräte dieser Lehrperson für die Klasse freigeben"
                    >
                      <RefreshCw size={14}/> Geräte
                    </button>
                    {member.role !== 'owner' && (
                      <>
                        <select value={member.role} onChange={event => void changeRole(member.userId, event.target.value as 'editor'|'viewer')} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm">
                          <option value="editor">Bearbeiten</option>
                          <option value="viewer">Nur ansehen</option>
                        </select>
                        <button onClick={() => void removeMember(member.userId)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-500/10" aria-label="Lehrperson entfernen"><Trash2 size={16}/></button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {activeSummary.myRole === 'owner' && (
            <div className="border-t border-[var(--border)] pt-4">
              <h3 className="text-sm font-black">Kolleg:in hinzufügen</h3>
              {available.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--text2)]">Keine weitere KLASSIO-Lehrperson dieser Schule verfügbar.</p>
              ) : (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {available.map(colleague => (
                    <button
                      key={colleague.userId}
                      onClick={() => void addMember(colleague)}
                      disabled={Boolean(busy) || colleague.devices.length === 0}
                      title={colleague.devices.length ? 'Als bearbeitende Lehrperson hinzufügen' : 'Diese Lehrperson muss KLASSIO einmal mit ihrer Schulmail öffnen.'}
                      className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3 text-left hover:border-[var(--accent)]/40 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      <span>
                        <span className="block font-bold">{colleague.displayName}</span>
                        <span className="text-xs text-[var(--text3)]">
                          {colleague.devices.length
                            ? `${colleague.devices.length} Gerät(e) bereit · kann Klasse bearbeiten`
                            : 'Im Kollegium registriert · muss KLASSIO einmal öffnen'}
                        </span>
                      </span>
                      <UserPlus size={17} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSummary.myRole === 'owner' && (
            <div className="border-t border-[var(--border)] pt-4">
              <button onClick={stopSharing} disabled={Boolean(busy)} className="text-sm font-bold text-rose-600">Teamteaching für diese Klasse beenden</button>
            </div>
          )}
        </section>
      )}

      <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="font-black">Mit mir geteilte Klassen</h2>
        <div className="mt-3 space-y-2">
          {shared.length === 0 && <p className="text-sm text-[var(--text2)]">Noch keine geteilten Klassen.</p>}
          {shared.map(summary => (
            <div key={summary.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--surface2)] p-3">
              <div><div className="font-bold">{summary.classLabel}</div><div className="text-xs text-[var(--text3)]">{summary.members.length} Lehrperson(en) · Revision {summary.revision}</div></div>
              {!synced.classes?.some(room => room.teamTeaching?.sharedClassId === summary.id) && (
                <button onClick={() => void adopt(summary)} disabled={Boolean(busy)} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-black text-white">Auf diesem Gerät öffnen</button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="flex gap-3 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--text2)]">
        <ShieldCheck className="shrink-0 text-[var(--accent)]" size={20} />
        <p><strong className="text-[var(--text)]">Zero-Knowledge:</strong> Zwei oder mehr berechtigte Lehrpersonen können dieselbe Klasse bearbeiten. Der Server verwaltet Schulzugehörigkeit, Rollen und ausschließlich verschlüsselte Klassendaten; entschlüsselt wird erst lokal auf den freigegebenen Geräten.</p>
      </section>
    </div>
  );
}

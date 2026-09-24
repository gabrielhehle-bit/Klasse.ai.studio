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
  listSharedClassHistory,
  pullSharedClassRevision,
  listTeamTeachingColleagues,
  listTeamTeachingSchoolUsers,
  pullSharedClass,
  pushSharedClass,
  removeTeamTeachingMember,
  refreshTeamTeachingMemberDevices,
  updateTeamTeachingMemberRole,
  type SharedClassSummary,
  type SharedClassHistoryVersion,
  type TeamTeachingColleague,
} from '../lib/teamTeachingService';
import { classRoomFingerprint, classRoomWithoutTeamMetadata } from '../lib/teamTeachingCrypto';
import { adoptAcknowledgedTeamRoom } from '../lib/teamTeachingProjection';
import { describeTeamClassChanges, type TeamClassChange } from '../lib/teamTeachingChanges';
import type { ClassRoom } from '../types';
import EmailAccountLogin from './EmailAccountLogin';

function replaceOrAddRoom(prev: any, room: ClassRoom) {
  const current = syncActiveClass(prev);
  const existing = (current.classes || []).find((candidate: ClassRoom) => candidate.id === room.id);
  if (!existing || classRoomFingerprint(existing) === classRoomFingerprint(room)) return adoptAcknowledgedTeamRoom(current, room);
  // A new device may have an older personal-account class with this ID.
  // Keep its entire old content in a visibly separate local copy before connecting to the authoritative team snapshot.
  const copy = classRoomWithoutTeamMetadata(existing);
  const safeCopy = { ...copy, id: copy.id + '-vor-teambeitritt-' + Date.now().toString(36),
    name: copy.name + ' – lokale Kopie vor Teambeitritt' };
  return adoptAcknowledgedTeamRoom({ ...current, classes: [...current.classes, safeCopy] }, room);
}

function formatTeamDate(value?: string): string {
  if (!value) return 'noch nicht bekannt';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'noch nicht bekannt'
    : parsed.toLocaleString('de-AT', { dateStyle: 'short', timeStyle: 'short' });
}

export default function ClassTeam() {
  const { app, setApp } = useApp();
  const liveAppRef = React.useRef(app);
  liveAppRef.current = app;
  const [shared, setShared] = React.useState<SharedClassSummary[]>([]);
  const [colleagues, setColleagues] = React.useState<TeamTeachingColleague[]>([]);
  const [schoolUsers, setSchoolUsers] = React.useState<TeamTeachingColleague[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [needsSchoolLogin, setNeedsSchoolLogin] = React.useState(false);
  const [history, setHistory] = React.useState<SharedClassHistoryVersion[]>([]);
  const [historyBusy, setHistoryBusy] = React.useState(false);
  const [changesPreview, setChangesPreview] = React.useState<{
    title: string; changes: TeamClassChange[]; revision: number; room?: ClassRoom;
  } | null>(null);
  const [historyVisible, setHistoryVisible] = React.useState(false);

  const synced = React.useMemo(() => syncActiveClass(app), [app]);
  const activeRoom = synced.classes?.find(room => room.id === synced.activeClassId);
  const activeSharedId = activeRoom?.teamTeaching?.sharedClassId;
  const activeSummary = shared.find(item => item.id === activeSharedId);
  const knownTeamReference = activeRoom?.teamTeachingSharedClassId;
  const reconnectableTeam = knownTeamReference
    ? shared.find(item => item.id === knownTeamReference)
    : undefined;

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
  // Update the visible content revision even while the colleague works on another device.
  React.useEffect(() => {
    if (!activeSharedId) return;
    const refresh = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void listSharedClasses().then(setShared).catch(() => {
        // The live team sync badge still reports authentication / connectivity failures.
      });
    }, 10000);
    return () => window.clearInterval(refresh);
  }, [activeSharedId]);

  const enableSharing = async () => {
    if (!activeRoom) return;
    if (activeRoom.teamTeachingSharedClassId) {
      setError('Diese Klasse ist bereits mit einem Klassenteam verbunden. Öffne das bestehende Team auf diesem Gerät, statt eine zweite Teamklasse zu erstellen.');
      return;
    }
    if (shared.some(item => item.classLabel === activeRoom.name)
      && !window.confirm('Im Klassenteam gibt es bereits eine Klasse mit diesem Namen. Soll wirklich eine NEUE, separate Teamklasse erstellt werden? Vorhandene Wochenplanungen werden dadurch nicht verbunden.')) return;
    setBusy('enable');
    setError(null);
    try {
      const result = await createSharedClass(activeRoom);
      setApp(prev => {
        const current = syncActiveClass(prev);
        const latestRoom = (current.classes || []).find(room => room.id === activeRoom.id);
        if (!latestRoom) return prev;
        // A teacher might edit a lesson while the share-creation request is
        // in flight. Keep those unsent edits; only the initial remote snapshot
        // may be stamped as acknowledged.
        if (classRoomFingerprint(latestRoom) !== classRoomFingerprint(activeRoom)) {
          const withTeam = { ...latestRoom, teamTeaching: result.localRoom.teamTeaching,
            teamTeachingSharedClassId: result.summary.id };
          const classes = (current.classes || []).map(room => room.id === activeRoom.id ? withTeam : room);
          return { ...current, classes };
        }
        return adoptAcknowledgedTeamRoom({ ...current, activeClassId: undefined }, result.localRoom);
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
      const message = cause instanceof Error ? cause.message : 'Die geteilte Klasse konnte nicht geöffnet werden.';
      setError(message.includes('noch nicht freigegeben')
        ? 'Dieses Gerät ist noch nicht für die geteilte Klasse freigegeben. Bitte die Klassenbesitzerin oder den Klassenbesitzer auf einem bereits berechtigten Gerät im Klassenteam → Lehrpersonen → „Geräte“ die neuen Geräteschlüssel freigeben lassen. Danach hier erneut „Teamklasse verbinden“ wählen.'
        : message);
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

        return adoptAcknowledgedTeamRoom({ ...current, classes, activeClassId: undefined }, room);
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
      if (activeRoom.teamTeaching.syncStatus === 'conflict') {
        throw new Error('Konflikt erkannt: Bitte zuerst deine Änderungen und den aktuellen Teamstand vergleichen. Deine lokale Planung bleibt erhalten.');
      }
      const summary = await pushSharedClass(activeRoom);
      const hash = classRoomFingerprint(activeRoom);
      setApp(prev => {
        const current = syncActiveClass(prev);
        const classes = (current.classes || []).map(room => {
          if (room.id !== activeRoom.id || room.teamTeaching?.sharedClassId !== activeSharedId) return room;
          const latestHash = classRoomFingerprint(room);
          return {
            ...room,
            teamTeaching: {
              ...room.teamTeaching!,
              revision: summary.revision,
              lastSyncedHash: hash,
              lastSyncedAt: summary.updatedAt,
              syncStatus: latestHash === hash ? 'synced' : 'idle',
              syncMessage: latestHash === hash ? undefined : 'Weitere lokale Änderungen wurden während des Sendens vorgenommen und müssen noch synchronisiert werden.',
            },
          };
        });
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

  const showLatestChanges = async () => {
    if (!activeSharedId) return;
    setBusy('preview-latest');
    setError(null);
    try {
      const latest = await pullSharedClass(activeSharedId);
      const current = syncActiveClass(liveAppRef.current);
      const local = current.classes.find(room => room.teamTeaching?.sharedClassId === activeSharedId);
      if (!local) throw new Error('Die lokale Teamklasse konnte nicht gefunden werden. Nichts wurde überschrieben.');
      setChangesPreview({
        title: 'Deine lokale Klasse im Vergleich zum aktuellen Teamstand',
        changes: describeTeamClassChanges(local, latest.room),
        revision: latest.detail.revision,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Die aktuelle Teamversion konnte nicht geladen werden.');
    } finally { setBusy(null); }
  };

  const showHistory = async () => {
    if (!activeSharedId) return;
    if (historyVisible) { setHistoryVisible(false); return; }
    setHistoryBusy(true);
    setError(null);
    try {
      setHistory(await listSharedClassHistory(activeSharedId));
      setHistoryVisible(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Die Versionsgeschichte konnte nicht geladen werden.');
    } finally { setHistoryBusy(false); }
  };

  const previewHistoryVersion = async (version: SharedClassHistoryVersion) => {
    if (!activeSharedId) return;
    setBusy('preview-history');
    setError(null);
    try {
      const [historical, latest] = await Promise.all([
        pullSharedClassRevision(activeSharedId, version.revision),
        pullSharedClass(activeSharedId),
      ]);
      if (historical.room.id !== latest.room.id) throw new Error('Die Klassen-IDs der Versionen stimmen nicht überein.');
      setChangesPreview({
        title: 'Teamversion ' + version.revision + ' im Vergleich zum aktuellen Teamstand ' + latest.detail.revision,
        changes: describeTeamClassChanges(historical.room, latest.room),
        revision: version.revision,
        room: historical.room,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Die ältere Teamversion konnte nicht entschlüsselt werden.');
    } finally { setBusy(null); }
  };

  const restoreHistoryVersion = async () => {
    if (!activeSharedId || !changesPreview?.room || !activeRoom?.teamTeaching) return;
    if (activeRoom.teamTeaching.role === 'viewer') return;
    setBusy('restore-history');
    setError(null);
    try {
      const latest = await pullSharedClass(activeSharedId);
      const current = syncActiveClass(liveAppRef.current);
      const local = current.classes.find(room => room.teamTeaching?.sharedClassId === activeSharedId);
      if (!local?.teamTeaching || local.teamTeaching.revision !== latest.detail.revision
        || !local.teamTeaching.lastSyncedHash
        || classRoomFingerprint(local) !== local.teamTeaching.lastSyncedHash
        || classRoomFingerprint(local) !== classRoomFingerprint(latest.room)) {
        throw new Error('Du hast noch lokale Änderungen oder eine ältere Teamversion. Bitte zuerst vergleichen und abgleichen. Deine Arbeit wurde nicht überschrieben.');
      }
      if (changesPreview.room.id !== latest.room.id || changesPreview.revision >= latest.detail.revision) {
        throw new Error('Diese Version kann nicht wiederhergestellt werden. Bitte die Versionsgeschichte aktualisieren.');
      }
      const beforeHash = classRoomFingerprint(local);
      if (!window.confirm('Teamversion ' + changesPreview.revision + ' als NEUE gemeinsame Version wiederherstellen? Die heutige Version bleibt in der verschlüsselten Versionsgeschichte erhalten.')) return;
      const currentAfterConfirm = syncActiveClass(liveAppRef.current).classes.find(room => room.id === local.id);
      if (!currentAfterConfirm || classRoomFingerprint(currentAfterConfirm) !== beforeHash) {
        throw new Error('Während der Bestätigung wurden lokale Änderungen vorgenommen. Wiederherstellung gestoppt.');
      }
      const restoreRoom: ClassRoom = {
        ...changesPreview.room,
        teamTeaching: { ...local.teamTeaching, revision: latest.detail.revision, role: latest.detail.myRole,
          lastSyncedHash: beforeHash },
      };
      const saved = await pushSharedClass(restoreRoom);
      const restored: ClassRoom = {
        ...restoreRoom,
        teamTeaching: { ...restoreRoom.teamTeaching!, revision: saved.revision,
          lastSyncedHash: classRoomFingerprint(restoreRoom), lastSyncedAt: saved.updatedAt,
          syncStatus: 'synced', syncMessage: undefined },
      };
      let concurrentLocalEdits = false;
      setApp(prev => {
        const state = syncActiveClass(prev);
        const nowLocal = state.classes.find(room => room.id === local.id);
        if (!nowLocal || classRoomFingerprint(nowLocal) !== beforeHash
          || nowLocal.teamTeaching?.revision !== local.teamTeaching?.revision) {
          concurrentLocalEdits = true;
          return prev; // Keep the new local changes intact; the server still archives both versions.
        }
        return adoptAcknowledgedTeamRoom({ ...state, activeClassId: undefined }, restored);
      });
      setChangesPreview(null);
      setHistory(await listSharedClassHistory(activeSharedId));
      setNotice(concurrentLocalEdits
        ? 'Die ältere Version wurde im Team wiederhergestellt. Deine zwischenzeitlichen lokalen Änderungen sind erhalten; bitte den Teamstand vergleichen.'
        : 'Version ' + changesPreview.revision + ' wurde als neue Teamversion ' + saved.revision + ' wiederhergestellt. Vorherige Stände bleiben erhalten.');
      await load();
    } catch (cause: any) {
      setError(cause?.code === 'REVISION_CONFLICT'
        ? 'Die Teamklasse wurde inzwischen geändert. Wiederherstellung abgebrochen; keine lokale Änderung wurde überschrieben.'
        : cause instanceof Error ? cause.message : 'Wiederherstellung fehlgeschlagen.');
    } finally { setBusy(null); }
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
          delete clone.teamTeachingSharedClassId;
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
            {activeRoom?.teamTeaching && (
              <div className="mt-3 space-y-1 rounded-xl border border-[var(--border)] bg-[var(--surface2)] px-3 py-3 text-xs text-[var(--text2)]" aria-live="polite">
                <p className="font-bold text-[var(--text)]">Gemeinsamer Teamstand: Version {activeSummary?.revision ?? 'wird geprüft'}</p>
                <p>{activeSummary?.contentUpdatedAt
                  ? 'Zuletzt inhaltlich geändert am ' + formatTeamDate(activeSummary.contentUpdatedAt) + ' von '
                    + (activeSummary.members.find(member => member.userId === activeSummary.contentUpdatedBy)?.displayName || 'einer Teamlehrperson')
                  : 'Der genaue Zeitpunkt der letzten Inhaltsänderung ist für diese ältere Teamversion nicht erfasst.'}</p>
                <p>Dein Gerät: Version {activeRoom.teamTeaching.revision} · zuletzt abgeglichen am {formatTeamDate(activeRoom.teamTeaching.lastSyncedAt)}</p>
                <p className="font-semibold">{activeRoom.teamTeaching.lastSyncedHash
                  ? classRoomFingerprint(activeRoom) === activeRoom.teamTeaching.lastSyncedHash
                    ? 'Keine ungesendeten lokalen Inhaltsänderungen erkannt.'
                    : 'Du hast lokale Änderungen, die noch nicht bestätigt wurden.'
                  : 'Dieses Gerät hat noch keinen bestätigten Teamstand. Senden ist gesperrt.'}</p>
              </div>
            )}
            {activeRoom?.teamTeaching?.syncMessage && (
              <p className="mt-2 max-w-2xl text-xs leading-5 text-[var(--text2)]">
                {activeRoom.teamTeaching.syncMessage}
              </p>
            )}
          </div>
          {!activeRoom?.teamTeaching ? (
            knownTeamReference ? (
              <div className="flex max-w-xl flex-col gap-2">
                <p className="text-sm font-semibold text-amber-800">Diese Klasse ist bereits geteilt, aber auf diesem Gerät noch nicht mit dem Klassenteam verbunden. Die angezeigte Wochenplanung kann deshalb älter sein.</p>
                {reconnectableTeam
                  ? <button onClick={() => void adopt(reconnectableTeam)} disabled={Boolean(busy)} className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">Teamklasse verbinden und neueste Planung laden</button>
                  : <p className="text-xs font-semibold text-rose-700">Die ursprüngliche Teamklasse ist mit diesem Schulkonto derzeit nicht erreichbar. Bitte Mitgliedschaft und Schulmail prüfen; keine neue Teamklasse erstellen.</p>}
              </div>
            ) : (
              <button onClick={enableSharing} disabled={!activeRoom || busy === 'enable'} className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">
                {busy === 'enable' ? 'Wird vorbereitet …' : 'Gemeinsame Klasse aktivieren'}
              </button>
            )
          ) : (
            <div className="flex flex-wrap gap-2">
              <button onClick={showLatestChanges} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold disabled:opacity-50">Änderungen vergleichen</button>
              <button onClick={() => void showHistory()} disabled={Boolean(busy) || historyBusy} aria-expanded={historyVisible} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold disabled:opacity-50">{historyVisible ? 'Versionsgeschichte schließen' : 'Versionsgeschichte'}</button>
              <button onClick={pull} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold"><Download size={16}/> Neueste Version laden</button>
              {activeRoom.teamTeaching.role !== 'viewer' && <button onClick={push} disabled={Boolean(busy) || activeRoom.teamTeaching.syncStatus === 'conflict' || !activeRoom.teamTeaching.lastSyncedHash} className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-black text-white disabled:opacity-50"><Upload size={16}/> Änderungen senden</button>}
            </div>
          )}
        </div>
      </section>

      {activeSharedId && changesPreview && (
        <section aria-label="Teamteaching-Vorschau" className="rounded-[1.75rem] border border-indigo-300 bg-[var(--surface)] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-black">{changesPreview.title}</h2>
            <button type="button" onClick={() => setChangesPreview(null)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold">Vorschau schließen</button>
          </div>
          <p className="text-sm text-[var(--text2)]">Nur auf deinem berechtigten Gerät entschlüsselt. Die Vorschau ändert weder deine lokalen Daten noch den Teamstand.</p>
          {changesPreview.changes.length === 0
            ? <p className="rounded-xl bg-emerald-500/10 p-3 text-sm font-semibold">Keine inhaltlichen Unterschiede zwischen den verglichenen Versionen.</p>
            : <div className="max-h-[440px] overflow-auto space-y-2" aria-label="Geänderte Felder">
                {changesPreview.changes.map((change, index) => (
                  <div key={index} className="rounded-xl border border-[var(--border)] bg-[var(--surface2)] p-3">
                    <div className="mb-2 text-sm font-bold break-words">{change.path}</div>
                    <div className="grid gap-2 sm:grid-cols-2 text-xs">
                      <div className="rounded-lg bg-rose-500/5 p-2 break-words"><strong className="block mb-1">Bisher / lokal</strong>{change.before}</div>
                      <div className="rounded-lg bg-emerald-500/5 p-2 break-words"><strong className="block mb-1">Aktuell / im Team</strong>{change.after}</div>
                    </div>
                  </div>
                ))}
              </div>}
          {changesPreview.changes.length >= 100 && <p className="text-xs font-semibold text-amber-700">Es gibt möglicherweise weitere Unterschiede. Die Vorschau zeigt die ersten 100 geänderten Felder.</p>}
          {changesPreview.room && changesPreview.revision !== activeSummary?.revision && activeRoom?.teamTeaching?.role !== 'viewer' && (
            <button type="button" onClick={() => void restoreHistoryVersion()} disabled={Boolean(busy)} className="rounded-xl border border-amber-400 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-900 disabled:opacity-50">Diese historische Version als neue Teamversion wiederherstellen</button>
          )}
        </section>
      )}

      {activeSharedId && historyVisible && (
        <section aria-label="Verschlüsselte Team-Versionsgeschichte" className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-black">Versionsgeschichte der Teamklasse</h2>
            <button type="button" disabled={historyBusy || Boolean(busy)} onClick={() => void listSharedClassHistory(activeSharedId).then(setHistory).catch(cause => setError(cause instanceof Error ? cause.message : 'Versionsgeschichte nicht verfügbar.'))} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-bold disabled:opacity-50">Aktualisieren</button>
          </div>
          <p className="text-xs text-[var(--text2)]">Vor dem Ersetzen wurde jede frühere Teamversion verschlüsselt gesichert. Eine Wiederherstellung erzeugt eine neue Version; keine ältere Version wird dazu gelöscht.</p>
          <div className="max-h-72 overflow-auto space-y-2">
            {history.map(version => (
              <div key={version.revision} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--surface2)] p-3">
                <div className="text-sm"><strong>Version {version.revision}</strong> · {formatTeamDate(version.updatedAt)}<div className="text-xs text-[var(--text2)]">{activeSummary?.members.find(member => member.userId === version.updatedBy)?.displayName || 'Teamlehrperson'}</div></div>
                <button type="button" onClick={() => void previewHistoryVersion(version)} disabled={Boolean(busy)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-bold disabled:opacity-50">Änderungen ansehen</button>
              </div>
            ))}
          </div>
        </section>
      )}

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

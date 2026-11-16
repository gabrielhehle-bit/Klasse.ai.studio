import React from 'react';
import { RefreshCw, ShieldCheck, UserPlus, Users, LockKeyhole, Trash2, Download, Upload, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { syncActiveClass, switchClassState } from '../lib/appState';
import {
  addTeamTeachingMember,
  createSharedClass,
  deleteSharedClass,
  getSharedClassDetail,
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
  requestTeamTeachingDeviceAccess,
  approveTeamTeachingDeviceAccess,
  updateTeamTeachingMemberRole,
  type SharedClassSummary,
  type SharedClassHistoryVersion,
  type TeamTeachingColleague,
} from '../lib/teamTeachingService';
import { classRoomFingerprint, classRoomWithoutTeamMetadata } from '../lib/teamTeachingCrypto';
import { adoptAcknowledgedTeamRoom } from '../lib/teamTeachingProjection';
import { describeTeamClassChanges, type TeamClassChange } from '../lib/teamTeachingChanges';
import { mergeTeamClassRevisions } from '../lib/teamTeachingMerge';
import { hasRecoverableLocalClassData, prepareLocalTeamRecoveryRoom } from '../lib/teamTeachingRecovery';
import { assertTeamTeachingDevicePersisted } from '../lib/teamTeachingDevice';
import type { ClassRoom } from '../types';
import ClassTeamStatus from './ClassTeamStatus';
import EmailAccountLogin from './EmailAccountLogin';
import { ACCOUNT_SESSION_CHANGED_EVENT } from '../lib/accountSyncService';
import { useTeamDeviceAuthorization } from '../hooks/useTeamDeviceAuthorization';
import { teamSyncPresentation } from '../lib/teamSyncPresentation';
import { getTeacherTeamNextAction, getTeacherTeamStepNumber, type TeacherTeamNextAction } from '../lib/teacherTeamSetup';
import { teacherClassPermission, teacherClassWorkingStatus } from '../lib/teamTeachingTeacherCopy';

const TEAM_CONNECTION_ERROR = 'Die Verbindung zum Klassenteam ist gerade unterbrochen. Sie wird automatisch erneut geprüft.';

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
  const [colleagueQuery, setColleagueQuery] = React.useState('');
  const [teamUserId, setTeamUserId] = React.useState('');
  const [teamDeviceId, setTeamDeviceId] = React.useState('');
  const [awaitingDeviceApprovalFor, setAwaitingDeviceApprovalFor] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<SharedClassHistoryVersion[]>([]);
  const [historyBusy, setHistoryBusy] = React.useState(false);
  const [changesPreview, setChangesPreview] = React.useState<{
    title: string; changes: TeamClassChange[]; revision: number; room?: ClassRoom;
  } | null>(null);
  const [historyVisible, setHistoryVisible] = React.useState(false);
  const [mergePreview, setMergePreview] = React.useState<{
    base: ClassRoom; local: ClassRoom; remote: ClassRoom;
    remoteRevision: number; localRevision: number; localHash: string;
    conflicts: string[]; changes: TeamClassChange[];
  } | null>(null);
  const [mergeDecisions, setMergeDecisions] = React.useState<Record<string, 'local' | 'team'>>({});
  const [recoveryOpen, setRecoveryOpen] = React.useState(false);
  const [recoveryBackupsConfirmed, setRecoveryBackupsConfirmed] = React.useState(false);
  const [recoveryBaseConfirmed, setRecoveryBaseConfirmed] = React.useState(false);

  const synced = React.useMemo(() => syncActiveClass(app), [app]);
  const activeRoom = synced.classes?.find(room => room.id === synced.activeClassId);
  const activeSharedId = activeRoom?.teamTeaching?.sharedClassId;
  const activeSummary = shared.find(item => item.id === activeSharedId);
  const deviceAuthorization = useTeamDeviceAuthorization(activeSharedId);
  const ownDeviceRequest = activeSummary?.deviceAccessRequests?.find(request => request.userId === teamUserId && request.deviceId === teamDeviceId);
  const deviceRequestsToApprove = shared.filter(room => room.myRole !== 'viewer').flatMap(room =>
    (room.deviceAccessRequests || []).filter(request => request.userId !== teamUserId).map(request => ({ room, request })));
  const knownTeamReference = activeRoom?.teamTeachingSharedClassId;
  const reconnectableTeam = knownTeamReference
    ? shared.find(item => item.id === knownTeamReference)
    : undefined;

  React.useEffect(() => {
    if (ownDeviceRequest && activeSharedId) {
      setAwaitingDeviceApprovalFor(activeSharedId);
    } else if (activeSharedId && awaitingDeviceApprovalFor === activeSharedId && deviceAuthorization === 'authorized') {
      setAwaitingDeviceApprovalFor(null);
      setError(null);
      setNotice('Dein Gerät ist jetzt freigegeben. Deine lokalen Änderungen bleiben erhalten. Falls ein Team-Konflikt angezeigt wird, wähle „Änderungen zusammenführen“.');
    }
  }, [ownDeviceRequest, activeSharedId, awaitingDeviceApprovalFor, deviceAuthorization]);

  const load = React.useCallback(async (showInitialLoader = false) => {
    // Refreshing membership on focus must not blank the setup wizard or hide
    // the button a teacher is about to press. Only first load blocks the page.
    if (showInitialLoader) setLoading(true);
    setError(null);
    try {
      const session = await ensureRegisteredTeamTeachingDevice();
      const [classes, users, allSchoolUsers] = await Promise.all([
        listSharedClasses(),
        listTeamTeachingColleagues(),
        listTeamTeachingSchoolUsers(),
      ]);
      setShared(classes);
      setColleagues(users);
      setSchoolUsers(allSchoolUsers);
      setTeamUserId(session.me.user.userId);
      setTeamDeviceId(session.device.deviceId);
      setNeedsSchoolLogin(false);
    } catch (cause: any) {
      const schoolLoginRequired = cause?.status === 403;
      setNeedsSchoolLogin(cause?.status === 401 || schoolLoginRequired);
      setError(cause?.status === 401
        ? 'Deine Anmeldung ist abgelaufen. Melde dich hier mit deiner bisherigen Schulmail erneut an. Deine lokale Klasse bleibt erhalten.'
        : schoolLoginRequired
        ? 'Für Teamteaching brauchst du eine Anmeldung mit einer verifizierten Schulmail.'
        : cause instanceof TypeError ? TEAM_CONNECTION_ERROR
        : cause instanceof Error ? cause.message : 'Klassenteam konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(true); }, [load]);
  React.useEffect(() => {
    const reload = () => { void load(); };
    window.addEventListener(ACCOUNT_SESSION_CHANGED_EVENT, reload);
    return () => window.removeEventListener(ACCOUNT_SESSION_CHANGED_EVENT, reload);
  }, [load]);
  React.useEffect(() => {
    const reconnect = () => { if (!needsSchoolLogin) void load(); };
    window.addEventListener('online', reconnect);
    window.addEventListener('focus', reconnect);
    return () => {
      window.removeEventListener('online', reconnect);
      window.removeEventListener('focus', reconnect);
    };
  }, [load, needsSchoolLogin]);
  // Update the visible content revision even while the colleague works on another device.
  React.useEffect(() => {
    if (needsSchoolLogin) return;
    const refresh = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void listSharedClasses().then(classes => {
        setShared(classes);
        setError(previous => previous === TEAM_CONNECTION_ERROR ? null : previous);
      }).catch((cause) => {
        if (cause?.status === 401 || cause?.status === 403) void load();
        else if (cause instanceof TypeError) setError(TEAM_CONNECTION_ERROR);
      });
    }, 10000);
    return () => window.clearInterval(refresh);
  }, [activeSharedId, needsSchoolLogin, load]);

  // A colleague's first school login and device registration should appear
  // without the owner reloading the whole Klassenteam form or losing a search.
  React.useEffect(() => {
    if (needsSchoolLogin || !activeSharedId || activeSummary?.myRole !== 'owner'
      || (activeSummary?.members.length || 0) >= 2) return;
    let cancelled = false;
    let refreshing = false;
    const refreshColleagues = async () => {
      if (refreshing || document.visibilityState !== 'visible') return;
      refreshing = true;
      try {
        const [users, allUsers] = await Promise.all([
          listTeamTeachingColleagues(),
          listTeamTeachingSchoolUsers(),
        ]);
        if (!cancelled) {
          setColleagues(users);
          setSchoolUsers(allUsers);
        }
      } catch {
        // A temporary connection loss must never make an existing member
        // disappear or be mistaken for a new, empty school account.
      } finally { refreshing = false; }
    };
    const timer = window.setInterval(() => { void refreshColleagues(); }, 12_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [activeSharedId, activeSummary?.myRole, activeSummary?.members.length, needsSchoolLogin]);

  const requestDeviceAccess = async (sharedClassId = activeSharedId) => {
    if (!sharedClassId) return;
    setBusy('request-device');
    setError(null);
    try {
      const request = await requestTeamTeachingDeviceAccess(sharedClassId);
      setAwaitingDeviceApprovalFor(sharedClassId);
      setNotice('Freigabe angefordert. Bitte deine Teamkollegin oder deinen Teamkollegen um Bestätigung bitten. Prüfcode: ' + request.verificationCode);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Freigabe konnte nicht angefordert werden.'); }
    finally { setBusy(null); }
  };

  const approveDeviceAccess = async (sharedClassId: string, requestId: string, name: string, code: string) => {
    if (!window.confirm('Gerät für ' + name + ' freigeben? Bitte den Prüfcode ' + code + ' mit der anfragenden Lehrperson abgleichen. Die Klassenrolle bleibt unverändert.')) return;
    setBusy('approve-device:' + requestId);
    setError(null);
    try {
      await approveTeamTeachingDeviceAccess(sharedClassId, requestId);
      setNotice('Das angefragte Gerät für ' + name + ' ist freigegeben.');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Das Gerät konnte nicht freigegeben werden.'); }
    finally { setBusy(null); }
  };

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

  // Last-resort recovery: when the last authorized device is gone, nobody can
  // decrypt the OLD team ciphertext. A separate new team may still be created
  // from the owner's LOCAL class after both teachers have independently backed up.
  // Never delete, rewrite, or detach the inaccessible original team.
  const startLocalTeamRecovery = async () => {
    if (busy || !activeSharedId || activeSummary?.myRole !== 'owner'
      || deviceAuthorization !== 'unauthorized'
      || !recoveryBackupsConfirmed || !recoveryBaseConfirmed) return;
    setBusy('recover-local');
    setError(null);
    try {
      const live = syncActiveClass(liveAppRef.current);
      const local = live.classes?.find(room => room.id === live.activeClassId);
      if (!local || local.teamTeaching?.sharedClassId !== activeSharedId) {
        throw new Error('Die lokale Klasse hat gewechselt. Bitte den Wiederanlauf erneut prüfen.');
      }
      // Re-check actual owner permission on the server, not a possibly stale
      // local placeholder role. A colleague cannot initiate this flow.
      const serverClass = await getSharedClassDetail(activeSharedId);
      if (serverClass.myRole !== 'owner' || serverClass.id !== activeSharedId) {
        throw new Error('Nur die Besitzerin bzw. der Besitzer der bisherigen Klasse darf diesen Wiederanlauf starten.');
      }
      const { me: currentUser, device: currentDevice } = await ensureRegisteredTeamTeachingDevice();
      if (currentUser.user.userId !== teamUserId) throw new Error('Die Anmeldung hat sich geändert. Bitte neu anmelden und prüfen.');
      await assertTeamTeachingDevicePersisted(currentUser.user.userId, currentDevice.deviceId);
      const existingTeams = await listSharedClasses();
      const existingRestart = existingTeams.find(item => item.ownerUserId === teamUserId
        && item.classLabel === local.name.trim() + ' – Neustart');
      if (existingRestart) {
        throw new Error('Ein neuer Teamstand wurde bereits erstellt. Öffne bitte zuerst „'
          + existingRestart.classLabel + '“ unter „Mit mir geteilte Klassen“, statt einen weiteren anzulegen.');
      }
      const prepared = prepareLocalTeamRecoveryRoom(local, crypto.randomUUID());
      if (!window.confirm(
        'Neues, SEPARATES Klassenteam „' + prepared.name + '“ aus deinem LOKALEN Klassenstand erstellen? '
        + 'Die alte gemeinsame Teamklasse und ihre verschlüsselte Versionsgeschichte bleiben unverändert. '
        + 'Die andere Lehrperson muss anschließend zur NEUEN Klasse eingeladen werden. '
        + 'Nicht übertragene Einträge der anderen Person werden nicht automatisch übernommen.'
      )) return;
      // The server stores a NEW ciphertext under a NEW ID and fresh class key.
      // Inaccessible legacy ciphertext is never decrypted, replaced, or deleted.
      const result = await createSharedClass(prepared);
      setApp(prev => {
        const current = syncActiveClass(prev);
        if (current.classes.some(room => room.id === result.localRoom.id)) return prev;
        const latestOriginal = current.classes.find(room => room.id === local.id);
        if (!latestOriginal || classRoomFingerprint(latestOriginal) !== classRoomFingerprint(local)) {
          // Another tab edited during creation: preserve both independent
          // classes; do not silently mark its newer edits as synchronized.
          return { ...current, classes: [...current.classes, result.localRoom] };
        }
        return adoptAcknowledgedTeamRoom({ ...current, activeClassId: undefined }, result.localRoom);
      });
      setRecoveryOpen(false);
      setRecoveryBackupsConfirmed(false);
      setRecoveryBaseConfirmed(false);
      setNotice('Das NEUE Klassenteam „' + result.localRoom.name
        + '“ wurde aus deinem lokalen Stand erstellt. Die alte Teamklasse blieb unverändert. '
        + 'Bitte wähle jetzt im neuen Klassenteam die zweite Lehrperson aus; ihre eigene Sicherung bleibt erhalten.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Neuer Teamstand konnte nicht angelegt werden. Die alte Klasse bleibt unverändert.');
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
      if (message.includes('noch nicht freigegeben')) {
        // A teacher who is already a class member can request this device's
        // key when trying to open the class. No pupil data is transferred.
        try {
          const request = await requestTeamTeachingDeviceAccess(summary.id);
          setAwaitingDeviceApprovalFor(summary.id);
          setNotice('Gerätefreigabe angefordert. Bitte eine berechtigte Teamlehrperson um Bestätigung bitten. Prüfcode: ' + request.verificationCode);
          await load();
        } catch (requestError) {
          setError(requestError instanceof Error ? requestError.message
            : 'Dieses Gerät muss durch eine berechtigte Teamlehrperson freigegeben werden.');
        }
      } else {
        setError(message);
      }
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
          ? 'Gemeinsame Klasse geladen. Deine bisherigen lokalen Änderungen sind als „Konfliktkopie“ in der Klassenauswahl erhalten; sie sind nicht automatisch im Team.'
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
              syncStatus: latestHash === hash ? ('synced' as const) : ('idle' as const),
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

  // One teacher-facing action. Re-read server metadata first; never guess that
  // an old tab can upload safely or overwrite another teacher's changes.
  const synchronizeTeamSimply = async () => {
    if (busy || !activeSharedId || !activeRoom?.teamTeaching) return;
    setBusy('smart-sync');
    setError(null);
    try {
      const latestList = await listSharedClasses();
      setShared(latestList);
      const remote = latestList.find(item => item.id === activeSharedId);
      const now = syncActiveClass(liveAppRef.current).classes.find(room => room.id === activeRoom.id);
      if (!remote || !now?.teamTeaching || now.teamTeaching.sharedClassId !== activeSharedId) {
        throw new Error('Teamverbindung nicht bestätigt. Bitte die Anmeldung und Gerätefreigabe prüfen.');
      }
      if (now.teamTeaching.syncStatus === 'conflict' || now.teamTeaching.syncStatus === 'error') {
        setNotice('Die Änderungen müssen zuerst verglichen werden. Nichts wurde überschrieben.');
        return;
      }
      const hasLocalEdits = !now.teamTeaching.lastSyncedHash
        || classRoomFingerprint(now) !== now.teamTeaching.lastSyncedHash;
      const remoteChanged = remote.revision > now.teamTeaching.revision;
      if (remote.revision < now.teamTeaching.revision) {
        throw new Error('Der Server meldet eine ältere Version. Bitte die Verbindung prüfen; nichts wurde übertragen.');
      }
      if (hasLocalEdits && remoteChanged) {
        setNotice('Auf beiden Geräten wurde gearbeitet. Bitte „Änderungen zusammenführen“ wählen. Deine Eingaben bleiben erhalten.');
        return;
      }
      if (hasLocalEdits && !now.teamTeaching.lastSyncedHash) {
        throw new Error('Dieser Teamstand ist noch nicht bestätigt. Bitte zuerst die Verbindung prüfen; deine lokalen Eingaben bleiben erhalten.');
      }
      if (hasLocalEdits && now.teamTeaching.role === 'viewer') {
        throw new Error('Dieses Gerät hat nur Leserechte. Die lokale Fassung bleibt erhalten.');
      }
      if (hasLocalEdits) {
        // Recheck the live state after the network call to avoid pushing a stale
        // snapshot when a teacher continues editing during the server check.
        if (classRoomFingerprint(activeRoom) !== classRoomFingerprint(now)
          || activeRoom.teamTeaching.revision !== now.teamTeaching.revision) {
          throw new Error('Es gab inzwischen neue Eingaben. Bitte „Synchronisieren“ erneut auswählen.');
        }
        setBusy(null);
        await push();
      } else if (remoteChanged) {
        setBusy(null);
        await pull();
      } else {
        setNotice('Der gemeinsame Klassenstand ist bereits aktuell. Keine Aktion erforderlich.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Der Abgleich war nicht möglich. Deine Daten bleiben erhalten.');
    } finally {
      setBusy(null);
    }
  };

  const prepareSafeMerge = async () => {
    if (!activeSharedId) return;
    setBusy('prepare-merge');
    setError(null);
    setMergePreview(null);
    setMergeDecisions({});
    try {
      const current = syncActiveClass(liveAppRef.current);
      const local = current.classes.find(room => room.teamTeaching?.sharedClassId === activeSharedId);
      const meta = local?.teamTeaching;
      if (!local || !meta || !meta.lastSyncedHash || meta.role === 'viewer') {
        throw new Error('Auf diesem Gerät fehlt noch ein bestätigter bearbeitbarer Teamstand. Zusammenführen ist gesperrt.');
      }
      const latest = await pullSharedClass(activeSharedId);
      if (latest.room.id !== local.id) throw new Error('Die Klassen-IDs stimmen nicht überein.');
      if (latest.detail.revision <= meta.revision) {
        throw new Error('Der Teamstand ist nicht neuer als deine lokale Version. Bitte die lokale Synchronisierung prüfen.');
      }
      const base = await pullSharedClassRevision(activeSharedId, meta.revision);
      const prepared = mergeTeamClassRevisions(base.room, local, latest.room);
      setMergePreview({
        base: base.room, local, remote: latest.room,
        remoteRevision: latest.detail.revision, localRevision: meta.revision,
        localHash: classRoomFingerprint(local), conflicts: prepared.conflicts,
        changes: describeTeamClassChanges(local, latest.room),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Der sichere Teamvergleich war nicht möglich. Deine lokale Arbeit bleibt erhalten.');
    } finally { setBusy(null); }
  };

  const confirmSafeMerge = async () => {
    if (!activeSharedId || !mergePreview) return;
    setBusy('merge');
    setError(null);
    try {
      const combined = mergeTeamClassRevisions(mergePreview.base, mergePreview.local,
        mergePreview.remote, mergeDecisions);
      if (!combined.room || combined.conflicts.length) {
        throw new Error('Bitte entscheide für alle gleichzeitig bearbeiteten Felder, welche Fassung übernommen werden soll.');
      }
      const current = syncActiveClass(liveAppRef.current);
      const local = current.classes.find(room => room.teamTeaching?.sharedClassId === activeSharedId);
      if (!local?.teamTeaching || local.teamTeaching.revision !== mergePreview.localRevision
        || classRoomFingerprint(local) !== mergePreview.localHash) {
        throw new Error('Deine lokale Klasse hat sich seit dem Vergleich geändert. Bitte erneut vergleichen. Nichts wurde überschrieben.');
      }
      const latest = await pullSharedClass(activeSharedId);
      if (latest.detail.revision !== mergePreview.remoteRevision
        || classRoomFingerprint(latest.room) !== classRoomFingerprint(mergePreview.remote)) {
        throw new Error('Die Teamlehrperson hat inzwischen erneut gespeichert. Bitte mit der neuesten Teamversion vergleichen.');
      }
      if (!window.confirm('Deine ausgewählten Änderungen und den aktuellen Teamstand als NEUE gemeinsame Version speichern? Beide vorherigen Versionen bleiben in der verschlüsselten Versionsgeschichte.')) return;
      const afterConfirm = syncActiveClass(liveAppRef.current).classes.find(room => room.id === local.id);
      if (!afterConfirm || classRoomFingerprint(afterConfirm) !== mergePreview.localHash) {
        throw new Error('Während der Bestätigung gab es weitere lokale Änderungen. Zusammenführen gestoppt.');
      }
      const ready: ClassRoom = {
        ...combined.room,
        teamTeaching: {
          ...local.teamTeaching, role: latest.detail.myRole, revision: latest.detail.revision,
          lastSyncedHash: classRoomFingerprint(latest.room),
        },
      };
      const saved = await pushSharedClass(ready);
      const merged: ClassRoom = {
        ...ready,
        teamTeaching: { ...ready.teamTeaching!, revision: saved.revision,
          lastSyncedHash: classRoomFingerprint(ready), lastSyncedAt: saved.updatedAt,
          syncStatus: 'synced', syncMessage: undefined },
      };
      let localChangedMeanwhile = false;
      setApp(prev => {
        const state = syncActiveClass(prev);
        const nowLocal = state.classes.find(room => room.id === local.id);
        if (!nowLocal || classRoomFingerprint(nowLocal) !== mergePreview.localHash
          || nowLocal.teamTeaching?.revision !== mergePreview.localRevision) {
          localChangedMeanwhile = true;
          return prev;
        }
        return adoptAcknowledgedTeamRoom({ ...state, activeClassId: undefined }, merged);
      });
      setMergePreview(null);
      setMergeDecisions({});
      setChangesPreview(null);
      setNotice(localChangedMeanwhile
        ? 'Teamänderungen wurden zusammengeführt. Zwischenzeitliche Änderungen auf deinem Gerät bleiben erhalten und müssen erneut verglichen werden.'
        : 'Änderungen wurden sicher in Teamversion ' + saved.revision + ' zusammengeführt. Frühere Versionen bleiben erhalten.');
      await load();
    } catch (cause: any) {
      setError(cause?.code === 'REVISION_CONFLICT'
        ? 'Die Teamversion hat sich während des Zusammenführens geändert. Der Server hat den alten Schreibversuch abgelehnt. Bitte erneut vergleichen.'
        : cause instanceof Error ? cause.message : 'Sicheres Zusammenführen nicht möglich. Deine lokale Planung bleibt erhalten.');
    } finally { setBusy(null); }
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
      const saved = await pushSharedClass(restoreRoom, { allowContentRemoval: true });
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
  const pendingInvitation = shared.find(summary =>
    summary.myRole !== 'owner'
    && !synced.classes?.some(room => room.teamTeaching?.sharedClassId === summary.id));
  const available = colleagues.filter(colleague => !memberIds.has(colleague.userId));
  const existingLocalRecovery = activeRoom ? shared.find(room => room.ownerUserId === teamUserId
    && room.classLabel === activeRoom.name.trim() + ' – Neustart') : undefined;
  const searchedColleagues = available.filter(colleague =>
    (colleague.displayName + ' ' + colleague.handle).toLocaleLowerCase('de-AT')
      .includes(colleagueQuery.trim().toLocaleLowerCase('de-AT')))
    .sort((a, b) => Number(b.devices.length > 0) - Number(a.devices.length > 0)
      || a.displayName.localeCompare(b.displayName, 'de-AT'));
  const teamSyncStatus = teamSyncPresentation(activeRoom)?.status;
  const nextAction = getTeacherTeamNextAction({
    needsSchoolLogin,
    hasActiveClass: Boolean(activeRoom),
    hasPendingTeamInvitation: Boolean(pendingInvitation),
    hasSharedClassReference: Boolean(knownTeamReference),
    hasConnectedTeam: Boolean(activeSharedId),
    deviceAuthorized: deviceAuthorization === 'authorized',
    deviceChecking: deviceAuthorization === 'checking' || deviceAuthorization === 'unknown',
    serverSummaryLoaded: Boolean(activeSummary),
    deviceRequestPending: Boolean(ownDeviceRequest),
    teamRole: activeRoom?.teamTeaching?.role,
    teamMemberCount: activeSummary?.members.length,
    colleagueAvailable: available.some(colleague => colleague.devices.length > 0),
    colleagueNeedsDevice: available.some(colleague => colleague.devices.length === 0),
    localChangesPending: teamSyncStatus !== 'synced',
    teamHasConflict: teamSyncStatus === 'conflict',
    serverRevision: activeSummary?.revision,
    localRevision: activeRoom?.teamTeaching?.revision,
  });
  const stepNumber = getTeacherTeamStepNumber(nextAction);
  const guidance: Record<TeacherTeamNextAction, { title: string; text: string; button?: string }> = {
    'sign-in': { title: 'Mit Schulmail anmelden', text: 'Melde dich mit deiner verifizierten Schul-E-Mail-Adresse an. Die persönliche E-Mail-Anmeldung allein reicht ohne Schulfreigabe nicht aus.' },
    'choose-class': { title: 'Wähle zuerst eine Klasse', text: 'Öffne deine Klasse über die Klassenauswahl in KLASSIO. Hier wird keine neue oder leere Klasse erstellt.' },
    'join-invited': { title: 'Du wurdest zu einer Klasse eingeladen', text: 'Öffne die bereits geteilte Klasse. Du musst keine zweite Klasse anlegen und brauchst keinen Synchronisierungscode. Falls dein Gerät noch nicht freigegeben ist, wird die Freigabe angefordert.', button: 'Eingeladene Klasse öffnen' },
    activate: { title: 'Klasse für Zusammenarbeit freigeben', text: 'Deine bestehende Klasse wird verschlüsselt für das Klassenteam freigegeben. Bestehende Einträge bleiben erhalten.', button: 'Diese Klasse gemeinsam nutzen' },
    reconnect: { title: 'Bestehende Teamklasse verbinden', text: 'Diese Klasse gehört bereits zu einem Team. Verbinde den vorhandenen gemeinsamen Stand, statt eine zweite Klasse anzulegen.', button: reconnectableTeam ? 'Bestehende Teamklasse öffnen' : 'Verbindung erneut prüfen' },
    'checking-device': { title: 'Gerätefreigabe wird geprüft', text: 'KLASSIO prüft, ob dieses Gerät den verschlüsselten Teamstand öffnen darf. Bestehende Einträge bleiben erhalten.', button: 'Erneut prüfen' },
    'check-connection': { title: 'Teamserver noch nicht bestätigt', text: 'Die gemeinsame Klasse ist lokal bekannt, aber der Serverstand konnte noch nicht bestätigt werden. Nicht neu freigeben und keine lokale Version überschreiben.', button: 'Teamverbindung prüfen' },
    'request-device': { title: 'Dieses Gerät freigeben lassen', text: 'Bitte jetzt die Gerätefreigabe anfordern. Eine schon berechtigte Teamlehrperson bestätigt den Prüfcode in ihrem Klassenteam.', button: 'Gerätefreigabe anfordern' },
    'await-device': { title: 'Auf Freigabe warten', text: 'Eine berechtigte Kollegin oder ein Kollege muss im Klassenteam „Gerät freigeben“ auswählen und den Prüfcode abgleichen.', button: 'Freigabe erneut prüfen' },
    'add-colleague': { title: 'Kollegin oder Kollegen hinzufügen', text: 'Wähle unten eine Lehrperson deiner Schule. Sie erhält Bearbeitungsrechte nur für die ausdrücklich geteilte Klasse.', button: 'Lehrperson auswählen' },
    'colleague-first-login': { title: 'Kollegin oder Kollegen anmelden lassen', text: 'Die zweite Lehrperson öffnet KLASSIO mit ihrer eigenen verifizierten Schulmail und geht zu „Klassenteam“. Danach erscheint sie hier automatisch in der Liste. Ihr müsst nichts koppeln oder Codes austauschen.', button: 'Kollegium erneut prüfen' },
    'resolve-conflict': { title: 'Zwei unterschiedliche Klassenstände', text: 'Bitte entscheidet, ob auf diesem Gerät noch eigene Eingaben vorhanden sind, die im Team fehlen. Beide Möglichkeiten sind unten erklärt.' },
    'compare-versions': { title: 'Gemeinsamen Stand prüfen', text: 'Ein Klick: KLASSIO prüft den Serverstand und sendet oder lädt Änderungen, wenn das ohne Konflikt möglich ist. Bei gleichzeitigen Änderungen wird nichts überschrieben.', button: 'Jetzt synchronisieren' },
    ready: { title: 'Klassenteam verbunden', text: 'Dieses Gerät hat einen bestätigten gemeinsamen Klassenstand. Änderungen werden jetzt automatisch abgeglichen; du musst nichts von Hand senden.' },
  };
  const guide = guidance[nextAction];
  const onGuideAction = () => {
    switch (nextAction) {
      case 'join-invited':
        if (pendingInvitation) void adopt(pendingInvitation);
        break;
      case 'activate': void enableSharing(); break;
      case 'reconnect':
        if (reconnectableTeam) void adopt(reconnectableTeam);
        else void load();
        break;
      case 'request-device': void requestDeviceAccess(); break;
      case 'checking-device':
      case 'await-device':
      case 'check-connection':
      case 'colleague-first-login': void load(); break;
      case 'add-colleague':
        document.getElementById('team-teacher-invite')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      case 'resolve-conflict':
        if (activeRoom?.teamTeaching?.role === 'viewer' || !activeRoom?.teamTeaching?.lastSyncedHash) void showLatestChanges();
        else void prepareSafeMerge();
        break;
      case 'compare-versions': void synchronizeTeamSimply(); break;
      case 'ready': void synchronizeTeamSimply(); break;
    }
  };

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
            <p data-testid="team-autosave-explanation" className="mt-2 max-w-2xl text-xs font-semibold leading-relaxed text-[var(--text2)]">
              Änderungen werden automatisch auf diesem Gerät gespeichert und bei bestehender Verbindung im Klassenteam abgeglichen. Du musst nicht nach jeder Eingabe auf „Senden“ oder „Laden“ klicken. Erst „Team synchronisiert“ bestätigt den gemeinsamen Stand.
            </p>
          </div>
        </div>
      </header>

      {error && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-700">{error}</div>}
      {error === TEAM_CONNECTION_ERROR && <button type="button" onClick={() => void load()} className="rounded-xl border border-[var(--border)] px-4 py-2 font-bold">Verbindung erneut prüfen</button>}
      {needsSchoolLogin && (
        <EmailAccountLogin />
      )}
      {notice && <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-semibold">{notice}</div>}

      {activeSharedId && activeSummary?.myRole === 'owner'
        && deviceAuthorization === 'unauthorized' && (
        <section data-testid="team-owner-recovery" className="rounded-[1.75rem] border border-amber-400 bg-amber-50 p-5 text-slate-950 space-y-3">
          <h2 className="font-black">Kein freigegebenes Gerät mehr? Sicherer Wiederanlauf</h2>
          <p className="text-sm leading-6">
            Wenn wirklich kein bisheriges Gerät die Klasse mehr öffnen kann, lässt sich der verschlüsselte
            alte Teamstand ohne den Klassenschlüssel nicht entschlüsseln. Du kannst stattdessen aus
            <strong> deinem auf diesem Laptop vorhandenen Klassenstand</strong> ein neues, getrenntes Klassenteam bilden.
            Die bisherige Teamklasse bleibt unverändert und die Sicherungen beider Lehrpersonen bleiben erhalten.
          </p>
          {existingLocalRecovery ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Das neue Team „{existingLocalRecovery.classLabel}“ wurde bereits erstellt. Bitte kein weiteres erstellen.</p>
              <button type="button" disabled={Boolean(busy)} onClick={() => void adopt(existingLocalRecovery)}
                className="min-h-11 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-black text-white disabled:opacity-50">
                Bereits erstelltes neues Klassenteam öffnen
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setRecoveryOpen(value => !value)} disabled={Boolean(busy)}
              className="min-h-11 rounded-xl border border-amber-500 bg-white px-4 py-3 text-left text-sm font-bold text-slate-950 disabled:opacity-50">
              {recoveryOpen ? 'Wiederanlauf schließen' : 'Neues Team aus meiner lokalen Klasse vorbereiten'}
            </button>
          )}
          {recoveryOpen && !existingLocalRecovery && (
            <div className="space-y-3 rounded-xl border border-amber-300 bg-white p-4">
              <p className="font-bold">Ausgangsbasis: {activeRoom?.name || 'Keine Klasse'} · {activeRoom?.schueler?.length ?? 0} Kinder auf diesem Gerät</p>
              <p className="text-sm">
                Die neue Klasse erhält zur Unterscheidung den Zusatz „Neustart“. Sie wird zunächst nur für
                die Besitzerin freigegeben. Danach kann die zweite Lehrperson mit ihrem eigenen Schulkonto
                hinzugefügt werden. Deren bisherige Einträge werden nicht automatisch übernommen.
              </p>
              <label className="flex items-start gap-3 text-sm font-semibold">
                <input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={recoveryBackupsConfirmed}
                  onChange={event => setRecoveryBackupsConfirmed(event.target.checked)} />
                Ich habe von BEIDEN Geräten getrennte verschlüsselte Sicherungsdateien aufbewahrt.
              </label>
              <label className="flex items-start gap-3 text-sm font-semibold">
                <input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={recoveryBaseConfirmed}
                  onChange={event => setRecoveryBaseConfirmed(event.target.checked)} />
                Diese lokale Klasse enthält den vollständigeren Stand und soll als Ausgangsbasis dienen.
              </label>
              <button type="button" data-testid="team-recovery-create" onClick={() => void startLocalTeamRecovery()}
                disabled={Boolean(busy) || !recoveryBackupsConfirmed || !recoveryBaseConfirmed
                  || !activeRoom || !hasRecoverableLocalClassData(activeRoom)}
                className="min-h-11 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-black text-white disabled:opacity-50">
                {busy === 'recover-local' ? 'Neues Team wird gesichert …' : 'Neues Klassenteam sicher erstellen'}
              </button>
              {(!activeRoom || !hasRecoverableLocalClassData(activeRoom)) && (
                <p className="text-sm font-semibold text-rose-700">
                  Dieses Gerät zeigt keinen vollständigen Klasseninhalt. Bitte nichts neu anlegen; zuerst die Sicherung prüfen.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {activeSharedId && deviceAuthorization === 'unauthorized' && pendingInvitation && (
        <section data-testid="team-new-invitation-while-locked" className="rounded-[1.75rem] border border-[var(--accent)] bg-[var(--surface)] p-5 space-y-3">
          <h2 className="font-black">Eine andere gemeinsame Klasse ist für dich bereit</h2>
          <p className="text-sm leading-6">
            „{pendingInvitation.classLabel}“ wurde für dein Schulkonto freigegeben.
            Du kannst sie öffnen, ohne die bisherige lokale Klasse und deren Sicherung zu löschen.
            Bitte wähle sie nur, wenn deine Teamkollegin diese neue Klasse für euch vorbereitet hat.
          </p>
          <button type="button" disabled={Boolean(busy)} onClick={() => void adopt(pendingInvitation)}
            className="min-h-11 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-black text-white disabled:opacity-50">
            Neue Teamklasse öffnen
          </button>
        </section>
      )}

      <section data-testid="team-setup-guide" aria-label="Teamteaching Schritt für Schritt"
        className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-black text-[var(--text)]">Teamteaching in drei Schritten</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label={`Schritt ${stepNumber} von 3`}>
          {['1. Klasse verbinden', '2. Lehrperson hinzufügen', '3. Gemeinsam arbeiten'].map((step, index) => (
            <div key={step} className={`rounded-xl border px-3 py-2 text-xs font-bold ${stepNumber === index + 1
              ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]'
              : 'border-[var(--border)] text-[var(--text2)]'}`}
              aria-current={stepNumber === index + 1 ? 'step' : undefined}>{step}</div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-black text-[var(--text)]" data-testid="team-setup-next-action">{guide.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text2)]">{guide.text}</p>
            {nextAction === 'colleague-first-login' && (
              <p className="mt-2 text-xs font-semibold text-[var(--text2)]">
                Tipp: Jede Lehrperson verwendet ihr eigenes Konto. Es wird kein gemeinsames Passwort benötigt.
              </p>
            )}
            {nextAction === 'ready' && activeRoom?.teamTeaching && (
              <p className="mt-2 text-xs font-semibold text-[var(--text2)]">
                {teacherClassPermission(activeRoom.teamTeaching.role)}
              </p>
            )}
          </div>
          {nextAction === 'resolve-conflict' && (
            <div data-testid="team-conflict-quick-help" className="w-full rounded-xl border border-amber-300 bg-amber-50 p-4 text-slate-950">
              <p className="text-sm font-black">Hast du auf diesem Gerät etwas eingetragen, das die andere Lehrperson noch nicht sieht?</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => void pull()} disabled={Boolean(busy)}
                  className="min-h-12 rounded-xl bg-[var(--accent)] px-4 py-3 text-left text-sm font-bold text-white disabled:opacity-55">
                  Nein – gemeinsame Klasse laden
                </button>
                <button type="button" onClick={onGuideAction} disabled={Boolean(busy)}
                  className="min-h-12 rounded-xl border border-amber-500 bg-white px-4 py-3 text-left text-sm font-bold text-slate-950 disabled:opacity-55">
                  Ja – beide Änderungen vergleichen
                </button>
              </div>
              <p className="mt-3 text-xs font-medium leading-5">
                Beim Laden bleiben bisherige ungesendete Eingaben als „Konfliktkopie“ in der Klassenauswahl erhalten. Sie werden nicht automatisch ins Klassenteam übernommen.
              </p>
            </div>
          )}
          {guide.button && (
            <button type="button" onClick={onGuideAction} disabled={Boolean(busy)}
              className="min-h-11 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-black text-white disabled:opacity-55 sm:w-auto">
              {busy ? 'Wird geprüft …' : guide.button}
            </button>
          )}
        </div>
        <p className="mt-3 text-xs font-medium text-[var(--text2)]">
          Nach dem Einrichten laufen Änderungen automatisch im Hintergrund. Erst „Team synchronisiert“ bestätigt den gemeinsamen Stand. Bei gleichzeitigen Änderungen wird nichts ungefragt überschrieben.
        </p>
      </section>

      <details data-testid="team-two-teachers-help"
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
        <summary className="min-h-9 cursor-pointer text-sm font-semibold text-[var(--text)]">
          Wer macht was? Einfache Anleitung für zwei Lehrpersonen
        </summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[var(--text2)]">
          <li><strong>Lehrperson A</strong> öffnet ihre bestehende Klasse und wählt „Diese Klasse gemeinsam nutzen“.</li>
          <li><strong>Lehrperson B</strong> meldet sich auf ihrem Gerät mit der eigenen Schulmail an und öffnet „Klassenteam“. Keine zweite Klasse erstellen.</li>
          <li><strong>Lehrperson A</strong> wählt B in der automatisch aktualisierten Kollegiumsliste aus.</li>
          <li><strong>Lehrperson B</strong> öffnet die Einladung. Wenn KLASSIO eine Gerätefreigabe verlangt, bestätigt A den angezeigten Prüfcode.</li>
          <li>Beide öffnen <strong>dieselbe Teamklasse</strong>. Änderungen werden automatisch abgeglichen; bei Konflikten bleiben beide Stände geschützt.</li>
        </ol>
      </details>

      {deviceRequestsToApprove.length > 0 && <section className="rounded-2xl border border-[var(--accent)] bg-[var(--surface)] p-5 space-y-3" aria-label="Geräteanfragen im Klassenteam">
        <h2 className="font-black">Ein Teamgerät braucht deine Bestätigung</h2>
        {deviceRequestsToApprove.map(({ room, request }) => <div key={request.id} className="rounded-xl bg-[var(--surface2)] p-4">
          <p className="font-bold">{request.displayName} · {room.classLabel}</p>
          <p className="mt-1 text-sm">Möchte diese bestehende Teamklasse auf einem Gerät öffnen. Prüfcode: <strong>{request.verificationCode}</strong></p>
          <button type="button" disabled={Boolean(busy)} onClick={() => void approveDeviceAccess(room.id, request.id, request.displayName, request.verificationCode)} className="mt-3 rounded-xl bg-[var(--accent)] px-4 py-2 font-black text-white disabled:opacity-50">Gerät freigeben</button>
        </div>)}
      </section>}

      {activeSharedId && deviceAuthorization === 'unauthorized' && <section className="rounded-2xl border border-amber-400 bg-amber-50 p-5 text-slate-900" aria-label="Freigabe für dieses Gerät">
        <h2 className="font-black">Dieses Gerät braucht noch eine Freigabe</h2>
        {ownDeviceRequest ? <p className="mt-2 text-sm">Deine Anfrage ist gesendet. Bitte eine Teamlehrperson, im Klassenteam auf „Gerät freigeben“ zu klicken. Dein Prüfcode: <strong>{ownDeviceRequest.verificationCode}</strong></p>
          : <><p className="mt-2 text-sm">Bitte eine Teamlehrperson, die diese Klasse noch öffnen kann, dein Gerät zu bestätigen. Deine vorhandenen Einträge bleiben erhalten.</p>
            <button type="button" disabled={Boolean(busy)} onClick={() => void requestDeviceAccess()} className="mt-3 rounded-xl bg-[var(--accent)] px-4 py-2 font-black text-white disabled:opacity-50">Freigabe anfordern</button></>}
      </section>}

      <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-black text-[var(--text)]">Aktuelle Klasse: {activeRoom?.name || 'Keine Klasse'}</h2>
            <ClassTeamStatus />
            {activeRoom?.teamTeaching ? (
              <div className="mt-2 space-y-2" data-testid="team-simple-working-status" aria-live="polite">
                <p className="text-sm font-semibold text-[var(--text)]">{teacherClassWorkingStatus(nextAction)}</p>
                <p className="text-sm text-[var(--text2)]">{teacherClassPermission(activeRoom.teamTeaching.role)}</p>
                <p className="text-xs text-[var(--text2)]">
                  Letzter bestätigter Team-Abgleich: {formatTeamDate(activeRoom.teamTeaching.lastSyncedAt)}
                </p>
                <details data-testid="team-technical-details" className="rounded-xl border border-[var(--border)] bg-[var(--surface2)] p-3">
                  <summary className="min-h-7 cursor-pointer text-xs font-semibold text-[var(--text2)]">
                    Technische Informationen bei Problemen
                  </summary>
                  <div className="mt-3 space-y-1 text-xs text-[var(--text2)]">
                    <p className="font-semibold text-[var(--text)]">Gemeinsamer Teamstand: Version {activeSummary?.revision ?? 'wird geprüft'}</p>
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
                </details>
              </div>
            ) : (
              <p className="mt-1 text-sm text-[var(--text2)]">Noch nicht für gemeinsame Bearbeitung freigegeben.</p>
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
              <button onClick={() => void synchronizeTeamSimply()} disabled={Boolean(busy)} data-testid="team-simple-sync" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-black text-white disabled:opacity-50"><RefreshCw size={16}/> {busy === 'smart-sync' ? 'Prüfe Teamstand …' : 'Jetzt synchronisieren'}</button>
              <details className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm"><summary className="cursor-pointer font-semibold">Weitere Möglichkeiten bei Problemen</summary><div className="mt-3 flex flex-wrap gap-2">
              <button onClick={showLatestChanges} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold disabled:opacity-50">Änderungen vergleichen</button>
              {activeRoom.teamTeaching.role !== 'viewer' && <button onClick={() => void prepareSafeMerge()} disabled={Boolean(busy) || !activeRoom.teamTeaching.lastSyncedHash} className="inline-flex items-center gap-2 rounded-xl border border-indigo-400 px-3 py-2 text-sm font-bold disabled:opacity-50">Änderungen zusammenführen</button>}
              <button onClick={() => void showHistory()} disabled={Boolean(busy) || historyBusy} aria-expanded={historyVisible} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold disabled:opacity-50">{historyVisible ? 'Versionsgeschichte schließen' : 'Versionsgeschichte'}</button>
              <button onClick={pull} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold"><Download size={16}/> Neueste Version laden</button>
              {activeRoom.teamTeaching.role !== 'viewer' && <button onClick={push} disabled={Boolean(busy) || activeRoom.teamTeaching.syncStatus === 'conflict' || !activeRoom.teamTeaching.lastSyncedHash} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold disabled:opacity-50"><Upload size={16}/> Änderungen senden</button>}
              </div></details>
            </div>
          )}
        </div>
      </section>

      {activeSharedId && mergePreview && (
        <section aria-label="Sicheres Zusammenführen" className="rounded-[1.75rem] border border-indigo-400 bg-[var(--surface)] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-black">Änderungen sicher zusammenführen</h2><button type="button" onClick={() => setMergePreview(null)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-bold">Schließen</button></div>
          <p className="text-sm text-[var(--text2)]">Dein Stand: Version {mergePreview.localRevision} · aktueller Teamstand: Version {mergePreview.remoteRevision}. Verschiedene bearbeitete Felder werden kombiniert. Wo beide dasselbe Feld geändert haben, entscheidest du ausdrücklich.</p>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {mergePreview.changes.map((change, index) => (
              <div key={index} className="rounded-xl border border-[var(--border)] p-3 text-xs">
                <p className="font-bold text-sm break-words">{change.path}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2"><p className="break-words rounded-lg bg-blue-500/5 p-2"><strong className="block">Dein Gerät</strong>{change.before}</p><p className="break-words rounded-lg bg-emerald-500/5 p-2"><strong className="block">Gemeinsamer Stand</strong>{change.after}</p></div>
              </div>
            ))}
          </div>
          {mergePreview.conflicts.length > 0 && <div className="space-y-2 rounded-xl border border-amber-400 bg-amber-50 p-3 text-amber-950">
            <p className="text-sm font-black">{mergePreview.conflicts.length} gleichzeitig bearbeitete Felder brauchen eine Entscheidung.</p>
            {mergePreview.conflicts.map(location => <label key={location} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="min-w-0 break-words font-semibold">{location}</span>
              <select aria-label={'Fassung wählen für ' + location} value={mergeDecisions[location] || ''}
                onChange={event => setMergeDecisions(prev => ({ ...prev, [location]: event.target.value as 'local' | 'team' }))}
                className="min-h-11 rounded-lg border border-amber-500 bg-white px-2 text-amber-950">
                <option value="">Fassung wählen …</option><option value="local">Meine Fassung</option><option value="team">Fassung im Team</option>
              </select>
            </label>)}
          </div>}
          <button type="button" onClick={() => void confirmSafeMerge()}
            disabled={Boolean(busy) || mergePreview.conflicts.some(location => !mergeDecisions[location])}
            className="min-h-11 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">Geprüfte Änderungen gemeinsam speichern</button>
          <p className="text-xs text-[var(--text2)]">Falls sich die Teamklasse zwischen Vorschau und Speichern erneut ändert, wird das Speichern abgebrochen. Dein lokaler Stand bleibt erhalten.</p>
        </section>
      )}

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
            <div id="team-teacher-invite" className="scroll-mt-24 border-t border-[var(--border)] pt-4">
              <h3 className="text-sm font-black">Kolleg:in hinzufügen</h3>
              {available.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--text2)]">Noch keine andere Lehrperson mit registriertem Gerät gefunden. Bitte die Kollegin oder den Kollegen KLASSIO mit der eigenen Schulmail öffnen und „Klassenteam“ aufrufen lassen. Die Liste aktualisiert sich automatisch.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  <label htmlFor="team-teacher-search" className="block text-xs font-bold text-[var(--text2)]">
                    Lehrperson suchen
                  </label>
                  <input id="team-teacher-search" type="search" value={colleagueQuery}
                    onChange={event => setColleagueQuery(event.target.value)}
                    placeholder="Name oder Kürzel eingeben"
                    className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
                  />
                  {searchedColleagues.length === 0 && (
                    <p className="text-sm text-[var(--text2)]">Noch keine passende Lehrperson. Namen prüfen oder die Kollegin bzw. den Kollegen KLASSIO mit der eigenen Schulmail öffnen lassen; die Liste aktualisiert sich automatisch.</p>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2">
                  {searchedColleagues.map(colleague => (
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
                            : 'Im Kollegium, aber noch kein Gerät registriert · bitte einmal „Klassenteam“ öffnen'}
                        </span>
                      </span>
                      <UserPlus size={17} />
                    </button>
                  ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSummary.myRole === 'owner' && (
            <div className="border-t border-[var(--border)] pt-4">
              {activeSummary.members.length > 1 && <p className="text-xs font-semibold text-amber-700">Solange weitere Lehrpersonen zur Teamklasse gehören, darf die gemeinsame Klasse nicht gelöscht werden.</p>}
              <button onClick={stopSharing} disabled={Boolean(busy) || activeSummary.members.length > 1} className="text-sm font-bold text-rose-600 disabled:cursor-not-allowed disabled:opacity-40">Teamteaching für diese Klasse beenden</button>
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
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => void adopt(summary)} disabled={Boolean(busy)} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-black text-white">Auf diesem Gerät öffnen</button>
                  <button onClick={() => void requestDeviceAccess(summary.id)} disabled={Boolean(busy)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-bold">Freigabe anfordern</button>
                </div>
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

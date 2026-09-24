import { assertRestorableAppState } from '../lib/backupRestore';
import { initialAppState, syncActiveClass, normalizeAppState, switchClassState } from '../lib/appState';
import { hasEstablishedClassroom, hasUnexpectedClassDisappearance, shouldRestoreEstablishedCloudClassroom } from '../lib/appStateContinuity';
import { removeStudentFromAppState } from '../lib/studentState';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import localforage from 'localforage';
import { AppState, Student } from '../types';
import { DEFAULT_TAGEPLAN, FAECHER_ALLE, STUNDEN_INFO, DEFAULT_YEARLY_SUBJECTS, DEFAULT_FACH_COLORS } from '../constants';
import { getKW, getCurrentSchuljahr } from '../lib/utils';
import { toLocalDateKey } from '../lib/localDate';
import { notenSyncService } from '../lib/NotenSyncService';
import {
  encryptSyncState,
  decryptSyncState,
  parseSyncHash,
  importSessionKey,
  cleanSyncUrlFromHistory,
  getActiveSessionKey,
  getActiveSyncWriteToken,
  deriveSyncWriteToken,
  setActiveSessionKey,
  setActiveSyncWriteToken,
  clearActiveSessionKey,
} from '../lib/syncService';
import {
  saveEncryptedAppState,
  restoreEncryptedAppState,
  loadEncryptedAppState,
  saveEncryptedEmergencyBackup,
  saveEncryptedSessionBackup,
  hasLegacyPlaintextData,
} from '../lib/secureStorageService';
import {
  getActiveVaultKey,
  clearActiveVaultSession,
  hasVault,
  loadVaultRecord,
  subscribeVaultSession,
} from '../lib/vaultStorage';
import {
  ACCOUNT_SESSION_CHANGED_EVENT,
  accountSyncErrorMessage,
  appStateFingerprint,
  isLatestAccountSnapshotConfirmed,
  decryptAccountSyncSnapshot,
  fetchAccountSyncSnapshot,
  hasEmailAccountSession,
  loadAccountSyncMetadata,
  mergeAccountSyncState,
  hasSharedClassAccountDrift,
  pushAccountSyncSnapshot,
  saveAccountSyncMetadata,
  setAccountSyncHealthy,
  type AccountSyncStatus,
} from '../lib/accountSyncService';
import { registerActiveAppStateGetter } from '../services/aiService';
import { ensureRegisteredTeamTeachingDevice, pullSharedClass, pushSharedClass } from '../lib/teamTeachingService';
import { classRoomFingerprint } from '../lib/teamTeachingCrypto';
import { normalizeSchulart } from '../lib/schularten';

localforage.config({
  name: 'LehrerApp',
  storeName: 'app_state'
});

interface AppContextType {

  app: AppState;
  setApp: React.Dispatch<React.SetStateAction<AppState>>;
  updateApp: (changes: Partial<AppState>) => void;
  saveApp: () => void;
  restoreAppData: (data: unknown) => Promise<void>;
  updateStudent: (student: Student) => void;
  deleteStudent: (id: string) => void;
  setPage: (page: string) => void;
  switchClass: (id: string) => void;
  addClass: (name: string, stufe: number, isKV: boolean) => void;
  removeClass: (id: string) => void;
  deleteClass: (id?: string) => void;
  notenUpdateTrigger: number;
  triggerGradebookUpdate: () => void;
  calculateWidgetFontSize: (scale: number) => string;
  screenLocked: boolean;
  setScreenLocked: (locked: boolean) => void;
  isVaultUnlocked: boolean;
  isAppHydrated: boolean;
  lockAppVault: () => void;
  unlockAppVault: (key: CryptoKey, allowFreshSetup?: boolean) => Promise<boolean>;
  accountSyncStatus: AccountSyncStatus;
  accountSyncLastAt: string | null;
  accountSyncMessage: string | null;
  accountSyncConflictResolvable: boolean;
  retryAccountSync: () => Promise<void>;
  resolveAccountSyncConflict: (source: 'local' | 'remote') => Promise<void>;
}

const STORAGE_KEY = 'hehle_v3';

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [app, setAppInternal] = useState<AppState>(initialAppState);
  const currentAppRef = useRef<AppState>(app);
  currentAppRef.current = app;
  const restoringRef = useRef(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const teamSyncBusyRef = useRef(false);
  const locallySavedStateRef = useRef<AppState | null>(null);
  const localSaveBusyRef = useRef(0);
  const cloudConfirmedStateRef = useRef<AppState | null>(null);

  const setApp = React.useCallback((val: React.SetStateAction<AppState>) => {
    if (restoringRef.current) return;
    // Immediately invalidate the cloud-ready badge, before the debounced write starts.
    locallySavedStateRef.current = null;
    cloudConfirmedStateRef.current = null;
    setAccountSyncHealthy(false);
    setAccountSyncStatus(previous => previous === 'conflict' || previous === 'error' || previous === 'disabled'
      ? previous : 'saving-local');
    setAppInternal(prev => {
      const nextRaw = typeof val === 'function' ? (val as any)(prev) : val;
      const synced = syncActiveClass(nextRaw);
      currentAppRef.current = synced;
      return synced;
    });
  }, []);

  const [isLoaded, setIsLoaded] = useState(false);
  const [screenLocked, setScreenLocked] = useState(false);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState<boolean>(() => getActiveVaultKey() !== null);
  // A RAM key or a successful HTTP login is NOT proof that encrypted
  // classroom data was decrypted and the account reconcile has completed.
  const [isAppHydrated, setIsAppHydrated] = useState(false);
  const [accountSyncStatus, setAccountSyncStatus] = useState<AccountSyncStatus>('idle');
  const [accountSyncLastAt, setAccountSyncLastAt] = useState<string | null>(null);
  const [accountSyncMessage, setAccountSyncMessage] = useState<string | null>(null);
  const accountSyncStatusRef = useRef<AccountSyncStatus>(accountSyncStatus);
  accountSyncStatusRef.current = accountSyncStatus;
  const [accountSyncConflictResolvable, setAccountSyncConflictResolvable] = useState(false);
  const accountSyncReadyRef = useRef(false);
  const accountSyncBusyRef = useRef(false);
  const accountSyncRevisionRef = useRef(0);

  const markAccountSynced = React.useCallback((snapshot: any, state: AppState) => {
    // The server may confirm an earlier generation while the teacher continues typing.
    // Keep that revision as a conflict-safe baseline, but never display stale green.
    saveAccountSyncMetadata(snapshot, state);
    accountSyncRevisionRef.current = snapshot.revision;
    accountSyncReadyRef.current = true;
    setAccountSyncLastAt(snapshot.updatedAt || new Date().toISOString());
    setAccountSyncConflictResolvable(false);
    const latest = currentAppRef.current;
    const latestOnDisk = locallySavedStateRef.current === latest;
    if (isLatestAccountSnapshotConfirmed(latest, locallySavedStateRef.current, state)) {
      cloudConfirmedStateRef.current = latest;
      setAccountSyncHealthy(true);
      setAccountSyncMessage(null);
      setAccountSyncStatus('synced');
    } else {
      cloudConfirmedStateRef.current = null;
      setAccountSyncHealthy(false);
      setAccountSyncStatus(previous => previous === 'local-error' ? previous
        : latestOnDisk ? 'saved-local' : 'saving-local');
    }
  }, []);

  const reconcileAccountState = React.useCallback(async (
    localState: AppState | null,
    vaultKey: CryptoKey,
    hadLocalState: boolean,
    isStillCurrent?: () => boolean,
    allowFreshSetup = false,
  ): Promise<AppState> => {
    // Einen wirklich neuen Tresor nicht vorschnell durch die Legacy-/Klassenmigration
    // schicken: Der bestehende First-Run muss weiterhin mit leerer Klasse starten.
    const current = localState ? normalizeAppState(localState) : initialAppState;
    const vaultRecord = await loadVaultRecord();
    if (!vaultRecord) {
      accountSyncReadyRef.current = false;
      setAccountSyncStatus('idle');
      return current;
    }

    setAccountSyncStatus('syncing');
    setAccountSyncMessage(null);
    setAccountSyncConflictResolvable(false);
    try {
      const hasAccount = await hasEmailAccountSession();
      if (!hasAccount) {
        accountSyncReadyRef.current = false;
        setAccountSyncHealthy(false);
        setAccountSyncStatus('disabled');
        // An access-code login is not an authenticated e-mail account. If the
        // browser lost its local state, NEVER open a fabricated empty class
        // while the teacher's encrypted original may still exist in e-mail sync.
        if (!allowFreshSetup && (!hadLocalState || !hasEstablishedClassroom(current))) {
          throw Object.assign(new Error(
            'Auf diesem Gerät wurde kein bisheriger Klassenstand gefunden und die E-Mail-Synchronisierung ist nicht angemeldet. Bitte mit derselben E-Mail-Adresse wie zuvor anmelden; keinen neuen Tresor oder Klasse erstellen.'
          ), { code: 'EMPTY_STATE_BLOCKED' });
        }
        setAccountSyncMessage(null);
        return current;
      }

      const remote = await fetchAccountSyncSnapshot();
      if (isStillCurrent && !isStillCurrent()) return currentAppRef.current;

      if (!remote) {
        // An existing vault whose former account snapshot is unavailable must
        // never silently recreate and upload a new empty account after logout.
        // Only the explicitly confirmed first-run vault setup may initialize
        // a genuinely new account with no class yet.
        const previousReceipt = loadAccountSyncMetadata(vaultRecord.id);
        if (previousReceipt?.revision && hadLocalState && hasEstablishedClassroom(current)) {
          // Restore access to the intact local class for emergency export, but
          // never recreate a vanished cloud snapshot or claim cloud sync is safe.
          accountSyncReadyRef.current = false;
          setAccountSyncHealthy(false);
          setAccountSyncMessage('Deine bisherigen lokalen Klassen sind noch vorhanden, aber der frühere E-Mail-Kontostand ist nicht auffindbar. KLASSIO hat nichts zum Server hochgeladen. Bitte JETZT ein verschlüsseltes Backup erstellen und die E-Mail-Konto-Zuordnung prüfen.');
          setAccountSyncStatus('error');
          return current;
        }
        if (previousReceipt?.revision || (!hadLocalState && !allowFreshSetup)
          || (!hasEstablishedClassroom(current) && !allowFreshSetup)) {
          throw Object.assign(new Error(
            'Der bisherige verschlüsselte Konto-Datenstand ist nicht erreichbar. Zur Sicherheit wurde kein leerer Ersatzstand erzeugt oder hochgeladen. Bitte denselben E-Mail-Zugang prüfen und einen vorhandenen Datenstand bzw. ein Backup sichern.'
          ), { code: 'EMPTY_STATE_BLOCKED' });
        }
        const created = await pushAccountSyncSnapshot(current, vaultKey, vaultRecord, 0);
        markAccountSynced(created, current);
        return current;
      }

      if (remote.vaultRecord.id !== vaultRecord.id) {
        // Never open class setup when a locally empty browser points at an
        // existing email account with a different encrypted vault.
        if (!hasEstablishedClassroom(current)) {
          throw Object.assign(new Error(
            'Das E-Mail-Konto enthält einen anderen Datentresor. Zur Sicherheit zeigt KLASSIO keine leere Ersteinrichtung an. Bitte Konto und Tresor prüfen.'
          ), { code: 'EMPTY_STATE_BLOCKED' });
        }
        accountSyncReadyRef.current = false;
        setAccountSyncHealthy(false);
        setAccountSyncMessage('Das E-Mail-Konto enthält einen anderen Datentresor. Zur Sicherheit wurde nichts überschrieben. Prüfe Konto und Tresor, bevor du weiter synchronisierst.');
        setAccountSyncStatus('conflict');
        console.warn('[AccountSync] Remote-Tresor stimmt nicht mit dem lokalen Tresor überein. Kein Stand wurde überschrieben.');
        return current;
      }

      const decryptedRemote = await decryptAccountSyncSnapshot(remote, vaultKey);
      assertRestorableAppState(decryptedRemote);
      const normalizedRemoteState = normalizeAppState(decryptedRemote);
      if (isStillCurrent && !isStillCurrent()) return currentAppRef.current;
      // Der Server-Baseline-Fingerprint muss exakt dem State entsprechen, den setApp
      // anschließend im UI hält. Sonst kann ein frisch wiederhergestelltes Gerät allein
      // durch die lokale Klassen-Normalisierung eine unnötige neue Serverrevision erzeugen.
      // A personal-account copy can lag behind the independently encrypted
      // shared class. Never adopt that stale copy as the newest team week plan.
      if (hasSharedClassAccountDrift(normalizedRemoteState, current)) {
        const ownAccountBaseline = loadAccountSyncMetadata(vaultRecord.id);
        if (ownAccountBaseline && remote.revision === ownAccountBaseline.revision) {
          // Only this device has changed since the last personal-account
          // receipt. Re-upload the full current state (including the freshly
          // received shared week plan), guarded by the server revision. This
          // prevents a permanent account conflict after every teammate edit.
          // If the account server advanced meanwhile, the existing CAS guard
          // refuses the upload rather than destroying either teacher's work.
          const pushed = await pushAccountSyncSnapshot(current, vaultKey, vaultRecord, remote.revision);
          markAccountSynced(pushed, current);
          return current;
        }
        accountSyncReadyRef.current = false;
        setAccountSyncHealthy(false);
        setAccountSyncMessage('Der E-Mail-Kontostand enthält eine ältere oder abweichende Kopie deiner Teamklasse. Deine lokale Teamplanung bleibt erhalten. Im Konto-Abgleich kannst du den aktuellen Teamstand mit den übrigen Kontodaten bewusst zusammenführen.');
        setAccountSyncConflictResolvable(true);
        setAccountSyncStatus('conflict');
        return current;
      }
      const remoteState = syncActiveClass(mergeAccountSyncState(normalizedRemoteState, current));
      // A fabricated "4. Klasse Meine Klasse" with no pupils or lessons is
      // not a successfully restored existing account. Refuse to open an empty
      // replacement even when a previous buggy client uploaded that placeholder.
      if (!allowFreshSetup && !hasEstablishedClassroom(current) && !hasEstablishedClassroom(remoteState)) {
        throw Object.assign(new Error(
          'Der vorhandene Tresor enthält derzeit weder lokal noch im E-Mail-Konto eine wiederherstellbare Klasse. KLASSIO zeigt deshalb keine erfundene leere Klasse an und speichert nichts darüber. Bitte Backup oder Konto-Zuordnung prüfen.'
        ), { code: 'EMPTY_STATE_BLOCKED' });
      }
      if (hasEstablishedClassroom(current) && !hasEstablishedClassroom(remoteState)) {
        accountSyncReadyRef.current = false;
        setAccountSyncHealthy(false);
        setAccountSyncMessage('Der Server liefert einen leeren oder unvollständigen Klassenstand. Deine lokalen Daten bleiben erhalten und werden nicht automatisch ersetzt. Bitte zuerst ein verschlüsseltes Backup erstellen.');
        setAccountSyncConflictResolvable(false);
        setAccountSyncStatus('conflict');
        return current;
      }
      // A previously-used mobile browser may contain an encrypted but empty
      // placeholder with no sync baseline. When the SAME vault has successfully
      // decrypted a populated account snapshot, restore the real classroom
      // instead of showing the first-run wizard or treating the placeholder as
      // a competing classroom. Existing real local classes still take the
      // normal conflict-safe reconciliation path below.
      if (shouldRestoreEstablishedCloudClassroom(current, remoteState)) {
        if (isStillCurrent && !isStillCurrent()) return currentAppRef.current;
        // Initial unlock has no editable UI; background refresh persists the
        // adopted generation using the standard guarded autosave pipeline.
        if (!isStillCurrent) await saveEncryptedAppState(remoteState, vaultKey);
        if (isStillCurrent && !isStillCurrent()) return currentAppRef.current;
        markAccountSynced(remote, remoteState);
        return remoteState;
      }
      const localFingerprint = appStateFingerprint(current);
      const remoteFingerprint = appStateFingerprint(remoteState);
      const baseline = loadAccountSyncMetadata(vaultRecord.id);

      if (!hadLocalState) {
        await saveEncryptedAppState(remoteState, vaultKey);
        markAccountSynced(remote, remoteState);
        return remoteState;
      }

      if (!baseline) {
        if (localFingerprint === remoteFingerprint) {
          markAccountSynced(remote, current);
          return current;
        }
        accountSyncReadyRef.current = false;
        setAccountSyncHealthy(false);
        setAccountSyncMessage('Auf diesem Gerät und im E-Mail-Konto liegen unterschiedliche Ausgangsstände. Nichts wurde automatisch überschrieben. Wähle bewusst, welcher Stand weitergeführt werden soll.');
        setAccountSyncConflictResolvable(true);
        setAccountSyncStatus('conflict');
        console.warn('[AccountSync] Lokaler und serverseitiger Erststand unterscheiden sich. Automatisches Überschreiben wurde verhindert.');
        return current;
      }

      if (remote.revision > baseline.revision) {
        if (localFingerprint === baseline.fingerprint) {
          // A plausible non-empty but WRONG remote class is still data loss:
          // never silently replace 1a with an unrelated 4th grade merely because
          // the server has a newer revision. Require explicit conflict handling.
          if (hasUnexpectedClassDisappearance(current, remoteState)) {
            accountSyncReadyRef.current = false;
            setAccountSyncHealthy(false);
            setAccountSyncMessage('Der neuere E-Mail-Kontostand enthält nicht mehr alle bisher vorhandenen Klassen. KLASSIO behält die lokalen Klassen und hat nichts automatisch überschrieben. Bitte vor der bewussten Konfliktauflösung eine verschlüsselte Sicherung erstellen und frühere Kontostände prüfen.');
            setAccountSyncConflictResolvable(true);
            setAccountSyncStatus('conflict');
            return current;
          }
          // During background refresh, a teacher may type while the async
          // IndexedDB write is in flight. Never write the remote snapshot over
          // such a newer edit: the guarded caller adopts it in RAM first and
          // the ordinary latest-generation autosave persists it afterwards.
          // Initial vault unlock has no editable UI yet and may persist here.
          if (!isStillCurrent) await saveEncryptedAppState(remoteState, vaultKey);
          if (isStillCurrent && !isStillCurrent()) return currentAppRef.current;
          markAccountSynced(remote, remoteState);
          return remoteState;
        }
        if (localFingerprint === remoteFingerprint) {
          markAccountSynced(remote, current);
          return current;
        }
        accountSyncReadyRef.current = false;
        setAccountSyncHealthy(false);
        setAccountSyncMessage('Auf mehreren Geräten wurden Änderungen erkannt. Zur Sicherheit wurde nichts überschrieben. Wähle bewusst den vollständigen Stand, mit dem du weiterarbeiten möchtest.');
        setAccountSyncConflictResolvable(true);
        setAccountSyncStatus('conflict');
        console.warn('[AccountSync] Änderungen auf mehreren Geräten erkannt. Kein Stand wurde überschrieben.');
        return current;
      }

      if (remote.revision === baseline.revision) {
        if (localFingerprint === baseline.fingerprint) {
          markAccountSynced(remote, current);
          return current;
        }
        const pushed = await pushAccountSyncSnapshot(current, vaultKey, vaultRecord, remote.revision);
        markAccountSynced(pushed, current);
        return current;
      }

      // Ein lokaler Baseline-Stand darf niemals weiter sein als der Server. Fail closed.
      accountSyncReadyRef.current = false;
      setAccountSyncHealthy(false);
      setAccountSyncMessage('Der Server meldet einen älteren Stand als dieses Gerät bereits kennt. Klassio hat deshalb nichts überschrieben. Bitte den Konto-Abgleich erneut versuchen.');
      setAccountSyncStatus('error');
      console.warn('[AccountSync] Serverrevision ist älter als der lokal bekannte Sync-Stand.');
      return current;
    } catch (error: any) {
      accountSyncReadyRef.current = false;
      if (error?.code === 'EMPTY_STATE_BLOCKED') {
        setAccountSyncHealthy(false);
        setAccountSyncMessage(error.message);
        setAccountSyncStatus('error');
        throw error;
      }
      if (error?.status === 401 || error?.status === 403) {
        setAccountSyncHealthy(false);
        setAccountSyncMessage('Die E-Mail-Anmeldung ist nicht mehr aktiv. Melde dich erneut an, damit der verschlüsselte Konto-Abgleich weiterläuft.');
        setAccountSyncStatus('disabled');
        if (!hadLocalState || (!allowFreshSetup && !hasEstablishedClassroom(current))) throw error;
        return current;
      }
      setAccountSyncHealthy(false);
      setAccountSyncMessage(accountSyncErrorMessage(error));
      setAccountSyncConflictResolvable(Boolean(
        (error?.status === 409 || error?.code === 'REVISION_CONFLICT')
        && error?.code !== 'VAULT_MISMATCH'
      ));
      setAccountSyncStatus(error?.code === 'REVISION_CONFLICT' || error?.code === 'VAULT_MISMATCH' ? 'conflict' : 'error');
      console.error('[AccountSync] Kontostand konnte nicht abgeglichen werden:', error);
      // A transient network, decryption or account error is NOT permission to
      // unlock an existing vault into an unconfigured replacement classroom.
      if (!hadLocalState || (!allowFreshSetup && !hasEstablishedClassroom(current))) throw error;
      return current;
    }
  }, [markAccountSynced]);

  const pushAccountStateIfReady = React.useCallback(async (state: AppState, vaultKey: CryptoKey) => {
    if (!accountSyncReadyRef.current || accountSyncBusyRef.current) return;
    // Lock before the first await: simultaneous autosave + pagehide must not start
    // two PUTs with the same revision and manufacture a conflict on one device.
    accountSyncBusyRef.current = true;
    try {
      const vaultRecord = await loadVaultRecord();
      if (!vaultRecord || getActiveVaultKey() !== vaultKey) return;
      if (currentAppRef.current !== state || locallySavedStateRef.current !== state) return;

      const baseline = loadAccountSyncMetadata(vaultRecord.id);
      const expectedRevision = accountSyncRevisionRef.current || baseline?.revision || 0;
      if (baseline && appStateFingerprint(state) === baseline.fingerprint
        && expectedRevision === baseline.revision) {
        cloudConfirmedStateRef.current = state;
        setAccountSyncHealthy(true);
        setAccountSyncLastAt(baseline.updatedAt);
        setAccountSyncStatus('synced');
        return;
      }

      setAccountSyncStatus('syncing');
      const snapshot = await pushAccountSyncSnapshot(state, vaultKey, vaultRecord, expectedRevision);
      markAccountSynced(snapshot, state);
    } catch (error: any) {
      if (error?.status === 401 || error?.status === 403) {
        accountSyncReadyRef.current = false;
        setAccountSyncHealthy(false);
        setAccountSyncMessage('Die E-Mail-Anmeldung ist nicht mehr aktiv. Melde dich erneut an, damit der verschlüsselte Konto-Abgleich weiterläuft.');
        setAccountSyncStatus('disabled');
      } else if (error?.status === 409 || error?.code === 'REVISION_CONFLICT' || error?.code === 'VAULT_MISMATCH') {
        accountSyncReadyRef.current = false;
        setAccountSyncHealthy(false);
        setAccountSyncMessage(accountSyncErrorMessage(error));
        setAccountSyncConflictResolvable(error?.code !== 'VAULT_MISMATCH');
        setAccountSyncStatus('conflict');
      } else {
        setAccountSyncHealthy(false);
        setAccountSyncMessage(accountSyncErrorMessage(error));
        setAccountSyncStatus('error');
      }
      console.error('[AccountSync] Automatisches Speichern auf dem Server fehlgeschlagen:', error);
    } finally {
      accountSyncBusyRef.current = false;
    }
  }, [markAccountSynced]);

  const refreshAccountState = React.useCallback(async () => {
    if (!isVaultUnlocked || restoringRef.current || accountSyncBusyRef.current
      || localSaveBusyRef.current > 0 || locallySavedStateRef.current !== currentAppRef.current) return;
    const vaultKey = getActiveVaultKey();
    if (!vaultKey) return;

    // Periodic account refresh only makes sense for an authenticated email
    // session. Newly created local-only vaults must not be treated as lost
    // cloud accounts before the teacher has even finished the class setup.
    if (!await hasEmailAccountSession()) return;
    // The teacher may lock the vault or switch account during the async check.
    if (getActiveVaultKey() !== vaultKey || restoringRef.current) return;

    accountSyncBusyRef.current = true;
    try {
      const before = currentAppRef.current;
      const reconciled = await reconcileAccountState(before, vaultKey, true,
        () => currentAppRef.current === before);
      // A teacher may have typed while the network response was in flight.
      // A stale remote response must NEVER replace those new edits.
      if (currentAppRef.current === before
        && appStateFingerprint(reconciled) !== appStateFingerprint(before)) {
        setApp(reconciled);
      }
    } catch (error) {
      console.error('[AccountSync] Hintergrundabgleich fehlgeschlagen:', error);
    } finally {
      accountSyncBusyRef.current = false;
    }
  }, [isVaultUnlocked, reconcileAccountState, setApp]);

  const retryAccountSync = React.useCallback(async () => {
    setAccountSyncMessage(null);
    await refreshAccountState();
  }, [refreshAccountState]);

  const resolveAccountSyncConflict = React.useCallback(async (source: 'local' | 'remote') => {
    if (!isVaultUnlocked || accountSyncBusyRef.current) return;
    const vaultKey = getActiveVaultKey();
    const vaultRecord = await loadVaultRecord();
    if (!vaultKey || !vaultRecord) return;

    accountSyncBusyRef.current = true;
    setAccountSyncStatus('syncing');
    setAccountSyncMessage(null);
    setAccountSyncConflictResolvable(false);

    try {
      const hasAccount = await hasEmailAccountSession();
      if (!hasAccount) {
        accountSyncReadyRef.current = false;
        setAccountSyncHealthy(false);
        setAccountSyncMessage('Die E-Mail-Anmeldung ist nicht mehr aktiv. Melde dich erneut an, bevor du einen Sync-Konflikt auflöst.');
        setAccountSyncStatus('disabled');
        return;
      }

      const remote = await fetchAccountSyncSnapshot();
      const localState = currentAppRef.current;

      // Vor einer bewussten Konfliktentscheidung bleibt der aktuelle lokale Stand
      // als verschlüsselte Notfallkopie auf diesem Gerät erhalten.
      await saveEncryptedEmergencyBackup(localState, vaultKey);

      if (!remote) {
        const pushed = await pushAccountSyncSnapshot(localState, vaultKey, vaultRecord, 0);
        markAccountSynced(pushed, localState);
        return;
      }

      if (remote.vaultRecord.id !== vaultRecord.id) {
        accountSyncReadyRef.current = false;
        setAccountSyncHealthy(false);
        setAccountSyncMessage('Das E-Mail-Konto enthält einen anderen Datentresor. Dieser Konflikt kann nicht durch Überschreiben gelöst werden. Prüfe Konto und Tresor.');
        setAccountSyncConflictResolvable(false);
        setAccountSyncStatus('conflict');
        return;
      }

      if (source === 'local') {
        const pushed = await pushAccountSyncSnapshot(localState, vaultKey, vaultRecord, remote.revision);
        markAccountSynced(pushed, localState);
        return;
      }

      const decryptedRemote = await decryptAccountSyncSnapshot(remote, vaultKey);
      assertRestorableAppState(decryptedRemote);
      const normalizedRemote = normalizeAppState(decryptedRemote);
      const sharedClassDrift = hasSharedClassAccountDrift(normalizedRemote, localState);
      const remoteState = syncActiveClass(mergeAccountSyncState(normalizedRemote, localState));
      // An explicit 'Konto-Stand laden' must NEVER silently reintroduce an older
      // team class, nor claim a cloud receipt for content the server never got.
      // Save the merged personal-account + authoritative local team snapshot
      // with the latest server revision before announcing successful sync.
      if (sharedClassDrift) {
        const pushed = await pushAccountSyncSnapshot(remoteState, vaultKey, vaultRecord, remote.revision);
        await saveEncryptedAppState(remoteState, vaultKey);
        currentAppRef.current = remoteState;
        setApp(remoteState);
        markAccountSynced(pushed, remoteState);
      } else {
        await saveEncryptedAppState(remoteState, vaultKey);
        currentAppRef.current = remoteState;
        setApp(remoteState);
        markAccountSynced(remote, remoteState);
      }
    } catch (error: any) {
      accountSyncReadyRef.current = false;
      setAccountSyncHealthy(false);
      if (error?.status === 401 || error?.status === 403) {
        setAccountSyncMessage('Die E-Mail-Anmeldung ist nicht mehr aktiv. Melde dich erneut an, damit der verschlüsselte Konto-Abgleich weiterläuft.');
        setAccountSyncStatus('disabled');
        return;
      }
      setAccountSyncMessage(accountSyncErrorMessage(error));
      const resolvable = Boolean(
        (error?.status === 409 || error?.code === 'REVISION_CONFLICT')
        && error?.code !== 'VAULT_MISMATCH'
      );
      setAccountSyncConflictResolvable(resolvable);
      setAccountSyncStatus(resolvable || error?.code === 'VAULT_MISMATCH' ? 'conflict' : 'error');
      console.error('[AccountSync] Sync-Konflikt konnte nicht aufgelöst werden:', error);
    } finally {
      accountSyncBusyRef.current = false;
    }
  }, [isVaultUnlocked, markAccountSynced, setApp]);


  // E-Mail-Konto wird auch dann aktiv, wenn die Anmeldung erst in den Einstellungen erfolgt.
  // Sichtbare/aktive Geräte gleichen zusätzlich regelmäßig den verschlüsselten Serverstand ab.
  useEffect(() => {
    if (!isLoaded || !isVaultUnlocked) return;

    const refresh = () => { void refreshAccountState(); };
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 15_000);

    window.addEventListener(ACCOUNT_SESSION_CHANGED_EVENT, refresh);
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refreshIfVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener(ACCOUNT_SESSION_CHANGED_EVENT, refresh);
      window.removeEventListener('online', refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [isLoaded, isVaultUnlocked, refreshAccountState]);

  // Retry an already encrypted/local-durable generation if it could not be pushed
  // while another upload was in flight. Never push data before local durability.
  useEffect(() => {
    if (!isLoaded || !isVaultUnlocked) return;
    const interval = window.setInterval(() => {
      const latest = currentAppRef.current;
      const key = getActiveVaultKey();
      if (!key || restoringRef.current || accountSyncBusyRef.current
        || !accountSyncReadyRef.current || locallySavedStateRef.current !== latest
        || cloudConfirmedStateRef.current === latest || !navigator.onLine) return;
      void pushAccountStateIfReady(latest, key).catch(error => {
        setAccountSyncHealthy(false);
        setAccountSyncMessage(accountSyncErrorMessage(error));
        setAccountSyncStatus('error');
      });
    }, 3_000);
    return () => window.clearInterval(interval);
  }, [isLoaded, isVaultUnlocked, pushAccountStateIfReady]);

  // In-Memory Getter für AI-Pseudonymisierung registrieren (kein Namenscache im localStorage)
  useEffect(() => {
    registerActiveAppStateGetter(() => currentAppRef.current);
  }, []);

  // Synchronisation des Vault-Session-Status (RAM-Only)
  useEffect(() => {
    const unsubscribe = subscribeVaultSession((unlocked) => {
      // On setup/unlock, only unlockAppVault may announce success AFTER data
      // was loaded. Publishing "unlocked" as soon as a key enters RAM showed
      // the initial empty dashboard before the real class was restored.
      if (!unlocked) {
        setIsAppHydrated(false);
        setIsVaultUnlocked(false);
      }
    });
    return unsubscribe;
  }, []);

  // Prüft beim Start den Tresor-Status und lädt verschlüsselte Daten, falls bereits entsperrt
  useEffect(() => {
    let isMounted = true;
    const initStorage = async () => {
      try {
        const vaultExists = await hasVault();
        const activeKey = getActiveVaultKey();

        if (vaultExists && activeKey) {
          try {
            const decrypted = await loadEncryptedAppState(activeKey);
            const reconciled = await reconcileAccountState(
              decrypted ? normalizeAppState(decrypted) : null,
              activeKey,
              Boolean(decrypted),
            );
            if (isMounted) {
              setApp(reconciled);
              setIsAppHydrated(true);
              setIsVaultUnlocked(true);
              setIsLoaded(true);
              return;
            }
          } catch (decErr) {
            console.error('[Datenschutz] Entschlüsselung oder Konto-Sync beim App-Start fehlgeschlagen:', decErr);
            clearActiveVaultSession();
            if (isMounted) { setIsVaultUnlocked(false); setIsLoaded(true); }
            return;
          }
        }

        // Nicht entsperrt oder Ersteinrichtung erforderlich
        if (isMounted) {
          if (!activeKey) {
            setIsVaultUnlocked(false);
          }
          setIsLoaded(true);
        }
      } catch (e) {
        console.error('[Datenschutz] Initialisierungsfehler:', e);
        if (isMounted) setIsLoaded(true);
      }
    };

    initStorage();
    return () => {
      isMounted = false;
    };
  }, [setApp, reconcileAccountState]);

  // Store encrypted snapshots promptly; a browser being suspended cannot guarantee
  // completion of an asynchronous IndexedDB/network write, so the UI never claims
  // another device is ready until the *latest* generation is acknowledged.
  const persistLatestState = React.useCallback(async (snapshot: AppState) => {
    if (restoringRef.current || !getActiveVaultKey()) return;
    const vaultKey = getActiveVaultKey();
    if (!vaultKey) return;
    localSaveBusyRef.current += 1;
    try {
      await saveEncryptedAppState(snapshot, vaultKey);
      if (restoringRef.current || getActiveVaultKey() !== vaultKey
        || currentAppRef.current !== snapshot) return;
      locallySavedStateRef.current = snapshot;
      setAccountSyncStatus(previous => cloudConfirmedStateRef.current === snapshot
        ? previous
        : previous === 'saving-local' || previous === 'synced' || previous === 'syncing' || previous === 'local-error'
          ? 'saved-local' : previous);
      // A local snapshot is durable now; cloud confirmation still requires a server ACK.
      // Do not delay upload behind a session copy or the daily emergency backup.
      void pushAccountStateIfReady(snapshot, vaultKey).catch(error => {
        setAccountSyncHealthy(false);
        setAccountSyncMessage(accountSyncErrorMessage(error));
        setAccountSyncStatus('error');
      });
      try {
        await saveEncryptedSessionBackup(snapshot, vaultKey);
      } catch (error) {
        // Primary encrypted IndexedDB write has already succeeded.
        console.warn('[Datenschutz] Zusätzliches Session-Backup fehlgeschlagen:', error);
      }
      try {
        const todayDate = toLocalDateKey();
        const lastKopieDate = localStorage.getItem('hehle_v3_notfallkopie_date');
        if (lastKopieDate !== todayDate) {
          await saveEncryptedEmergencyBackup(snapshot, vaultKey);
        }
      } catch (error) {
        console.warn('[Datenschutz] Fehler beim Erstellen der Notfallkopie:', error);
      }
    } catch (error) {
      setAccountSyncStatus(previous => previous === 'conflict' ? previous : 'local-error');
      setAccountSyncMessage('Die letzte Änderung konnte nicht verschlüsselt auf diesem Gerät gesichert werden. Bitte KLASSIO geöffnet lassen und erneut versuchen.');
      console.error('[Datenschutz] Verschlüsseltes Speichern fehlgeschlagen:', error);
    } finally {
      localSaveBusyRef.current -= 1;
    }
  }, [pushAccountStateIfReady]);

  useEffect(() => {
    if (!isLoaded || !isVaultUnlocked) return;
    const timeout = window.setTimeout(() => {
      if (!restoringRef.current && currentAppRef.current === app) {
        void persistLatestState(app);
      }
    }, 150);
    return () => window.clearTimeout(timeout);
  }, [app, isLoaded, isVaultUnlocked, persistLatestState]);

  // A transient IndexedDB failure must not leave the latest edit unsaved forever.
  useEffect(() => {
    if (!isLoaded || !isVaultUnlocked) return;
    const interval = window.setInterval(() => {
      if (restoringRef.current || localSaveBusyRef.current > 0
        || locallySavedStateRef.current === currentAppRef.current) return;
      void persistLatestState(currentAppRef.current);
    }, 5_000);
    return () => window.clearInterval(interval);
  }, [isLoaded, isVaultUnlocked, persistLatestState]);

  // Best effort only: pagehide/visibilitychange may be suspended immediately by the OS.
  // A pending write still needs an explicit leave warning instead of a false green badge.
  useEffect(() => {
    if (!isLoaded || !isVaultUnlocked) return;
    const flushWhenHidden = () => {
      if (document.visibilityState === 'hidden'
        && locallySavedStateRef.current !== currentAppRef.current) {
        void persistLatestState(currentAppRef.current);
      }
    };
    const flushOnPageHide = () => {
      if (locallySavedStateRef.current !== currentAppRef.current) {
        void persistLatestState(currentAppRef.current);
      }
    };
    document.addEventListener('visibilitychange', flushWhenHidden);
    window.addEventListener('pagehide', flushOnPageHide);
    return () => {
      document.removeEventListener('visibilitychange', flushWhenHidden);
      window.removeEventListener('pagehide', flushOnPageHide);
    };
  }, [isLoaded, isVaultUnlocked, persistLatestState]);

  // Teamteaching: school account device key registration stays separate from local pupil data.
  useEffect(() => {
    if (!isLoaded || !isVaultUnlocked) return;
    void ensureRegisteredTeamTeachingDevice().catch((error: any) => {
      if (error?.status !== 403 && error?.status !== 401) {
        console.warn('[Teamteaching] Geräteschlüssel konnte nicht registriert werden:', error);
      }
    });
  }, [isLoaded, isVaultUnlocked]);

  const activeTeamSharedId = app.classes
    ?.find(room => room.id === app.activeClassId)
    ?.teamTeaching?.sharedClassId;

  // Teamteaching: encrypted class-only sync with optimistic revision protection.
  useEffect(() => {
    if (!isLoaded || !isVaultUnlocked || !activeTeamSharedId) return;

    let active = true;

    const setLocalTeamStatus = (
      status: 'idle' | 'syncing' | 'synced' | 'conflict' | 'error',
      message?: string,
    ) => {
      const activeRoom = currentAppRef.current.classes?.find(room => room.id === currentAppRef.current.activeClassId);
      if (activeRoom?.teamTeaching?.sharedClassId !== activeTeamSharedId) return;
      if (activeRoom.teamTeaching.syncStatus === status && activeRoom.teamTeaching.syncMessage === message) return;
      setApp(prev => {
        const current = syncActiveClass(prev);
        const classes = (current.classes || []).map(room => {
          if (room.id !== current.activeClassId || room.teamTeaching?.sharedClassId !== activeTeamSharedId) return room;
          return {
            ...room,
            teamTeaching: {
              ...room.teamTeaching!,
              syncStatus: status,
              syncMessage: message,
            },
          };
        });
        return { ...current, classes };
      });
    };

    const applyRemoteRoom = (remoteRoom: any, expectedLocalId: string, expectedRevision: number, expectedHash: string) => {
      setApp(prev => {
        const current = syncActiveClass(prev);
        const stillActive = current.classes?.find(room => room.id === expectedLocalId);
        // The teacher may have typed another lesson or switched classes while
        // the remote HTTP + decrypt request was in flight. Never erase it.
        if (current.activeClassId !== expectedLocalId
          || !stillActive || stillActive.teamTeaching?.sharedClassId !== activeTeamSharedId
          || stillActive.teamTeaching.revision !== expectedRevision
          || classRoomFingerprint(stillActive) !== expectedHash
          || remoteRoom.id !== expectedLocalId) return prev;
        const room = {
          ...remoteRoom,
          teamTeaching: {
            ...remoteRoom.teamTeaching,
            syncStatus: 'synced' as const,
            syncMessage: undefined,
          },
        };
        const classes = [...(current.classes || [])];
        const index = classes.findIndex(candidate => candidate.id === room.id);
        if (index >= 0) classes[index] = room;
        else classes.push(room);
        return switchClassState({ ...current, classes, activeClassId: undefined }, room.id);
      });
    };

    const updateAfterPush = (revision: number, hash: string) => {
      setApp(prev => {
        const current = syncActiveClass(prev);
        const classes = (current.classes || []).map(room => {
          if (room.id !== current.activeClassId || room.teamTeaching?.sharedClassId !== activeTeamSharedId) return room;
          return {
            ...room,
            teamTeaching: {
              ...room.teamTeaching!,
              revision,
              lastSyncedHash: hash,
              lastSyncedAt: new Date().toISOString(),
              syncStatus: 'synced' as const,
              syncMessage: undefined,
            },
          };
        });
        return { ...current, classes };
      });
    };

    const syncOnce = async () => {
      if (!active || teamSyncBusyRef.current || restoringRef.current) return;
      teamSyncBusyRef.current = true;

      try {
        const current = syncActiveClass(currentAppRef.current);
        const localRoom = current.classes?.find(room => room.id === current.activeClassId);
        const initialMeta = localRoom?.teamTeaching;
        if (!localRoom || !initialMeta || initialMeta.sharedClassId !== activeTeamSharedId) return;
        if (initialMeta.syncStatus === 'conflict') return;

        const remote = await pullSharedClass(activeTeamSharedId);
        if (!active) return;
        // Refresh the local baseline AFTER the asynchronous request. A lesson
        // edited during the fetch must not be silently replaced or sent with
        // the revision captured before the edit.
        const latest = syncActiveClass(currentAppRef.current);
        if (latest.activeClassId !== current.activeClassId) return;
        const latestRoom = latest.classes?.find(room => room.id === localRoom.id);
        const latestMeta = latestRoom?.teamTeaching;
        if (!latestRoom || !latestMeta || latestMeta.sharedClassId !== activeTeamSharedId || latestMeta.syncStatus === 'conflict') return;
        if (remote.room.id !== latestRoom.id) {
          setLocalTeamStatus('conflict', 'Die Teamklasse hat eine andere Klassen-ID als deine lokale Klasse. Nichts wurde überschrieben.');
          return;
        }
        const localHash = classRoomFingerprint(latestRoom);
        const remoteHash = classRoomFingerprint(remote.room);
        const baseline = latestMeta.lastSyncedHash;
        const meta = latestMeta;

        if (remote.detail.revision > meta.revision) {
          if (baseline && localHash !== baseline && meta.role !== 'viewer') {
            setLocalTeamStatus(
              'conflict',
              'Die Klasse wurde gleichzeitig auf einem anderen Gerät geändert. Deine lokale Änderung wurde nicht überschrieben.',
            );
            return;
          }
          applyRemoteRoom(remote.room, latestRoom.id, meta.revision, localHash);
          return;
        }

        if (remote.detail.revision < meta.revision) {
          setLocalTeamStatus('error', 'Der Serverstand ist älter als dein lokaler Teamteaching-Stand.');
          return;
        }

        if (!baseline) {
          if (remoteHash !== localHash) {
            setLocalTeamStatus(
              'conflict',
              'Lokaler und geteilter Stand unterscheiden sich. Bitte im Klassenteam bewusst auswählen, welche Version geladen werden soll.',
            );
            return;
          }
          updateAfterPush(meta.revision, localHash);
          return;
        }

        if (meta.role === 'viewer') {
          if (localHash !== remoteHash) applyRemoteRoom(remote.room, latestRoom.id, meta.revision, localHash);
          return;
        }

        if (localHash !== baseline) {
          setLocalTeamStatus('syncing');
          try {
            const pushed = await pushSharedClass(latestRoom);
            if (active) updateAfterPush(pushed.revision, localHash);
          } catch (error: any) {
            if (error?.code === 'REVISION_CONFLICT' || error?.status === 409) {
              setLocalTeamStatus(
                'conflict',
                'Eine andere Lehrperson hat gleichzeitig gespeichert. Nichts wurde überschrieben.',
              );
            } else {
              setLocalTeamStatus('error', error instanceof Error ? error.message : 'Teamteaching-Sync fehlgeschlagen.');
            }
          }
        } else if (meta.syncStatus !== 'synced') {
          setLocalTeamStatus('synced');
        }
      } catch (error: any) {
        if (error?.status === 401 || error?.status === 403) {
          // A school-mail session can expire while the personal-account sync
          // remains green. Never silently retain an outdated green team badge.
          setLocalTeamStatus('error', 'Teamteaching-Anmeldung oder Schulfreigabe fehlt. Bitte im Klassenteam erneut anmelden bzw. die Berechtigung prüfen.');
        } else {
          setLocalTeamStatus('error', error instanceof Error ? error.message : 'Teamteaching-Sync fehlgeschlagen.');
        }
      } finally {
        teamSyncBusyRef.current = false;
      }
    };

    const startup = window.setTimeout(() => void syncOnce(), 650);
    const interval = window.setInterval(() => void syncOnce(), 2500);
    return () => {
      active = false;
      window.clearTimeout(startup);
      window.clearInterval(interval);
    };
  }, [activeTeamSharedId, isLoaded, isVaultUnlocked, setApp]);

  // Tab Close & Refresh Intercept: Ensure synced / pending changes are secured
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!getActiveVaultKey()) return;
      if (isPendingPushRef.current || restoringRef.current
        || localSaveBusyRef.current > 0 || locallySavedStateRef.current !== currentAppRef.current
        // A read-only background refresh temporarily sets status='syncing' even
        // when the exact latest encrypted snapshot is already confirmed.
        // That is NOT an unsaved edit and must not block a safe browser reload.
        || (accountSyncStatusRef.current !== 'idle'
          && accountSyncStatusRef.current !== 'disabled'
          && cloudConfirmedStateRef.current !== currentAppRef.current)) {
        const message = 'Änderungen sind noch nicht sicher auf allen Geräten verfügbar. Bitte KLASSIO geöffnet lassen, bis der Konto-Status grün ist!';
        e.returnValue = message;
        return message;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Check for weekly reset
  useEffect(() => {
    const currentKW = getKW(new Date());
    if (app.letzteKW !== null && app.letzteKW !== currentKW) {
      const newKarten = { ...app.karten };
      app.schueler.forEach(s => {
        const k = newKarten[s.id] || { gelb: 0, rot: 0, archiv: [] };
        if (k.gelb > 0) {
          k.archiv = [...(k.archiv || []), { kw: app.letzteKW, gelb: k.gelb }];
        }
        k.gelb = 0;
        newKarten[s.id] = k;
      });
      setApp(prev => ({ ...prev, letzteKW: currentKW, karten: newKarten }));
    } else if (app.letzteKW === null) {
      setApp(prev => ({ ...prev, letzteKW: currentKW }));
    }
  }, [app.letzteKW, app.schueler]);

  const lastSeenTimestampRef = useRef<number>(0);
  const lastSeenStateRef = useRef<any>(null);
  const isPendingPushRef = useRef<boolean>(false);
  const activeSessionKeyRef = useRef<CryptoKey | null>(null);

  useEffect(() => {
    currentAppRef.current = app;
  }, [app]);

  // 1) Startup URL query/fragment sync session check (Zero-Knowledge)
  useEffect(() => {
    const handleStartupSync = async () => {
      // Priorisiere Fragment (#sync=CODE&key=SESSIONKEY), da Fragmente nie den Server erreichen!
      const parsedHash = parseSyncHash(window.location.hash);
      let code = parsedHash?.code;
      let keyStr = parsedHash?.encodedKey;

      const query = new URLSearchParams(window.location.search);
      const gabicRole = query.get('gabicRole'); // either 'child' or 'teacher' or null

      // SECURITY: Session-Code und Schlüssel werden ausschließlich aus dem URL-Fragment akzeptiert.
      // Query-Parameter würden an Server/Reverse-Proxy übertragen und könnten in Logs landen.
      if (code) {
        if (!keyStr) {
          console.warn("[Sync Startup] Session-Key fehlt! Zero-Knowledge-Sync kann ohne Schlüssel im URL-Fragment nicht entschlüsselt werden.");
          return;
        }

        try {
          console.log("[Sync Startup] Zero-Knowledge Verbindung wird aufgebaut für Code:", code);
          const sessionKey = await importSessionKey(keyStr);
          const writeToken = await deriveSyncWriteToken(keyStr);
          activeSessionKeyRef.current = sessionKey;
          setActiveSessionKey(sessionKey, keyStr);
          setActiveSyncWriteToken(writeToken);

          const res = await fetch(`/api/sync/${code}`);
          if (!res.ok) throw new Error("Sync status error: " + res.status);
          const data = await res.json();

          if (data && data.encryptedPayload) {
            const decryptedState = await decryptSyncState(data.encryptedPayload, sessionKey);
            console.log("[Sync Startup] Erfolgreich entschlüsselt und verbunden mit Sitzung:", code);
            lastSeenTimestampRef.current = data.lastUpdated || data.encryptedPayload.updatedAt || 0;
            lastSeenStateRef.current = decryptedState;

            setApp({
              ...decryptedState,
              boardSettings: {
                ...decryptedState.boardSettings,
                activeSyncCode: code,
                isRemoteController: gabicRole === 'child' ? false : true,
                gabicRole: gabicRole || undefined
              }
            });

            // Sensibles URL-Fragment sofort aus Verlauf und Adressleiste entfernen!
            cleanSyncUrlFromHistory();
          } else {
            throw new Error("Kein verschlüsselter Payload vom Server erhalten.");
          }
        } catch (err) {
          console.error("[Sync Startup] Fehler beim Entschlüsseln/Beitreten der Sync-Sitzung:", err);
          clearActiveSessionKey();
          activeSessionKeyRef.current = null;
        }
      }
    };

    handleStartupSync();
  }, []);

  const activeSyncCode = app.boardSettings?.activeSyncCode;
  const isRemoteController = app.boardSettings?.isRemoteController;

  // Helper helper to deeply check if state is structural identical excluding specific sync fields
  const areStatesEqual = (stateA: any, stateB: any) => {
    if (!stateA || !stateB) return false;
    const cleanA = {
      ...stateA,
      boardSettings: {
        ...stateA.boardSettings,
        activeSyncCode: undefined,
        isRemoteController: undefined,
        gabicRole: undefined
      }
    };
    const cleanB = {
      ...stateB,
      boardSettings: {
        ...stateB.boardSettings,
        activeSyncCode: undefined,
        isRemoteController: undefined,
        gabicRole: undefined
      }
    };
    return JSON.stringify(cleanA) === JSON.stringify(cleanB);
  };

  // 2) Pull effect (polls the backend to check if another device pushed an update)
  useEffect(() => {
    if (!activeSyncCode) return;
    
    let active = true;
    let fallbackTimer: NodeJS.Timeout;
    
    const poll = async () => {
      // If we are currently pushing or have debounced local modifications, skip pulling
      if (isPendingPushRef.current) {
        if (active) {
          fallbackTimer = setTimeout(poll, 1500);
        }
        return;
      }

      const sessionKey = activeSessionKeyRef.current || getActiveSessionKey();
      if (!sessionKey) {
        // Ohne SessionKey kann kein verschlüsselter Payload entschlüsselt werden
        if (active) {
          fallbackTimer = setTimeout(poll, 2500);
        }
        return;
      }

      try {
        const res = await fetch(`/api/sync/${activeSyncCode}`);
        if (res.status === 404) {
          console.warn("[Sync BiDirect] Session not found or expired on server (404). Disconnecting...");
          clearActiveSessionKey();
          activeSessionKeyRef.current = null;
          setApp(prev => ({
            ...prev,
            boardSettings: {
              ...prev.boardSettings,
              activeSyncCode: undefined,
              isRemoteController: undefined
            }
          }));
          return;
        }
        if (!res.ok) throw new Error("Sync failure");
        const data = await res.json();
        
        if (active && data && data.encryptedPayload && !isPendingPushRef.current) {
          // If the server has a newer timestamp
          if (data.lastUpdated > lastSeenTimestampRef.current) {
            const decryptedState = await decryptSyncState(data.encryptedPayload, sessionKey);
            const currentLocal = currentAppRef.current;
            if (!areStatesEqual(currentLocal, decryptedState)) {
              console.log("[Sync BiDirect] Structural change received from server. Updating...");
              lastSeenTimestampRef.current = data.lastUpdated;
              lastSeenStateRef.current = decryptedState;
              
              setApp(prev => {
                const localSyncCode = prev.boardSettings?.activeSyncCode;
                const localIsRemote = prev.boardSettings?.isRemoteController;
                return {
                  ...decryptedState,
                  boardSettings: {
                    ...decryptedState.boardSettings,
                    activeSyncCode: localSyncCode,
                    isRemoteController: localIsRemote,
                    remoteLastActiveTs: Date.now()
                  }
                };
              });
            } else {
              // Same content, just update the timestamp to match
              lastSeenTimestampRef.current = data.lastUpdated;
              setApp(prev => ({
                ...prev,
                boardSettings: {
                  ...prev.boardSettings,
                  remoteLastActiveTs: Date.now()
                }
              }));
            }
          }
        }
      } catch (err) {
        console.warn("[Sync BiDirect] Polling error:", err);
      } finally {
        if (active) {
          fallbackTimer = setTimeout(poll, 1500);
        }
      }
    };
    
    poll();
    
    return () => {
      active = false;
      clearTimeout(fallbackTimer);
    };
  }, [activeSyncCode]);

  // 3) Push effect (pushes any local modifications to the backend)
  useEffect(() => {
    if (!activeSyncCode) return;
    
    // Check if local state is actually different from last seen/sent state
    const currentLocal = app;
    const lastSeen = lastSeenStateRef.current;
    
    if (lastSeen && areStatesEqual(currentLocal, lastSeen)) {
      // No structural difference, skip going to server
      return;
    }

    const sessionKey = activeSessionKeyRef.current || getActiveSessionKey();
    const writeToken = getActiveSyncWriteToken();
    if (!sessionKey || !writeToken) return;

    // Mark as pending push to lock the pulling effect while we push
    isPendingPushRef.current = true;
    
    const delayDebounce = setTimeout(async () => {
      try {
        const encryptedPayload = await encryptSyncState(app, sessionKey);
        const res = await fetch(`/api/sync/${activeSyncCode}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Klassio-Sync-Write': writeToken,
          },
          body: JSON.stringify({ encryptedPayload })
        });
        if (res.status === 404) {
          console.warn("[Sync BiDirect] Pushed to an expired/missing session (404). Disconnecting...");
          clearActiveSessionKey();
          activeSessionKeyRef.current = null;
          setApp(prev => ({
            ...prev,
            boardSettings: {
              ...prev.boardSettings,
              activeSyncCode: undefined,
              isRemoteController: undefined
            }
          }));
          return;
        }
        if (!res.ok) throw new Error("Sync PUT error: " + res.status);
        const data = await res.json();
        if (data && data.lastUpdated) {
          lastSeenTimestampRef.current = data.lastUpdated;
          lastSeenStateRef.current = app; // Save pushed state reference
          isPendingPushRef.current = false;
        }
      } catch (err) {
        console.error("[Sync BiDirect] Sync pushing error:", err);
        isPendingPushRef.current = false;
      }
    }, 400); // 400ms debounce
    
    return () => clearTimeout(delayDebounce);
  }, [app, activeSyncCode]);

  const [notenUpdateTrigger, setNotenUpdateTrigger] = useState<number>(0);

  const triggerGradebookUpdate = React.useCallback(() => {
    setNotenUpdateTrigger(prev => prev + 1);
    notenSyncService.broadcastUpdate();
  }, []);

  // Automatically trigger sync event globally when app.noten or app.mitarbeit object reference changes
  useEffect(() => {
    triggerGradebookUpdate();
  }, [app.noten, app.mitarbeit, triggerGradebookUpdate]);

  const updateApp = React.useCallback((changes: Partial<AppState>) => {
    setApp(prev => ({ ...prev, ...changes }));
  }, []);

  const restoreAppData = React.useCallback(async (data: unknown) => {
    if (restoringRef.current) throw new Error('Eine Wiederherstellung läuft bereits.');
    const key = getActiveVaultKey();
    if (!key) throw new Error('Bitte zuerst den lokalen Tresor entsperren.');
    const persistedSyncCode = currentAppRef.current.boardSettings?.activeSyncCode;
    if (persistedSyncCode) {
      // Eine Wiederherstellung ist selbst ein expliziter Wechsel des lokalen Datenstands.
      // Deshalb beendet Klassio eine noch gespeicherte Smartboard-/Geräte-Sitzung automatisch,
      // statt den Import durch einen (möglicherweise verwaisten) Sync-Code zu blockieren.
      try {
        const response = await fetch('/api/sync/' + encodeURIComponent(persistedSyncCode), {
          method: 'DELETE',
          cache: 'no-store',
        });
        if (!response.ok && response.status !== 404) {
          throw new Error('Sync-Sitzung konnte serverseitig nicht beendet werden.');
        }
      } catch {
        throw new Error(
          'Die Geräteverbindung konnte vor der Wiederherstellung nicht sicher beendet werden. Bitte Internetverbindung prüfen und den Import erneut versuchen.'
        );
      }

      clearActiveSessionKey();
      activeSessionKeyRef.current = null;
      lastSeenTimestampRef.current = 0;
      lastSeenStateRef.current = null;
      isPendingPushRef.current = false;

      const withoutDeviceSync: AppState = {
        ...currentAppRef.current,
        boardSettings: {
          ...currentAppRef.current.boardSettings,
          activeSyncCode: undefined,
          isRemoteController: undefined,
          gabicRole: undefined,
          remoteLastActiveTs: undefined,
        },
      };
      currentAppRef.current = withoutDeviceSync;
      setAppInternal(withoutDeviceSync);
    }
    assertRestorableAppState(data);
    const next = syncActiveClass(normalizeAppState({
      ...data, tourAbgeschlossen: true,
      // Restore learning data, not a potentially stale saved full-screen cockpit route.
      currentPage: 'dashboard', previousPage: 'dashboard',
      boardSettings: { ...data.boardSettings, activeSyncCode: undefined, isTafelOpen: false },
    }));
    restoringRef.current = true;
    setIsRestoring(true);
    try {
      await restoreEncryptedAppState(currentAppRef.current, next, key);
      locallySavedStateRef.current = next;
      cloudConfirmedStateRef.current = null;
      setAccountSyncHealthy(false);
      setAccountSyncStatus('saved-local');
      // A lock/logout during the write must not expose the restored data in RAM/UI.
      if (getActiveVaultKey() === key) {
        currentAppRef.current = next;
        setAppInternal(next);
      }
    } finally {
      restoringRef.current = false;
      setIsRestoring(false);
    }
  }, []);

  const unlockAppVault = React.useCallback(async (key: CryptoKey, allowFreshSetup = false): Promise<boolean> => {
    try {
      const decrypted = await loadEncryptedAppState(key);
      const reconciled = await reconcileAccountState(
        decrypted ? normalizeAppState(decrypted) : null,
        key,
        Boolean(decrypted),
        undefined,
        allowFreshSetup,
      );
      setApp(reconciled);
      setIsAppHydrated(true);
      setIsVaultUnlocked(true);
      if (!decrypted && allowFreshSetup) {
        await saveEncryptedAppState(reconciled, key);
      }
      return true;
    } catch (err) {
      console.error('[Datenschutz] Entsperren des Tresors fehlgeschlagen:', err);
      return false;
    }
  }, [setApp, reconcileAccountState]);

  const lockAppVault = React.useCallback(() => {
    accountSyncReadyRef.current = false;
    accountSyncRevisionRef.current = 0;
    locallySavedStateRef.current = null;
    cloudConfirmedStateRef.current = null;
    setAccountSyncStatus('idle');
    setAccountSyncHealthy(false);
    setIsAppHydrated(false);
    clearActiveVaultSession();
    currentAppRef.current = initialAppState;
    setAppInternal(initialAppState);
    setIsVaultUnlocked(false);
  }, [setApp]);

  // ----------------------------------------------------
  // DATENSCHUTZ: Automatische Tresor-Sperre bei Inaktivität & Logout
  // ----------------------------------------------------
  const lastUserActivityRef = useRef<number>(Date.now());

  // Logout-Event abfangen (z. B. "Zugang auf diesem Gerät entfernen")
  useEffect(() => {
    const handleLogout = () => {
      console.log('[Datenschutz] Logout erkannt – Tresor wird sofort gesperrt.');
      lockAppVault();
    };
    window.addEventListener('lehrerapp-logout', handleLogout);
    return () => window.removeEventListener('lehrerapp-logout', handleLogout);
  }, [lockAppVault]);

  // Inaktivitäts-Überwachung: Benutzeraktivität (Maus, Klick, Taste, Touch, Scrollen)
  useEffect(() => {
    const onUserActivity = () => {
      const now = Date.now();
      // Throttling: Nur alle 2 Sekunden aktualisieren, um Performance nicht zu beeinträchtigen
      if (now - lastUserActivityRef.current > 2000) {
        lastUserActivityRef.current = now;
      }
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel', 'pointerdown'];
    activityEvents.forEach(evt => {
      window.addEventListener(evt, onUserActivity, { passive: true });
    });

    // Prüf-Intervall alle 10 Sekunden
    const intervalTimer = setInterval(() => {
      // Konfigurierte Zeit: 15, 30, 60 (Standard), 120 oder 0 (nur beim Schließen)
      const configuredMinutes = typeof app.settings?.vaultAutoLockMinutes === 'number'
        ? app.settings.vaultAutoLockMinutes
        : 60; // 60 Minuten Standard

      if (configuredMinutes > 0 && isVaultUnlocked) {
        const inactiveMs = Date.now() - lastUserActivityRef.current;
        if (inactiveMs >= configuredMinutes * 60 * 1000) {
          console.log(`[Datenschutz] Automatische Sperrung nach ${configuredMinutes} Minuten Inaktivität.`);
          lockAppVault();
        }
      }
    }, 10000);

    return () => {
      activityEvents.forEach(evt => {
        window.removeEventListener(evt, onUserActivity);
      });
      clearInterval(intervalTimer);
    };
  }, [isVaultUnlocked, app.settings?.vaultAutoLockMinutes, lockAppVault]);

  const saveApp = React.useCallback(async () => {
    if (restoringRef.current) return;
    // Same encrypted local-first pipeline as autosave: no separate untracked save path.
    await persistLatestState(currentAppRef.current);
  }, [persistLatestState]);

  const updateStudent = React.useCallback((student: Student) => {
    setApp(prev => {
      const schueler = [...prev.schueler];
      const idx = schueler.findIndex(s => s.id === student.id);
      if (idx >= 0) schueler[idx] = student;
      else schueler.push(student);
      return { ...prev, schueler };
    });
  }, []);

  const deleteStudent = React.useCallback((id: string) => {
    setApp(prev => removeStudentFromAppState(prev, id));
  }, [setApp]);

  const setPage = React.useCallback((page: string) => {
    setApp(prev => {
      if (prev.currentPage === page) return prev;
      const previousPage = prev.currentPage && prev.currentPage !== 'cockpit'
        ? prev.currentPage
        : prev.previousPage || 'wochenplanung';
      return {
        ...prev,
        previousPage,
        currentPage: page,
      };
    });
  }, []);

  const switchClass = React.useCallback((id: string) => {
    setApp(prev => switchClassState(prev, id));
  }, []);

  const addClass = React.useCallback((name: string, stufe: number, isKV: boolean) => {
    const id = 'class-' + Math.random().toString(36).substring(2, 9);
    setApp(prev => {
      const newClass: any = {
        id,
        name,
        stufe,
        schulart: normalizeSchulart(prev.schulart),
        klassenvorstand: isKV,
        schueler: [],
        noten: {},
        notenMeta: {},
        notenGewichtung: {},
        lernzielTracker: {},
        studentLernzielBewertungen: {},
        studentLernzielSemesterBewertungen: {},
        lernzielBewertungsmodell: undefined,
        diagnostikErgebnisse: [],
        diagnostikErhebungen: [],
        diagnosticResults: [],
        ikmRecords: [],
        antolinRecords: [],
        schuelerGoals: [],
        observations: [],
        metaKognitionsProtokolle: [],
        interaktionsLog: { eintraege: [], wochenEmpfehlung: null },
        mitarbeit: {},
        mitarbeit_settings: { thresholds: { 1: 13, 2: 10, 3: 7, 4: 4, 5: 0 }, mode: 'absolute' },
        verhalten: {},
        karten: {},
        jahresplanung: {},
        jahresplan_faecher: DEFAULT_YEARLY_SUBJECTS,
        wochenplanung: {},
        klassenbuchErgaenzungen: {},
        parkgarage: [],
        savedWeekTemplates: {},
        stammplan: {},
        anwesenheit: {},
        anwesenheitDetail: {},
        dienste: [],
        checklisten: [],
        customLists: [],
        zugangsdaten: [],
        klassenglas_count: 0,
        klassenglas_ziel: 20,
        klassenglas_belohnung: 'Gemeinsame Spielzeit',
        classContracts: [],
        councilNotes: [],
        klassenkasse: { kontostand: 0, sammlungen: [], transaktionen: [] },
        behavior_status: {},
        behavior_notes: {},
        notes: [],
        journal: [],
        statusLog: [],
        jahresberichte: {},
        sue_kontrolle: {},
        sitzplan_schueler: {},
        sitzplan_objekte: [],
        sitzplanLayouts: [],
        sitzplanDefaultLayoutId: undefined,
        sitzplanRegeln: [],
        tageplan: DEFAULT_TAGEPLAN,
        faecher: FAECHER_ALLE,
        fachConfig: DEFAULT_FACH_COLORS,
        theme: 'classic_light',
        settings: { ...initialAppState.settings },
        schuljahr: prev.schuljahr || '2024/25'
      };

      const { classes } = syncActiveClass(prev);

      // 2. Add new class and switch immediately to it with currentPage: 'setup'
      return {
        ...prev,
        currentPage: 'setup',
        activeClassId: id,
        classes: [...classes, newClass],
        klassenbezeichnung: newClass.name,
        stufe: newClass.stufe,
        schulart: newClass.schulart,
        klassenvorstand: newClass.klassenvorstand,
        schueler: newClass.schueler ? JSON.parse(JSON.stringify(newClass.schueler)) : [],
        saAssessments: newClass.saAssessments || {},
        scheduleAnalysis: newClass.scheduleAnalysis,
        noten: newClass.noten,
        notenMeta: newClass.notenMeta || {},
        notenGewichtung: newClass.notenGewichtung || {},
        lernzielTracker: {},
        studentLernzielBewertungen: {},
        studentLernzielSemesterBewertungen: {},
        lernzielBewertungsmodell: undefined,
        diagnostikErgebnisse: [],
        diagnostikErhebungen: [],
        diagnosticResults: [],
        ikmRecords: [],
        antolinRecords: [],
        schuelerGoals: [],
        observations: [],
        metaKognitionsProtokolle: [],
        interaktionsLog: { eintraege: [], wochenEmpfehlung: null },
        mitarbeit: newClass.mitarbeit,
        mitarbeit_settings: newClass.mitarbeit_settings,
        verhalten: newClass.verhalten,
        karten: newClass.karten,
        jahresplanung: newClass.jahresplanung,
        jahresplan_faecher: newClass.jahresplan_faecher,
        wochenplanung: newClass.wochenplanung ? JSON.parse(JSON.stringify(newClass.wochenplanung)) : {},
        klassenbuchErgaenzungen: newClass.klassenbuchErgaenzungen ? JSON.parse(JSON.stringify(newClass.klassenbuchErgaenzungen)) : {},
        parkgarage: [],
        savedWeekTemplates: {},
        stammplan: newClass.stammplan ? JSON.parse(JSON.stringify(newClass.stammplan)) : {},
        anwesenheit: newClass.anwesenheit,
        anwesenheitDetail: newClass.anwesenheitDetail,
        schuelerStimmung: newClass.schuelerStimmung || {},
        dienste: newClass.dienste,
        checklisten: [],
        customLists: [],
        zugangsdaten: newClass.zugangsdaten || [],
        klassenglas_missions: [],
        klassenglas_completed_missions: [],
        klassenglas_count: newClass.klassenglas_count,
        klassenglas_ziel: newClass.klassenglas_ziel,
        klassenglas_belohnung: newClass.klassenglas_belohnung || 'Gemeinsame Spielzeit',
        classContracts: [],
        councilNotes: [],
        klassenkasse: newClass.klassenkasse,
        behavior_status: newClass.behavior_status,
        behavior_notes: newClass.behavior_notes,
        notes: [],
        journal: [],
        statusLog: [],
        jahresberichte: {},
        sue_kontrolle: newClass.sue_kontrolle,
        sitzplan_schueler: newClass.sitzplan_schueler,
        sitzplan_objekte: newClass.sitzplan_objekte,
        sitzplanLayouts: newClass.sitzplanLayouts || [],
        sitzplanDefaultLayoutId: newClass.sitzplanDefaultLayoutId,
        sitzplanRegeln: newClass.sitzplanRegeln || [],
        lastGroups: undefined,
        stundenZeiten: STUNDEN_INFO,
        tageplan: DEFAULT_TAGEPLAN,
        faecher: FAECHER_ALLE,
        fachConfig: DEFAULT_FACH_COLORS,
        theme: newClass.theme || prev.theme,
        customBgColor: newClass.customBgColor || prev.customBgColor,
        customAccentColor: newClass.customAccentColor || prev.customAccentColor,
        customTextColor: newClass.customTextColor || prev.customTextColor,
        customText2Color: newClass.customText2Color || prev.customText2Color,
        settings: newClass.settings ? JSON.parse(JSON.stringify(newClass.settings)) : (prev.settings ? JSON.parse(JSON.stringify(prev.settings)) : {})
      };
    });
  }, [initialAppState.settings]);

  const deleteClass = React.useCallback((targetId?: string) => {
    if (restoringRef.current) return;
    setAppInternal(prev => {
      const idToDelete = targetId || prev.activeClassId;
      if (!idToDelete) return prev;

      const classes = prev.classes || [];
      const classToDelete = classes.find(c => c.id === idToDelete) || (prev.activeClassId === idToDelete ? {
        id: prev.activeClassId,
        name: prev.klassenbezeichnung,
        stufe: prev.stufe,
        schueler: prev.schueler || []
      } : null);

      if (!classToDelete && prev.activeClassId !== idToDelete) {
        return prev;
      }

      // Collect student IDs of the class to be deleted
      const deletedStudentIds = new Set<string>();
      if (classToDelete?.schueler && Array.isArray(classToDelete.schueler)) {
        classToDelete.schueler.forEach((s: any) => { if (s && s.id) deletedStudentIds.add(s.id); });
      }
      if (prev.activeClassId === idToDelete && prev.schueler && Array.isArray(prev.schueler)) {
        prev.schueler.forEach((s: any) => { if (s && s.id) deletedStudentIds.add(s.id); });
      }

      // Filter remaining classes
      const remainingClasses = classes.filter(c => c.id !== idToDelete);

      // Clean up orphaned data related to deleted students
      const cleanDiffGruppen = (prev.differenzierungsGruppen || []).filter(g => {
        if (!g.schuelerIds) return true;
        const validIds = g.schuelerIds.filter(sid => !deletedStudentIds.has(sid));
        return validIds.length > 0;
      }).map(g => ({
        ...g,
        schuelerIds: (g.schuelerIds || []).filter(sid => !deletedStudentIds.has(sid))
      }));
      const cleanDiagnostikErgebnisse = ((prev as any).diagnostikErgebnisse || []).filter((d: any) => !deletedStudentIds.has(d.schuelerId) && !deletedStudentIds.has(d.id));
      const cleanDiagnostikErhebungen = ((prev as any).diagnostikErhebungen || []).filter((d: any) => !deletedStudentIds.has(d.schuelerId) && !deletedStudentIds.has(d.id));
      const cleanDiagnosticResults = ((prev as any).diagnosticResults || []).filter((d: any) => !deletedStudentIds.has(d.studentId) && !deletedStudentIds.has(d.id));
      const cleanIkmRecords = (prev.ikmRecords || []).filter(r => !deletedStudentIds.has(r.schuelerId));
      const cleanStimmNotizen = (prev.stimmNotizen || []).filter(n => !deletedStudentIds.has(n.schuelerId));
      const cleanInteraktionsLog = prev.interaktionsLog ? {
        ...prev.interaktionsLog,
        eintraege: (prev.interaktionsLog.eintraege || []).filter(e => !deletedStudentIds.has(e.schuelerId))
      } : prev.interaktionsLog;

      const filterStudentMap = (map: any) => {
        if (!map) return {};
        const res: any = {};
        Object.keys(map).forEach(k => {
          if (!deletedStudentIds.has(k)) res[k] = map[k];
        });
        return res;
      };

      const cleanLernzielBewertungen = filterStudentMap(prev.studentLernzielBewertungen);
      const cleanLernzielSemesterBewertungen = filterStudentMap(prev.studentLernzielSemesterBewertungen);

      // If other classes are remaining:
      if (remainingClasses.length > 0) {
        if (prev.activeClassId !== idToDelete) {
          return {
            ...prev,
            classes: remainingClasses,
            notes: prev.notes,
            journal: prev.journal,
            statusLog: prev.statusLog,
            differenzierungsGruppen: cleanDiffGruppen,
            diagnostikErgebnisse: cleanDiagnostikErgebnisse,
            diagnostikErhebungen: cleanDiagnostikErhebungen,
            diagnosticResults: cleanDiagnosticResults,
            ikmRecords: cleanIkmRecords,
            stimmNotizen: cleanStimmNotizen,
            interaktionsLog: cleanInteraktionsLog,
            studentLernzielBewertungen: cleanLernzielBewertungen,
            studentLernzielSemesterBewertungen: cleanLernzielSemesterBewertungen
          };
        }

        // The deleted class WAS the active class -> switch to first remaining class
        const nextClass = remainingClasses[0];
        const currentLoc = prev.currentPage || 'dashboard';
        const needsSafeLanding = !nextClass.klassenvorstand && ['orga', 'uebergabemappe', 'diagnostik', 'kel'].includes(currentLoc);

        return {
          ...prev,
          currentPage: needsSafeLanding ? 'dashboard' : currentLoc,
          activeClassId: nextClass.id,
          classes: remainingClasses,
          klassenbezeichnung: nextClass.name,
          stufe: nextClass.stufe,
          schulart: normalizeSchulart(nextClass.schulart),
          klassenvorstand: nextClass.klassenvorstand,
          schuljahr: nextClass.schuljahr || prev.schuljahr || getCurrentSchuljahr(),
          schueler: nextClass.schueler ? JSON.parse(JSON.stringify(nextClass.schueler)) : [],
          saAssessments: nextClass.saAssessments || {},
          scheduleAnalysis: nextClass.scheduleAnalysis,
          noten: nextClass.noten || {},
          notenMeta: nextClass.notenMeta || {},
          notenGewichtung: nextClass.notenGewichtung || {},
          lernzielTracker: nextClass.lernzielTracker ? JSON.parse(JSON.stringify(nextClass.lernzielTracker)) : {},
          studentLernzielBewertungen: nextClass.studentLernzielBewertungen ? JSON.parse(JSON.stringify(nextClass.studentLernzielBewertungen)) : {},
          studentLernzielSemesterBewertungen: nextClass.studentLernzielSemesterBewertungen ? JSON.parse(JSON.stringify(nextClass.studentLernzielSemesterBewertungen)) : {},
        lernzielBewertungsmodell: nextClass.lernzielBewertungsmodell ? JSON.parse(JSON.stringify(nextClass.lernzielBewertungsmodell)) : undefined,
          diagnostikErgebnisse: nextClass.diagnostikErgebnisse ? JSON.parse(JSON.stringify(nextClass.diagnostikErgebnisse)) : [],
          diagnostikErhebungen: nextClass.diagnostikErhebungen ? JSON.parse(JSON.stringify(nextClass.diagnostikErhebungen)) : [],
          diagnosticResults: nextClass.diagnosticResults ? JSON.parse(JSON.stringify(nextClass.diagnosticResults)) : [],
          ikmRecords: nextClass.ikmRecords ? JSON.parse(JSON.stringify(nextClass.ikmRecords)) : [],
          antolinRecords: nextClass.antolinRecords ? JSON.parse(JSON.stringify(nextClass.antolinRecords)) : [],
          schuelerGoals: nextClass.schuelerGoals ? JSON.parse(JSON.stringify(nextClass.schuelerGoals)) : [],
          observations: nextClass.observations ? JSON.parse(JSON.stringify(nextClass.observations)) : [],
          metaKognitionsProtokolle: nextClass.metaKognitionsProtokolle ? JSON.parse(JSON.stringify(nextClass.metaKognitionsProtokolle)) : [],
          interaktionsLog: nextClass.interaktionsLog ? JSON.parse(JSON.stringify(nextClass.interaktionsLog)) : { eintraege: [], wochenEmpfehlung: null },
          mitarbeit: nextClass.mitarbeit || {},
          mitarbeit_settings: nextClass.mitarbeit_settings ? JSON.parse(JSON.stringify(nextClass.mitarbeit_settings)) : { thresholds: { 1: 13, 2: 10, 3: 7, 4: 4, 5: 0 }, mode: 'absolute' },
          verhalten: nextClass.verhalten || {},
          karten: nextClass.karten || {},
          jahresplanung: nextClass.jahresplanung || {},
          jahresplan_faecher: nextClass.jahresplan_faecher || DEFAULT_YEARLY_SUBJECTS,
          wochenplanung: nextClass.wochenplanung ? JSON.parse(JSON.stringify(nextClass.wochenplanung)) : {},
          klassenbuchErgaenzungen: nextClass.klassenbuchErgaenzungen ? JSON.parse(JSON.stringify(nextClass.klassenbuchErgaenzungen)) : {},
          stammplan: nextClass.stammplan ? JSON.parse(JSON.stringify(nextClass.stammplan)) : {},
          anwesenheit: nextClass.anwesenheit || {},
          anwesenheitDetail: nextClass.anwesenheitDetail || {},
          schuelerStimmung: nextClass.schuelerStimmung || {},
          dienste: nextClass.dienste || [],
          checklisten: nextClass.checklisten || [],
          customLists: nextClass.customLists || [],
          zugangsdaten: nextClass.zugangsdaten ? JSON.parse(JSON.stringify(nextClass.zugangsdaten)) : [],
          klassenglas_count: nextClass.klassenglas_count || 0,
          klassenglas_ziel: nextClass.klassenglas_ziel || 20,
          klassenglas_belohnung: nextClass.klassenglas_belohnung || 'Gemeinsame Spielzeit',
          klassenglas_missions: nextClass.klassenglas_missions || [],
          klassenglas_completed_missions: nextClass.klassenglas_completed_missions || [],
          classContracts: nextClass.classContracts ? JSON.parse(JSON.stringify(nextClass.classContracts)) : [],
          councilNotes: nextClass.councilNotes ? JSON.parse(JSON.stringify(nextClass.councilNotes)) : [],
          klassenkasse: nextClass.klassenkasse || { kontostand: 0, sammlungen: [], transaktionen: [] },
          behavior_status: nextClass.behavior_status || {},
          behavior_notes: nextClass.behavior_notes || {},
          notes: nextClass.notes ? JSON.parse(JSON.stringify(nextClass.notes)) : [],
          journal: nextClass.journal ? JSON.parse(JSON.stringify(nextClass.journal)) : [],
          statusLog: nextClass.statusLog ? JSON.parse(JSON.stringify(nextClass.statusLog)) : [],
          jahresberichte: nextClass.jahresberichte ? JSON.parse(JSON.stringify(nextClass.jahresberichte)) : {},
          sue_kontrolle: nextClass.sue_kontrolle || {},
          sitzplan_schueler: nextClass.sitzplan_schueler || {},
          sitzplan_objekte: nextClass.sitzplan_objekte || [],
          sitzplanLayouts: nextClass.sitzplanLayouts ? JSON.parse(JSON.stringify(nextClass.sitzplanLayouts)) : [],
          sitzplanDefaultLayoutId: nextClass.sitzplanDefaultLayoutId,
          sitzplanRegeln: nextClass.sitzplanRegeln || [],
          lastGroups: nextClass.lastGroups,
          stundenZeiten: nextClass.stundenZeiten || STUNDEN_INFO,
          tageplan: nextClass.tageplan || prev.tageplan || DEFAULT_TAGEPLAN,
          faecher: nextClass.faecher || prev.faecher || FAECHER_ALLE,
          fachConfig: nextClass.fachConfig || prev.fachConfig || DEFAULT_FACH_COLORS,
          theme: nextClass.theme || prev.theme,
          customBgColor: nextClass.customBgColor || prev.customBgColor,
          customAccentColor: nextClass.customAccentColor || prev.customAccentColor,
          customTextColor: nextClass.customTextColor || prev.customTextColor,
          customText2Color: nextClass.customText2Color || prev.customText2Color,
          settings: nextClass.settings ? JSON.parse(JSON.stringify(nextClass.settings)) : (prev.settings ? JSON.parse(JSON.stringify(prev.settings)) : {}),
          differenzierungsGruppen: cleanDiffGruppen,
          stimmNotizen: cleanStimmNotizen
        };
      } else {
        // NO classes remaining -> reset cleanly and navigate to setup
        return {
          ...prev,
          currentPage: 'setup',
          activeClassId: '',
          classes: [],
          klassenbezeichnung: '',
          stufe: 1,
          schulart: 'volksschule',
          klassenvorstand: true,
          schueler: [],
          noten: {},
          notenMeta: {},
          notenGewichtung: {},
          lernzielTracker: {},
          studentLernzielBewertungen: {},
          studentLernzielSemesterBewertungen: {},
        lernzielBewertungsmodell: undefined,
          diagnostikErgebnisse: [],
          diagnostikErhebungen: [],
          diagnosticResults: [],
          ikmRecords: [],
          antolinRecords: [],
          schuelerGoals: [],
          observations: [],
          metaKognitionsProtokolle: [],
          interaktionsLog: { eintraege: [], wochenEmpfehlung: null },
          mitarbeit: {},
          mitarbeit_settings: { thresholds: { 1: 13, 2: 10, 3: 7, 4: 4, 5: 0 }, mode: 'absolute' },
          verhalten: {},
          karten: {},
          jahresplanung: {},
          jahresplan_faecher: DEFAULT_YEARLY_SUBJECTS,
          wochenplanung: {},
          klassenbuchErgaenzungen: {},
          stammplan: {},
          anwesenheit: {},
          anwesenheitDetail: {},
          dienste: [],
          checklisten: [],
          customLists: [],
          zugangsdaten: [],
          saAssessments: {},
          klassenglas_count: 0,
          klassenglas_ziel: 20,
          klassenglas_belohnung: 'Gemeinsame Spielzeit',
          klassenglas_missions: [],
          klassenglas_completed_missions: [],
          klassenkasse: { kontostand: 0, sammlungen: [], transaktionen: [] },
          behavior_status: {},
          behavior_notes: {},
          notes: [],
          journal: [],
          statusLog: [],
          sue_kontrolle: {},
          sitzplan_schueler: {},
          sitzplan_objekte: [],
          sitzplanLayouts: [],
          sitzplanDefaultLayoutId: undefined,
          sitzplanRegeln: [],
          lastGroups: undefined,
          stundenZeiten: STUNDEN_INFO,
          tageplan: DEFAULT_TAGEPLAN,
          differenzierungsGruppen: cleanDiffGruppen,
          stimmNotizen: cleanStimmNotizen,
          tourAbgeschlossen: false
        };
      }
    });
  }, []);

  const removeClass = React.useCallback((id: string) => {
    deleteClass(id);
  }, [deleteClass]);

  const calculateWidgetFontSize = React.useCallback((scale: number): string => {
    // scale is usually between 0.4 and 3.0. We want a proportional rem value so text sizes adjust automatically
    const remValue = scale * 1.35;
    return `${Math.max(0.45, Math.min(3.5, remValue))}rem`;
  }, []);

  const contextValue = React.useMemo(() => ({
    app, 
    setApp, 
    updateApp,
    saveApp,
    restoreAppData,
    updateStudent, 
    deleteStudent, 
    setPage, 
    switchClass, 
    addClass, 
    removeClass,
    deleteClass,
    notenUpdateTrigger,
    triggerGradebookUpdate,
    calculateWidgetFontSize,
    screenLocked,
    setScreenLocked,
    isVaultUnlocked,
    isAppHydrated,
    lockAppVault,
    unlockAppVault,
    accountSyncStatus,
    accountSyncLastAt,
    accountSyncMessage,
    accountSyncConflictResolvable,
    retryAccountSync,
    resolveAccountSyncConflict
  }), [app, notenUpdateTrigger, calculateWidgetFontSize, screenLocked, updateApp, deleteClass, switchClass, addClass, removeClass, updateStudent, deleteStudent, setPage, saveApp, restoreAppData, isVaultUnlocked, isAppHydrated, lockAppVault, unlockAppVault, accountSyncStatus, accountSyncLastAt, accountSyncMessage, accountSyncConflictResolvable, retryAccountSync, resolveAccountSyncConflict]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 flex-col gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div>
        <p className="text-slate-500 font-medium animate-pulse">Lade Arbeitsbereich...</p>
      </div>
    );
  }

  return (
    <AppContext.Provider value={contextValue}>
      {children}
      {isRestoring && <div role="status" aria-live="polite" className="fixed inset-0 z-[99999] bg-slate-950/80 flex items-center justify-center text-white">
        <p>Backup wird geprüft und verschlüsselt gespeichert …</p>
      </div>}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

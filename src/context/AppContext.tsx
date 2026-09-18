import { assertRestorableAppState } from '../lib/backupRestore';
import { initialAppState, syncActiveClass, normalizeAppState, switchClassState } from '../lib/appState';
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
  setActiveSessionKey,
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
  appStateFingerprint,
  decryptAccountSyncSnapshot,
  fetchAccountSyncSnapshot,
  hasEmailAccountSession,
  loadAccountSyncMetadata,
  pushAccountSyncSnapshot,
  saveAccountSyncMetadata,
  setAccountSyncHealthy,
  type AccountSyncStatus,
} from '../lib/accountSyncService';
import { registerActiveAppStateGetter } from '../services/aiService';
import { ensureRegisteredTeamTeachingDevice, pullSharedClass, pushSharedClass } from '../lib/teamTeachingService';
import { classRoomFingerprint } from '../lib/teamTeachingCrypto';

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
  lockAppVault: () => void;
  unlockAppVault: (key: CryptoKey) => Promise<boolean>;
  accountSyncStatus: AccountSyncStatus;
  accountSyncLastAt: string | null;
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

  const setApp = React.useCallback((val: React.SetStateAction<AppState>) => {
    if (restoringRef.current) return;
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
  const [accountSyncStatus, setAccountSyncStatus] = useState<AccountSyncStatus>('idle');
  const [accountSyncLastAt, setAccountSyncLastAt] = useState<string | null>(null);
  const accountSyncReadyRef = useRef(false);
  const accountSyncBusyRef = useRef(false);
  const accountSyncRevisionRef = useRef(0);

  const markAccountSynced = React.useCallback((snapshot: any, state: AppState) => {
    saveAccountSyncMetadata(snapshot, state);
    accountSyncRevisionRef.current = snapshot.revision;
    accountSyncReadyRef.current = true;
    setAccountSyncLastAt(snapshot.updatedAt || new Date().toISOString());
    setAccountSyncHealthy(true);
    setAccountSyncStatus('synced');
  }, []);

  const reconcileAccountState = React.useCallback(async (
    localState: AppState | null,
    vaultKey: CryptoKey,
    hadLocalState: boolean,
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

    const hasAccount = await hasEmailAccountSession();
    if (!hasAccount) {
      accountSyncReadyRef.current = false;
      setAccountSyncHealthy(false);
      setAccountSyncStatus('disabled');
      return current;
    }

    setAccountSyncStatus('syncing');
    try {
      const remote = await fetchAccountSyncSnapshot();

      if (!remote) {
        const created = await pushAccountSyncSnapshot(current, vaultKey, vaultRecord, 0);
        markAccountSynced(created, current);
        return current;
      }

      if (remote.vaultRecord.id !== vaultRecord.id) {
        accountSyncReadyRef.current = false;
        setAccountSyncHealthy(false);
        setAccountSyncStatus('conflict');
        console.warn('[AccountSync] Remote-Tresor stimmt nicht mit dem lokalen Tresor überein. Kein Stand wurde überschrieben.');
        return current;
      }

      const decryptedRemote = await decryptAccountSyncSnapshot(remote, vaultKey);
      assertRestorableAppState(decryptedRemote);
      const remoteState = normalizeAppState(decryptedRemote);
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
        setAccountSyncStatus('conflict');
        console.warn('[AccountSync] Lokaler und serverseitiger Erststand unterscheiden sich. Automatisches Überschreiben wurde verhindert.');
        return current;
      }

      if (remote.revision > baseline.revision) {
        if (localFingerprint === baseline.fingerprint) {
          await saveEncryptedAppState(remoteState, vaultKey);
          markAccountSynced(remote, remoteState);
          return remoteState;
        }
        if (localFingerprint === remoteFingerprint) {
          markAccountSynced(remote, current);
          return current;
        }
        accountSyncReadyRef.current = false;
        setAccountSyncHealthy(false);
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
      setAccountSyncStatus('error');
      console.warn('[AccountSync] Serverrevision ist älter als der lokal bekannte Sync-Stand.');
      return current;
    } catch (error: any) {
      accountSyncReadyRef.current = false;
      if (error?.status === 401 || error?.status === 403) {
        setAccountSyncHealthy(false);
      setAccountSyncStatus('disabled');
        return current;
      }
      setAccountSyncHealthy(false);
      setAccountSyncStatus(error?.code === 'REVISION_CONFLICT' || error?.code === 'VAULT_MISMATCH' ? 'conflict' : 'error');
      console.error('[AccountSync] Kontostand konnte nicht abgeglichen werden:', error);
      if (!hadLocalState) throw error;
      return current;
    }
  }, [markAccountSynced]);

  const pushAccountStateIfReady = React.useCallback(async (state: AppState, vaultKey: CryptoKey) => {
    if (!accountSyncReadyRef.current || accountSyncBusyRef.current) return;
    const vaultRecord = await loadVaultRecord();
    if (!vaultRecord) return;

    const baseline = loadAccountSyncMetadata(vaultRecord.id);
    const expectedRevision = accountSyncRevisionRef.current || baseline?.revision || 0;
    if (baseline && appStateFingerprint(state) === baseline.fingerprint && expectedRevision === baseline.revision) {
      return;
    }

    accountSyncBusyRef.current = true;
    setAccountSyncStatus('syncing');
    try {
      const snapshot = await pushAccountSyncSnapshot(state, vaultKey, vaultRecord, expectedRevision);
      markAccountSynced(snapshot, state);
    } catch (error: any) {
      if (error?.status === 401 || error?.status === 403) {
        accountSyncReadyRef.current = false;
        setAccountSyncHealthy(false);
      setAccountSyncStatus('disabled');
      } else if (error?.status === 409 || error?.code === 'REVISION_CONFLICT' || error?.code === 'VAULT_MISMATCH') {
        accountSyncReadyRef.current = false;
        setAccountSyncHealthy(false);
        setAccountSyncStatus('conflict');
      } else {
        setAccountSyncHealthy(false);
      setAccountSyncStatus('error');
      }
      console.error('[AccountSync] Automatisches Speichern auf dem Server fehlgeschlagen:', error);
    } finally {
      accountSyncBusyRef.current = false;
    }
  }, [markAccountSynced]);

  // In-Memory Getter für AI-Pseudonymisierung registrieren (kein Namenscache im localStorage)
  useEffect(() => {
    registerActiveAppStateGetter(() => currentAppRef.current);
  }, []);

  // Synchronisation des Vault-Session-Status (RAM-Only)
  useEffect(() => {
    const unsubscribe = subscribeVaultSession((unlocked) => {
      setIsVaultUnlocked(unlocked);
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

  // Autosave: Verschlüsselt den AppState debounced mit dem aktiven VaultKey im RAM
  useEffect(() => {
    if (!isLoaded || !isVaultUnlocked) return;

    const timeout = setTimeout(async () => {
      if (restoringRef.current || currentAppRef.current !== app) return;
      try {
        const vaultKey = getActiveVaultKey();
        if (!vaultKey) {
          // Ohne aktiven Schlüssel im RAM wird Speichern strikt verweigert (kein unverschlüsselter Fallback!)
          console.warn('[Datenschutz] Autosave pausiert: Kein aktiver VaultKey im RAM.');
          return;
        }

        // 1. Verschlüsselt im Primär- und Fallback-Speicher sichern
        await saveEncryptedAppState(app, vaultKey);
        if (restoringRef.current || currentAppRef.current !== app) return;

        // 2. Verschlüsseltes Session-Backup
        await saveEncryptedSessionBackup(app, vaultKey);

        // 3. Einmal tägliche verschlüsselte Notfallkopie
        try {
          const todayDate = toLocalDateKey();
          const lastKopieDate = localStorage.getItem('hehle_v3_notfallkopie_date');
          if (lastKopieDate !== todayDate) {
            await saveEncryptedEmergencyBackup(app, vaultKey);
          }
        } catch (e) {
          console.warn('[Datenschutz] Fehler beim Erstellen der Notfallkopie:', e);
        }

        // 4. Bei E-Mail-Konto denselben Stand zusätzlich Ende-zu-Ende-verschlüsselt
        // auf dem Klassio-Server halten. Fehler blockieren die lokale Speicherung nie.
        await pushAccountStateIfReady(app, vaultKey);
      } catch (e) {
        console.error('[Datenschutz] Fehler beim verschlüsselten Autosave:', e);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [app, isLoaded, isVaultUnlocked, pushAccountStateIfReady]);

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

    const applyRemoteRoom = (remoteRoom: any) => {
      setApp(prev => {
        const current = syncActiveClass(prev);
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
        const meta = localRoom?.teamTeaching;
        if (!localRoom || !meta || meta.sharedClassId !== activeTeamSharedId) return;
        if (meta.syncStatus === 'conflict') return;

        const localHash = classRoomFingerprint(localRoom);
        const remote = await pullSharedClass(activeTeamSharedId);
        if (!active) return;

        const remoteHash = classRoomFingerprint(remote.room);
        const baseline = meta.lastSyncedHash;

        if (remote.detail.revision > meta.revision) {
          if (baseline && localHash !== baseline && meta.role !== 'viewer') {
            setLocalTeamStatus(
              'conflict',
              'Die Klasse wurde gleichzeitig auf einem anderen Gerät geändert. Deine lokale Änderung wurde nicht überschrieben.',
            );
            return;
          }
          applyRemoteRoom(remote.room);
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
          if (localHash !== remoteHash) applyRemoteRoom(remote.room);
          return;
        }

        if (localHash !== baseline) {
          setLocalTeamStatus('syncing');
          try {
            const pushed = await pushSharedClass(localRoom);
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
        if (error?.status !== 401 && error?.status !== 403) {
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
      if (isPendingPushRef.current || restoringRef.current) {
        const message = 'Deine Daten werden gerade im Hintergrund mit der Cloud synchronisiert. Bitte warte einen Moment, um keinen Arbeitsfortschritt zu verlieren!';
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

      // Fallback auf Query-Parameter (falls alte Verlinkung)
      if (!code) {
        code = query.get('sync')?.trim().toUpperCase() || undefined;
        keyStr = query.get('key')?.trim() || undefined;
      }

      if (code) {
        if (!keyStr) {
          console.warn("[Sync Startup] Session-Key fehlt! Zero-Knowledge-Sync kann ohne Schlüssel im URL-Fragment nicht entschlüsselt werden.");
          return;
        }

        try {
          console.log("[Sync Startup] Zero-Knowledge Verbindung wird aufgebaut für Code:", code);
          const sessionKey = await importSessionKey(keyStr);
          activeSessionKeyRef.current = sessionKey;
          setActiveSessionKey(sessionKey, keyStr);

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
    if (!sessionKey) return;

    // Mark as pending push to lock the pulling effect while we push
    isPendingPushRef.current = true;
    
    const delayDebounce = setTimeout(async () => {
      try {
        const encryptedPayload = await encryptSyncState(app, sessionKey);
        const res = await fetch(`/api/sync/${activeSyncCode}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
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
      let syncSessionStillExists = true;
      try {
        const response = await fetch('/api/sync/' + encodeURIComponent(persistedSyncCode), { cache: 'no-store' });
        if (response.status === 404) syncSessionStillExists = false;
      } catch {
        throw new Error(
          'Die gespeicherte Geräteverbindung konnte gerade nicht geprüft werden. Bitte Internetverbindung prüfen und den Import erneut versuchen.'
        );
      }

      if (syncSessionStillExists) {
        throw new Error('Bitte zuerst die aktive Geräteverbindung beenden und das Backup danach erneut einlesen.');
      }

      // Alte Builds konnten einen abgelaufenen Sync-Code lokal behalten. Eine serverseitig
      // nicht mehr vorhandene Sitzung darf deshalb keinen Backup-Import dauerhaft blockieren.
      clearActiveSessionKey();
      activeSessionKeyRef.current = null;
      const withoutStaleSync: AppState = {
        ...currentAppRef.current,
        boardSettings: {
          ...currentAppRef.current.boardSettings,
          activeSyncCode: undefined,
          isRemoteController: undefined,
          gabicRole: undefined,
        },
      };
      currentAppRef.current = withoutStaleSync;
      setAppInternal(withoutStaleSync);
    }
    assertRestorableAppState(data);
    const next = syncActiveClass(normalizeAppState({
      ...data, tourAbgeschlossen: true,
      boardSettings: { ...data.boardSettings, activeSyncCode: undefined, isTafelOpen: false },
    }));
    restoringRef.current = true;
    setIsRestoring(true);
    try {
      await restoreEncryptedAppState(currentAppRef.current, next, key);
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

  const unlockAppVault = React.useCallback(async (key: CryptoKey): Promise<boolean> => {
    try {
      const decrypted = await loadEncryptedAppState(key);
      const reconciled = await reconcileAccountState(
        decrypted ? normalizeAppState(decrypted) : null,
        key,
        Boolean(decrypted),
      );
      setApp(reconciled);
      setIsVaultUnlocked(true);
      if (!decrypted) {
        await saveEncryptedAppState(reconciled, key);
      }
      return true;
    } catch (err) {
      console.error('[Datenschutz] Entsperren des Tresors fehlgeschlagen:', err);
      return false;
    }
  }, [setApp, reconcileAccountState]);

  const lockAppVault = React.useCallback(() => {
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
    const vaultKey = getActiveVaultKey();
    if (!vaultKey) {
      console.warn('[Datenschutz] Speichern abgebrochen: Kein aktiver VaultKey im RAM.');
      return;
    }
    try {
      await saveEncryptedAppState(currentAppRef.current, vaultKey);
      await saveEncryptedSessionBackup(currentAppRef.current, vaultKey);
      await pushAccountStateIfReady(currentAppRef.current, vaultKey);
    } catch (e) {
      console.error('[Datenschutz] Fehler beim manuellen Speichern:', e);
    }
  }, [pushAccountStateIfReady]);

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
        klassenvorstand: isKV,
        schueler: [],
        noten: {},
        notenMeta: {},
        notenGewichtung: {},
        lernzielTracker: {},
        studentLernzielBewertungen: {},
        studentLernzielSemesterBewertungen: {},
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
        const currentLoc = prev.currentPage || 'cockpit';
        const forceCockpit = !nextClass.klassenvorstand && ['orga', 'uebergabemappe', 'diagnostik', 'kel'].includes(currentLoc);

        return {
          ...prev,
          currentPage: forceCockpit ? 'cockpit' : currentLoc,
          activeClassId: nextClass.id,
          classes: remainingClasses,
          klassenbezeichnung: nextClass.name,
          stufe: nextClass.stufe,
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
          klassenvorstand: true,
          schueler: [],
          noten: {},
          notenMeta: {},
          notenGewichtung: {},
          lernzielTracker: {},
          studentLernzielBewertungen: {},
          studentLernzielSemesterBewertungen: {},
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
    lockAppVault,
    unlockAppVault,
    accountSyncStatus,
    accountSyncLastAt
  }), [app, notenUpdateTrigger, calculateWidgetFontSize, screenLocked, updateApp, deleteClass, switchClass, addClass, removeClass, updateStudent, deleteStudent, setPage, saveApp, restoreAppData, isVaultUnlocked, lockAppVault, unlockAppVault, accountSyncStatus, accountSyncLastAt]);

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

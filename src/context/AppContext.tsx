import { initialAppState, normalizeAppState, syncActiveClass, switchClassState } from '../lib/appState';
import { commitBackupRestore, validateBackupState } from '../lib/backupRestoreService';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import LZString from 'lz-string';
import localforage from 'localforage';
import { AppState, Student } from '../types';
import { DEFAULT_TAGEPLAN, FAECHER_ALLE, STUNDEN_INFO, DEFAULT_YEARLY_SUBJECTS, DEFAULT_FACH_COLORS } from '../constants';
import { getKW, getCurrentSchuljahr } from '../lib/utils';
import { DEFAULT_HISTORICAL_STUDENTS } from '../data/historicalStudents';
import { notenSyncService } from '../lib/NotenSyncService';
import { DEFAULT_MORNING_WIDGETS } from '../data/morningWidgets';
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
  loadEncryptedAppState,
  saveEncryptedEmergencyBackup,
  saveEncryptedSessionBackup,
  hasLegacyPlaintextData,
} from '../lib/secureStorageService';
import {
  getActiveVaultKey,
  clearActiveVaultSession,
  hasVault,
  subscribeVaultSession,
} from '../lib/vaultStorage';
import { registerActiveAppStateGetter } from '../services/aiService';

localforage.config({
  name: 'LehrerApp',
  storeName: 'app_state'
});

interface AppContextType {

  app: AppState;
  setApp: React.Dispatch<React.SetStateAction<AppState>>;
  updateApp: (changes: Partial<AppState>) => void;
  saveApp: () => void;
  restoreBackup: (state: unknown) => Promise<void>;
  updateStudent: (student: Student) => void;
  deleteStudent: (id: string) => void;
  setPage: (page: string) => void;
  switchClass: (id: string) => void;
  addClass: (name: string, stufe: number, isKV: boolean, targetPage?: string) => void;
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
}

const STORAGE_KEY = 'hehle_v3';
const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const restoringRef = useRef(false);
  const [app, setAppInternal] = useState<AppState>(initialAppState);
  const currentAppRef = useRef<AppState>(app);
  currentAppRef.current = app;

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
            if (decrypted && isMounted) {
              setApp(normalizeAppState(decrypted));
              setIsVaultUnlocked(true);
              setIsLoaded(true);
              return;
            }
          } catch (decErr) {
            console.error('[Datenschutz] Entschlüsselung beim App-Start fehlgeschlagen:', decErr);
          }
          // Falls noch keine verschlüsselten Daten vorliegen, aber Schlüssel im RAM aktiv ist
          if (isMounted) {
            setIsVaultUnlocked(true);
            setIsLoaded(true);
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
  }, [setApp]);

  // Autosave: Verschlüsselt den AppState debounced mit dem aktiven VaultKey im RAM
  useEffect(() => {
    if (!isLoaded || !isVaultUnlocked) return;

    const timeout = setTimeout(async () => {
      try {
        if (restoringRef.current) return;
        const vaultKey = getActiveVaultKey();
        if (!vaultKey) {
          // Ohne aktiven Schlüssel im RAM wird Speichern strikt verweigert (kein unverschlüsselter Fallback!)
          console.warn('[Datenschutz] Autosave pausiert: Kein aktiver VaultKey im RAM.');
          return;
        }

        // 1. Verschlüsselt im Primär- und Fallback-Speicher sichern
        await saveEncryptedAppState(app, vaultKey);

        // 2. Verschlüsseltes Session-Backup
        await saveEncryptedSessionBackup(app, vaultKey);

        // 3. Einmal tägliche verschlüsselte Notfallkopie
        try {
          const todayDate = new Date().toISOString().split('T')[0];
          const lastKopieDate = localStorage.getItem('hehle_v3_notfallkopie_date');
          if (lastKopieDate !== todayDate) {
            await saveEncryptedEmergencyBackup(app, vaultKey);
          }
        } catch (e) {
          console.warn('[Datenschutz] Fehler beim Erstellen der Notfallkopie:', e);
        }
      } catch (e) {
        console.error('[Datenschutz] Fehler beim verschlüsselten Autosave:', e);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [app, isLoaded, isVaultUnlocked]);

  // Tab Close & Refresh Intercept: Ensure synced / pending changes are secured
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isPendingPushRef.current) {
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

  const unlockAppVault = React.useCallback(async (key: CryptoKey): Promise<boolean> => {
    try {
      const decrypted = await loadEncryptedAppState(key);
      if (decrypted) {
        const normalized = normalizeAppState(decrypted);
        const hasExistingClass = Boolean(
          (normalized.classes && normalized.classes.length > 0) ||
          (normalized.klassenbezeichnung && normalized.klassenbezeichnung.trim().length > 0) ||
          (normalized.schueler && normalized.schueler.length > 0)
        );
        if (hasExistingClass) {
          normalized.currentPage = 'dashboard';
          normalized.firstLogin = false;
        } else {
          normalized.currentPage = 'setup';
        }
        setApp(normalized);
        setIsVaultUnlocked(true);
        return true;
      } else {
        // Vault ist neu eingerichtet / leer -> Ersteinrichtung der Klasse
        const emptyState = { ...initialAppState, currentPage: 'setup' };
        setApp(emptyState);
        setIsVaultUnlocked(true);
        await saveEncryptedAppState(emptyState, key);
        return true;
      }
    } catch (err) {
      console.error('[Datenschutz] Entsperren des Tresors fehlgeschlagen:', err);
      return false;
    }
  }, [setApp]);

  const restoreBackup = React.useCallback(async (raw: unknown) => {
    if (restoringRef.current) throw new Error('Eine Wiederherstellung läuft bereits.');
    const key = getActiveVaultKey();
    if (!key) throw new Error('Bitte zuerst den Tresor entsperren.');
    restoringRef.current = true;
    try {
      validateBackupState(raw);
      const next = normalizeAppState(raw);
      // A backup must not reconnect an old remote session or broadcast restored data.
      next.boardSettings = { ...next.boardSettings, activeSyncCode: undefined, isRemoteController: false };
      next.currentPage = 'datensicherung';
      await commitBackupRestore(currentAppRef.current, next, key);
      clearActiveSessionKey();
      activeSessionKeyRef.current = null;
      currentAppRef.current = next;
      setAppInternal(next);
    } finally {
      restoringRef.current = false;
    }
  }, []);

  const lockAppVault = React.useCallback(() => {
    if (restoringRef.current) return;
    clearActiveVaultSession();
    setApp(initialAppState);
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
    } catch (e) {
      console.error('[Datenschutz] Fehler beim manuellen Speichern:', e);
    }
  }, []);

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
    setApp(prev => {
      // 1. Filter schueler
      const updatedSchueler = (prev.schueler || []).filter(s => s.id !== id);

      // 2. Cleanly delete from noten, mitarbeit, karten (without leaving key as undefined)
      const updatedNoten = { ...(prev.noten || {}) };
      delete updatedNoten[id];

      const updatedMitarbeit = { ...(prev.mitarbeit || {}) };
      delete updatedMitarbeit[id];

      const updatedKarten = { ...(prev.karten || {}) };
      delete updatedKarten[id];

      // 3. Cleanly update classes array
      const updatedClasses = (prev.classes || []).map(c => {
        const cNoten = c.noten ? { ...c.noten } : undefined;
        if (cNoten) delete cNoten[id];
        const cMitarbeit = c.mitarbeit ? { ...c.mitarbeit } : undefined;
        if (cMitarbeit) delete cMitarbeit[id];
        const cKarten = c.karten ? { ...c.karten } : undefined;
        if (cKarten) delete cKarten[id];
        return {
          ...c,
          schueler: (c.schueler || []).filter((s: any) => s.id !== id),
          noten: cNoten,
          mitarbeit: cMitarbeit,
          karten: cKarten,
        };
      });

      // 4. Clean up sitzplan_schueler
      const updatedSitzplan = { ...(prev.sitzplan_schueler || {}) };
      delete updatedSitzplan[id];

      // 5. Clean up differenzierungsGruppen
      const updatedDiff = (prev.differenzierungsGruppen || []).map(g => ({
        ...g,
        schuelerIds: (g.schuelerIds || []).filter(sid => sid !== id)
      }));

      // 6. Clean up dienste
      const updatedDienste = (prev.dienste || []).map(d => ({
        ...d,
        schuelerIds: (d.schuelerIds || []).filter(sid => sid !== id)
      }));

      // 7. Clean up notizen & diagnostik
      const updatedNotizen = (prev.notizen || []).filter(n => n.schuelerId !== id);
      const updatedDiagnostik = (prev.diagnostikErhebungen || []).filter(d => d.schuelerId !== id);

      // 8. Clean up wunschpartner / sperrpartner in remaining students
      const cleanSchueler = updatedSchueler.map(s => {
        let changed = false;
        let wp = s.wunschpartner;
        let sp = s.sperrpartner;
        if (wp && wp.includes(id)) {
          wp = wp.filter(pId => pId !== id);
          changed = true;
        }
        if (sp && sp.includes(id)) {
          sp = sp.filter(pId => pId !== id);
          changed = true;
        }
        return changed ? { ...s, wunschpartner: wp, sperrpartner: sp } : s;
      });

      return {
        ...prev,
        schueler: cleanSchueler,
        noten: updatedNoten,
        mitarbeit: updatedMitarbeit,
        karten: updatedKarten,
        classes: updatedClasses,
        sitzplan_schueler: updatedSitzplan,
        differenzierungsGruppen: updatedDiff,
        dienste: updatedDienste,
        notizen: updatedNotizen,
        diagnostikErhebungen: updatedDiagnostik,
        // Immediately navigate back to the student list page
        currentPage: 'schueler',
      };
    });
  }, []);

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
  }, [setApp]);

  const addClass = React.useCallback((name: string, stufe: number, isKV: boolean, targetPage?: string) => {
    const id = 'class-' + Math.random().toString(36).substring(2, 9);
    setApp(prev => {
      const newClass: any = {
        id,
        name,
        stufe,
        klassenvorstand: isKV,
        schueler: [],
        noten: {},
        mitarbeit: {},
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
        klassenglas_count: 0,
        klassenglas_ziel: 20,
        klassenglas_belohnung: 'Gemeinsame Spielzeit',
        klassenkasse: { kontostand: 0, sammlungen: [], transaktionen: [] },
        behavior_status: {},
        behavior_notes: {},
        sue_kontrolle: {},
        sitzplan_schueler: {},
        sitzplan_objekte: [],
        tageplan: DEFAULT_TAGEPLAN,
        faecher: FAECHER_ALLE,
        fachConfig: DEFAULT_FACH_COLORS,
        theme: 'classic_light',
        settings: { ...initialAppState.settings },
        schuljahr: prev.schuljahr || '2024/25'
      };

      // 1. Snapshot current active class back into classes array
      const classes = [...(prev.classes || [])];
      const activeIdx = classes.findIndex(c => c.id === prev.activeClassId);
      
      const currentClassSnapshot = {
        id: prev.activeClassId || 'class-main',
        name: prev.klassenbezeichnung || 'Klasse 1',
        stufe: prev.stufe || 1,
        klassenvorstand: prev.klassenvorstand !== undefined ? prev.klassenvorstand : true,
        schueler: prev.schueler ? JSON.parse(JSON.stringify(prev.schueler)) : [],
        noten: prev.noten ? JSON.parse(JSON.stringify(prev.noten)) : {},
        mitarbeit: prev.mitarbeit ? JSON.parse(JSON.stringify(prev.mitarbeit)) : {},
        verhalten: prev.verhalten ? JSON.parse(JSON.stringify(prev.verhalten)) : {},
        karten: prev.karten ? JSON.parse(JSON.stringify(prev.karten)) : {},
        jahresplanung: prev.jahresplanung ? JSON.parse(JSON.stringify(prev.jahresplanung)) : {},
        jahresplan_faecher: prev.jahresplan_faecher,
        wochenplanung: prev.wochenplanung ? JSON.parse(JSON.stringify(prev.wochenplanung)) : {},
        stammplan: prev.stammplan ? JSON.parse(JSON.stringify(prev.stammplan)) : {},
        anwesenheit: prev.anwesenheit,
        anwesenheitDetail: prev.anwesenheitDetail,
        schuelerStimmung: prev.schuelerStimmung,
        dienste: prev.dienste,
        checklisten: prev.checklisten ? JSON.parse(JSON.stringify(prev.checklisten)) : [],
        customLists: prev.customLists ? JSON.parse(JSON.stringify(prev.customLists)) : [],
        klassenglas_count: prev.klassenglas_count,
        klassenglas_ziel: prev.klassenglas_ziel,
        klassenglas_belohnung: prev.klassenglas_belohnung,
        klassenkasse: prev.klassenkasse,
        behavior_status: prev.behavior_status,
        behavior_notes: prev.behavior_notes,
        sue_kontrolle: prev.sue_kontrolle,
        sitzplan_schueler: prev.sitzplan_schueler,
        sitzplan_objekte: prev.sitzplan_objekte,
        lastGroups: prev.lastGroups,
        stundenZeiten: prev.stundenZeiten,
        tageplan: prev.tageplan ? JSON.parse(JSON.stringify(prev.tageplan)) : undefined,
        faecher: prev.faecher ? [...prev.faecher] : undefined,
        fachConfig: prev.fachConfig ? JSON.parse(JSON.stringify(prev.fachConfig)) : undefined,
        theme: prev.theme,
        customBgColor: prev.customBgColor,
        customAccentColor: prev.customAccentColor,
        customTextColor: prev.customTextColor,
        customText2Color: prev.customText2Color,
        settings: prev.settings ? JSON.parse(JSON.stringify(prev.settings)) : undefined,
        schuljahr: prev.schuljahr
      };

      if (activeIdx !== -1) {
        classes[activeIdx] = currentClassSnapshot;
      } else if (prev.klassenbezeichnung) {
        classes.push(currentClassSnapshot);
      }

      // 2. Add new class and switch immediately to it with currentPage preserved (defaulting to dashboard)
      return {
        ...prev,
        currentPage: targetPage || prev.currentPage || 'dashboard',
        saAssessments: {},
        scheduleAnalysis: undefined,
        klassenglas_missions: undefined,
        klassenglas_completed_missions: [],
        activeClassId: id,
        classes: [...classes, newClass],
        klassenbezeichnung: newClass.name,
        stufe: newClass.stufe,
        klassenvorstand: newClass.klassenvorstand,
        schueler: newClass.schueler ? JSON.parse(JSON.stringify(newClass.schueler)) : [],
        noten: newClass.noten,
        mitarbeit: newClass.mitarbeit,
        verhalten: newClass.verhalten,
        karten: newClass.karten,
        jahresplanung: newClass.jahresplanung,
        jahresplan_faecher: newClass.jahresplan_faecher,
        wochenplanung: newClass.wochenplanung ? JSON.parse(JSON.stringify(newClass.wochenplanung)) : {},
        stammplan: newClass.stammplan ? JSON.parse(JSON.stringify(newClass.stammplan)) : {},
        anwesenheit: newClass.anwesenheit,
        anwesenheitDetail: newClass.anwesenheitDetail,
        schuelerStimmung: newClass.schuelerStimmung || {},
        dienste: newClass.dienste,
        checklisten: [],
        customLists: [],
        klassenglas_count: newClass.klassenglas_count,
        klassenglas_ziel: newClass.klassenglas_ziel,
        klassenglas_belohnung: newClass.klassenglas_belohnung || 'Gemeinsame Spielzeit',
        klassenkasse: newClass.klassenkasse,
        behavior_status: newClass.behavior_status,
        behavior_notes: newClass.behavior_notes,
        sue_kontrolle: newClass.sue_kontrolle,
        sitzplan_schueler: newClass.sitzplan_schueler,
        sitzplan_objekte: newClass.sitzplan_objekte,
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
      const cleanNotes = (prev.notes || []).filter(n => !n.id || (!deletedStudentIds.has(n.id) && !deletedStudentIds.has(n.schuelerId)));
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

      const cleanLernzielTracker = filterStudentMap(prev.lernzielTracker);
      const cleanLernzielSemesterBewertungen = filterStudentMap(prev.studentLernzielSemesterBewertungen);

      // If other classes are remaining:
      if (remainingClasses.length > 0) {
        if (prev.activeClassId !== idToDelete) {
          return {
            ...prev,
            classes: remainingClasses,
            notes: cleanNotes,
            differenzierungsGruppen: cleanDiffGruppen,
            diagnostikErgebnisse: cleanDiagnostikErgebnisse,
            diagnostikErhebungen: cleanDiagnostikErhebungen,
            diagnosticResults: cleanDiagnosticResults,
            ikmRecords: cleanIkmRecords,
            stimmNotizen: cleanStimmNotizen,
            interaktionsLog: cleanInteraktionsLog,
            lernzielTracker: cleanLernzielTracker,
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
          saAssessments: nextClass.saAssessments ? structuredClone(nextClass.saAssessments) : {},
          scheduleAnalysis: nextClass.scheduleAnalysis ? structuredClone(nextClass.scheduleAnalysis) : undefined,
          activeClassId: nextClass.id,
          classes: remainingClasses,
          klassenbezeichnung: nextClass.name,
          stufe: nextClass.stufe,
          klassenvorstand: nextClass.klassenvorstand,
          schuljahr: nextClass.schuljahr || prev.schuljahr || getCurrentSchuljahr(),
          schueler: nextClass.schueler ? JSON.parse(JSON.stringify(nextClass.schueler)) : [],
          noten: nextClass.noten || {},
          mitarbeit: nextClass.mitarbeit || {},
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
          klassenglas_count: nextClass.klassenglas_count || 0,
          klassenglas_ziel: nextClass.klassenglas_ziel || 20,
          klassenglas_belohnung: nextClass.klassenglas_belohnung || 'Gemeinsame Spielzeit',
          klassenglas_missions: nextClass.klassenglas_missions || [],
          klassenglas_completed_missions: nextClass.klassenglas_completed_missions || [],
          klassenkasse: nextClass.klassenkasse || { kontostand: 0, sammlungen: [], transaktionen: [] },
          behavior_status: nextClass.behavior_status || {},
          behavior_notes: nextClass.behavior_notes || {},
          sue_kontrolle: nextClass.sue_kontrolle || {},
          sitzplan_schueler: nextClass.sitzplan_schueler || {},
          sitzplan_objekte: nextClass.sitzplan_objekte || [],
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
          notes: cleanNotes,
          differenzierungsGruppen: cleanDiffGruppen,
          diagnostikErgebnisse: cleanDiagnostikErgebnisse,
          diagnostikErhebungen: cleanDiagnostikErhebungen,
          diagnosticResults: cleanDiagnosticResults,
          ikmRecords: cleanIkmRecords,
          stimmNotizen: cleanStimmNotizen,
          interaktionsLog: cleanInteraktionsLog,
          lernzielTracker: cleanLernzielTracker,
          studentLernzielSemesterBewertungen: cleanLernzielSemesterBewertungen
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
          mitarbeit: {},
          verhalten: {},
          karten: {},
          jahresplanung: {},
          jahresplan_faecher: DEFAULT_YEARLY_SUBJECTS,
          wochenplanung: {},
          stammplan: {},
          anwesenheit: {},
          anwesenheitDetail: {},
          dienste: [],
          saAssessments: {},
          klassenglas_count: 0,
          klassenglas_ziel: 20,
          klassenglas_belohnung: 'Gemeinsame Spielzeit',
          klassenglas_missions: [],
          klassenglas_completed_missions: [],
          klassenkasse: { kontostand: 0, sammlungen: [], transaktionen: [] },
          behavior_status: {},
          behavior_notes: {},
          sue_kontrolle: {},
          sitzplan_schueler: {},
          sitzplan_objekte: [],
          lastGroups: undefined,
          stundenZeiten: STUNDEN_INFO,
          tageplan: DEFAULT_TAGEPLAN,
          notes: cleanNotes,
          differenzierungsGruppen: cleanDiffGruppen,
          diagnostikErgebnisse: cleanDiagnostikErgebnisse,
          diagnostikErhebungen: cleanDiagnostikErhebungen,
          diagnosticResults: cleanDiagnosticResults,
          ikmRecords: cleanIkmRecords,
          stimmNotizen: cleanStimmNotizen,
          interaktionsLog: cleanInteraktionsLog,
          lernzielTracker: cleanLernzielTracker,
          studentLernzielSemesterBewertungen: cleanLernzielSemesterBewertungen,
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
    restoreBackup,
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
    unlockAppVault
  }), [app, notenUpdateTrigger, calculateWidgetFontSize, screenLocked, updateApp, deleteClass, switchClass, addClass, removeClass, updateStudent, deleteStudent, setPage, saveApp, restoreBackup, isVaultUnlocked, lockAppVault, unlockAppVault]);

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
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

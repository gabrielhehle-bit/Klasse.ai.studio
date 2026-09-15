import localforage from 'localforage';
import React, { useRef, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Download, Upload, Shield, Database, AlertCircle, CheckCircle2, Monitor, Loader2, Trash2, Clock, FileJson, AlertTriangle, Archive, RotateCcw, Cloud, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LAST_BACKUP_TIMESTAMP_KEY, markBackupCompleted, triggerBackupDownload } from '../utils/backupUtils';
import { createEncryptedBackup } from '../lib/backupCryptoService';
import { clearActiveVaultSession, deleteVaultRecord, getActiveVaultKey, getActiveVaultRecord, loadVaultRecord } from '../lib/vaultStorage';
import { prepareBackupRestore, parseBackupText } from '../lib/backupRestore';
import { ONEDRIVE_BACKUP_PRIMARY_NAME } from '../lib/cloudBackupNames';
import { clearTrustedDeviceUnlock } from '../lib/trustedDeviceVault';
import { syncActiveClass, switchClassState } from '../lib/appState';

function formatBackupMoment(timestamp: number, label = 'Zuletzt gesichert'): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Noch keine Sicherung erfasst';
  return `${label}: ${date.toLocaleString('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export default function Backup() {
  const { app, setApp, restoreAppData } = useApp();

  const handleRetireActiveClass = () => {
    const activeClasses = app.classes || [];
    if (activeClasses.length <= 1) {
      alert('Lege bitte zuerst eine neue aktive Klasse an. Mindestens eine Klasse muss aktiv bleiben.');
      return;
    }

    if (!confirm(
      'Aktive Klasse aus der Klassenliste stilllegen? Sie bleibt vollständig erhalten und kann hier später wiederhergestellt werden. Dies erstellt keinen Jahresarchivstand.'
    )) return;

    setApp((prev) => {
      const synced = syncActiveClass(prev);
      const classes = synced.classes || [];
      const activeClass = classes.find((item) => item.id === synced.activeClassId);
      if (!activeClass || classes.length <= 1) return prev;

      const remainingClasses = classes.filter((item) => item.id !== synced.activeClassId);
      const retiredClasses = [
        ...(synced.retiredClasses || []).filter((item) => item.id !== activeClass.id),
        JSON.parse(JSON.stringify(activeClass)),
      ];

      const switched = switchClassState(
        {
          ...synced,
          classes: remainingClasses,
          retiredClasses,
        },
        remainingClasses[0].id
      );

      return {
        ...switched,
        retiredClasses,
      };
    });
  };

  const handleRestoreRetiredClass = (classId: string) => {
    setApp((prev) => {
      const retiredClasses = prev.retiredClasses || [];
      const retiredClass = retiredClasses.find((item) => item.id === classId);
      if (!retiredClass) return prev;
      if ((prev.classes || []).some((item) => item.id === classId)) {
        alert('Eine aktive Klasse mit derselben ID ist bereits vorhanden.');
        return prev;
      }

      return {
        ...prev,
        retiredClasses: retiredClasses.filter((item) => item.id !== classId),
        classes: [...(prev.classes || []), JSON.parse(JSON.stringify(retiredClass))],
      };
    });
  };

  const handleDeleteRetiredClass = (classId: string) => {
    if (!confirm(
      'Diese stillgelegte Klasse wirklich unwiderruflich aus dem aktuellen Datenbestand löschen? Erstellen Sie vorher bei Bedarf eine Datensicherung.'
    )) return;

    setApp((prev) => ({
      ...prev,
      retiredClasses: (prev.retiredClasses || []).filter((item) => item.id !== classId),
    }));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [usedMB, setUsedMB] = useState(0);
  const [quotaMB, setQuotaMB] = useState<number | null>(null);
  const [percentage, setPercentage] = useState(0);
  
  // Custom states for interactive feedback
  const [backupStatus, setBackupStatus] = useState<'idle' | 'exporting' | 'success'>('idle');
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success'>('idle');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [lastBackupStr, setLastBackupStr] = useState('Noch keine lokale Sicherung erfasst');

  // Browser storage estimate includes IndexedDB, Cache Storage and localStorage where supported.
  useEffect(() => {
    let cancelled = false;
    const updateStorageEstimate = async () => {
      try {
        if (!navigator.storage?.estimate) {
          if (!cancelled) {
            setUsedMB(0);
            setQuotaMB(null);
            setPercentage(0);
          }
          return;
        }
        const estimate = await navigator.storage.estimate();
        if (cancelled) return;
        const usage = estimate.usage ?? 0;
        const quota = estimate.quota ?? 0;
        setUsedMB(Number((usage / (1024 * 1024)).toFixed(2)));
        setQuotaMB(quota > 0 ? Number((quota / (1024 * 1024)).toFixed(0)) : null);
        setPercentage(quota > 0 ? Math.min(100, (usage / quota) * 100) : 0);
      } catch {
        if (!cancelled) {
          setUsedMB(0);
          setQuotaMB(null);
          setPercentage(0);
        }
      }
    };
    void updateStorageEstimate();
    return () => { cancelled = true; };
  }, [app]);

  useEffect(() => {
    const savedTimestamp = Number(localStorage.getItem(LAST_BACKUP_TIMESTAMP_KEY));
    if (Number.isFinite(savedTimestamp) && savedTimestamp > 0) {
      setLastBackupStr(formatBackupMoment(savedTimestamp));
      return;
    }
    // Read-only migration hint for older builds; a new backup replaces this with a real timestamp.
    const legacyLabel = localStorage.getItem('lehrkraft_last_backup_time');
    if (legacyLabel) setLastBackupStr(legacyLabel);
  }, []);

  // Animated backup trigger with client-side encryption
  const handleExport = async () => {
    if (backupStatus !== 'idle') return;
    setBackupStatus('exporting');
    
    try {
      await triggerBackupDownload(app);
      
      const completedAt = Number(localStorage.getItem(LAST_BACKUP_TIMESTAMP_KEY)) || Date.now();
      setLastBackupStr(formatBackupMoment(completedAt));
      
      setBackupStatus('success');
      setTimeout(() => setBackupStatus('idle'), 3000);
    } catch (err: any) {
      console.error(err);
      setBackupStatus('idle');
      alert(err?.message || 'Fehler beim Exportieren der Daten.');
    }
  };

  const processFile = (file: File) => {
    setImportStatus('importing');
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedData = parseBackupText(String(e.target?.result || ''));
        const key = getActiveVaultKey();
        if (!key) throw new Error('Bitte zuerst den lokalen Tresor entsperren.');
        const targetData = await prepareBackupRestore(importedData, key, () => prompt(
          'Bitte gib das Tresor-Passwort oder den Recovery-Code dieses Backups ein. Dein lokales Tresor-Passwort bleibt unverändert.'
        ));
        if (!targetData) { setImportStatus('idle'); return; }

        const shouldReplace = confirm(
          'Diese Sicherung ersetzt den aktuellen lokalen Datenbestand vollständig. Nicht gesicherte Änderungen gehen verloren. Möchten Sie den Import wirklich fortsetzen?'
        );
        if (!shouldReplace) {
          setImportStatus('idle');
          return;
        }

        await restoreAppData(targetData);

        setImportStatus('success');
        setTimeout(() => setImportStatus('idle'), 1500);

      } catch (err: any) {
        console.error('Import error:', err);
        setImportStatus('idle');
        alert('Fehler beim Importieren: ' + (err instanceof Error ? err.message : 'Die Datei ist ungültig oder beschädigt.'));
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  // Safe reset routine: remove data stores before deleting the vault metadata.
  // This avoids leaving encrypted app data behind after its recovery metadata has already been removed.
  const executeAbsoluteReset = async () => {
    if (deleteConfirmText !== 'LÖSCHEN') return;
    setDeleteModalOpen(false);

    try {
      await clearTrustedDeviceUnlock();
    } catch (error) {
      console.error('Gerätevertrauen konnte beim Werksreset nicht gelöscht werden', error);
      alert('Der Werksreset wurde abgebrochen: Gerätevertrauen konnte nicht vollständig gelöscht werden. Bitte versuche den Reset erneut.');
      return;
    }

    try {
      await localforage.clear();
    } catch (error) {
      console.error('Lokaler App-Speicher konnte beim Werksreset nicht gelöscht werden', error);
      alert('Der Werksreset wurde abgebrochen: Der lokale App-Speicher konnte nicht vollständig gelöscht werden. Bitte versuche den Reset erneut.');
      return;
    }

    try {
      localStorage.clear();
    } catch (error) {
      console.error('Browser-Fallback konnte beim Werksreset nicht gelöscht werden', error);
      alert('Der Werksreset wurde abgebrochen: Der Browser-Fallback konnte nicht vollständig gelöscht werden. Bitte versuche den Reset erneut.');
      return;
    }

    try {
      sessionStorage.clear();
    } catch (error) {
      console.error('Sitzungsspeicher konnte beim Werksreset nicht gelöscht werden', error);
      alert('Der Werksreset wurde abgebrochen: Der Sitzungsspeicher konnte nicht vollständig gelöscht werden. Bitte versuche den Reset erneut.');
      return;
    }

    // Delete vault metadata last. If this step fails, no encrypted pupil/app state is left behind.
    try {
      await deleteVaultRecord();
    } catch (error) {
      console.error('Tresor-Metadaten konnten beim Werksreset nicht gelöscht werden', error);
      alert('Der Werksreset wurde abgebrochen: Die Tresor-Metadaten konnten nicht vollständig gelöscht werden. Bitte versuche den Reset erneut.');
      return;
    }

    clearActiveVaultSession();
    window.location.reload();
  };

  // --- OneDrive Synchronisations-Logik ---
  const [isOneDriveConfigured, setIsOneDriveConfigured] = useState<boolean | null>(null);
  const [showOneDriveFaq, setShowOneDriveFaq] = useState<boolean>(true);
  const [activeAdminTab, setActiveAdminTab] = useState<'entra' | 'intune' | 'dsgvo'>('entra');
  const [copiedRedirectUri, setCopiedRedirectUri] = useState<boolean>(false);
  const [isOneDriveConnected, setIsOneDriveConnected] = useState<boolean>(false);
  const [oneDriveToken, setOneDriveToken] = useState<any>(null);
  const [cloudBackupMetadata, setCloudBackupMetadata] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'uploading' | 'downloading' | 'success' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string>('');

  useEffect(() => {
    // 1. Prüfen, ob OneDrive serverseitig konfiguriert ist
    fetch('/api/onedrive/auth-url')
      .then(res => res.json())
      .then(data => {
        setIsOneDriveConfigured(!!data.configured);
      })
      .catch(err => {
        console.error('Fehler bei der OneDrive-Konfigurationsprüfung:', err);
        setIsOneDriveConfigured(false);
      });

    // 2. Token aus sessionStorage (oder Legacy localStorage) laden
    const savedTokenStr = sessionStorage.getItem('onedrive_token') || localStorage.getItem('onedrive_token');
    if (savedTokenStr) {
      try {
        const token = JSON.parse(savedTokenStr);
        setOneDriveToken(token);
        setIsOneDriveConnected(true);
        // Sichere Migration in sessionStorage und Löschen aus ungeschütztem localStorage
        sessionStorage.setItem('onedrive_token', savedTokenStr);
        localStorage.removeItem('onedrive_token');
      } catch (e) {
        sessionStorage.removeItem('onedrive_token');
        localStorage.removeItem('onedrive_token');
      }
    }
  }, []);

  const getValidToken = async (tokenObj: any): Promise<string | null> => {
    if (!tokenObj || !tokenObj.access_token) return null;
    
    // Prüfen, ob das Token abgelaufen ist oder in Kürze abläuft (1 Minute Puffer)
    const now = Date.now();
    if (tokenObj.expires_at && now < tokenObj.expires_at - 60000) {
      return tokenObj.access_token;
    }

    // Refresh-Token verwenden, um ein neues Access-Token anzufordern
    if (!tokenObj.refresh_token) return null;

    try {
      const res = await fetch('/api/onedrive/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: tokenObj.refresh_token })
      });

      if (!res.ok) {
        throw new Error('Token-Aktualisierung fehlgeschlagen');
      }

      const newTokenData = await res.json();
      sessionStorage.setItem('onedrive_token', JSON.stringify(newTokenData));
      setOneDriveToken(newTokenData);
      return newTokenData.access_token;
    } catch (err) {
      console.error('Aktualisierung des OneDrive-Tokens fehlgeschlagen, Verbindung wird getrennt:', err);
      handleDisconnect();
      return null;
    }
  };

  const fetchMetadata = async (tokenObj = oneDriveToken) => {
    const token = await getValidToken(tokenObj);
    if (!token) return;

    try {
      const res = await fetch('/api/onedrive/metadata', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCloudBackupMetadata(data);
      } else {
        setCloudBackupMetadata({ exists: false });
      }
    } catch (e) {
      console.error('Fehler beim Abrufen der OneDrive-Metadaten:', e);
      setCloudBackupMetadata({ exists: false });
    }
  };

  useEffect(() => {
    if (oneDriveToken) {
      fetchMetadata(oneDriveToken);
    } else {
      setCloudBackupMetadata(null);
    }
  }, [oneDriveToken]);

  const handleConnect = async () => {
    try {
      const res = await fetch('/api/onedrive/auth-url');
      const data = await res.json();
      if (!data.configured || !data.url) {
        alert('OneDrive-Synchronisation ist serverseitig nicht konfiguriert.');
        return;
      }

      // OAuth-Popup öffnen
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        data.url,
        'OneDrive Login',
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
      );

      // Listener für PostMessage vom Callback-Endpunkt
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin || !popup || event.source !== popup) return;
        if (event.data?.type === 'ONEDRIVE_AUTH_SUCCESS') {
          const tokenData = event.data.tokenData;
          sessionStorage.setItem('onedrive_token', JSON.stringify(tokenData));
          setOneDriveToken(tokenData);
          setIsOneDriveConnected(true);
          setSyncStatus('idle');
          window.removeEventListener('message', handleMessage);
        } else if (event.data?.type === 'ONEDRIVE_AUTH_ERROR') {
          alert(`OneDrive Verbindung fehlgeschlagen: ${event.data.error}`);
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);

      // Falls das Popup manuell geschlossen wird
      const checkInterval = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkInterval);
          window.removeEventListener('message', handleMessage);
        }
      }, 1000);

    } catch (err) {
      console.error('Fehler beim Starten der OneDrive-Verbindung:', err);
      alert('OneDrive Login konnte nicht gestartet werden.');
    }
  };

  const handleDisconnect = () => {
    sessionStorage.removeItem('onedrive_token');
    localStorage.removeItem('onedrive_token');
    setOneDriveToken(null);
    setIsOneDriveConnected(false);
    setCloudBackupMetadata(null);
    setSyncStatus('idle');
  };

  const handleUploadToOneDrive = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatus('uploading');
    setSyncError('');

    try {
      const token = await getValidToken(oneDriveToken);
      if (!token) {
        throw new Error('Nicht bei OneDrive angemeldet oder Sitzung abgelaufen.');
      }

      const vaultKey = getActiveVaultKey();
      let vaultRecord = getActiveVaultRecord();
      if (!vaultRecord) {
        vaultRecord = await loadVaultRecord();
      }

      if (!vaultKey || !vaultRecord) {
        throw new Error('Sicherer Tresor muss vor der Cloud-Sicherung eingerichtet sein.');
      }

      // Zero-Knowledge Verschlüsselung vor Verlassen des Browsers
      const encryptedBackup = await createEncryptedBackup(syncActiveClass(app), vaultKey, vaultRecord);

      const res = await fetch('/api/onedrive/upload', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(encryptedBackup)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP-Status: ${res.status}`);
      }

      setSyncStatus('success');
      await fetchMetadata();
      
      const completedAt = Date.now();
      markBackupCompleted(completedAt);
      setLastBackupStr(formatBackupMoment(completedAt, 'Zuletzt in OneDrive gesichert'));

      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err: any) {
      console.error('OneDrive Upload-Fehler:', err);
      setSyncStatus('error');
      setSyncError(err.message || 'Unbekannter Fehler beim Cloud-Upload.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadFromOneDrive = async () => {
    if (isSyncing) return;
    if (!confirm('Möchten Sie die Sicherung von OneDrive wirklich laden? Alle nicht gesicherten lokalen Änderungen in dieser App-Installation werden überschrieben.')) {
      return;
    }

    setIsSyncing(true);
    setSyncStatus('downloading');
    setSyncError('');

    try {
      const token = await getValidToken(oneDriveToken);
      if (!token) {
        throw new Error('Nicht bei OneDrive angemeldet oder Sitzung abgelaufen.');
      }

      const res = await fetch('/api/onedrive/download', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Keine Sicherungsdatei auf OneDrive gefunden.');
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP-Status: ${res.status}`);
      }

      const importedData = await res.json();
      if (typeof importedData !== 'object' || importedData === null) {
        throw new Error('Ungültiges Datenformat von OneDrive empfangen.');
      }

      const key = getActiveVaultKey();
      if (!key) throw new Error('Bitte zuerst den lokalen Tresor entsperren.');
      const targetData = await prepareBackupRestore(importedData, key, () => prompt(
        'Bitte gib das Tresor-Passwort oder den Recovery-Code dieses Backups ein. Dein lokales Tresor-Passwort bleibt unverändert.'
      ));
      if (!targetData) { setSyncStatus('idle'); return; }
      await restoreAppData(targetData);

      setSyncStatus('success');
      
      setLastBackupStr(formatBackupMoment(Date.now(), 'Zuletzt aus OneDrive wiederhergestellt'));

      setTimeout(() => setSyncStatus('idle'), 1500);

    } catch (err: any) {
      console.error('OneDrive Download-Fehler:', err);
      setSyncStatus('error');
      setSyncError(err.message || 'Fehler beim Herunterladen von OneDrive.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="py-4 max-w-4xl mx-auto flex flex-col gap-6">
      {/* Title & Core Status Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-stone-200/60 shadow-sm shrink-0">
        <div>
          <h2 className="text-[1.875rem] leading-tight font-black text-slate-900 tracking-tight">Datensicherung & Import</h2>
          <p className="text-slate-500 font-medium tracking-tight">Lokale Sandbox-Daten verwalten, herunterladen oder rückspielen.</p>
        </div>
        
        {/* Dynamic Timestamp Panel - Typografisch überlegen abgesetzt */}
        <div className="flex items-center gap-2.5 bg-amber-50/50 border border-amber-200/50 px-4 py-2.5 rounded-2xl shrink-0 w-full md:w-auto">
          <Clock size={16} className="text-amber-600 animate-pulse" />
          <div>
            <p className="text-[0.5625rem] font-black uppercase tracking-wider text-amber-700 leading-none">Backup-Status</p>
            <p className="text-[0.75rem] font-black text-slate-900 mt-1 leading-tight">{lastBackupStr}</p>
          </div>
        </div>
      </div>

      {/* --- OneDrive Synchronisations-Panel --- */}
      <div className="order-3 bg-white p-6 rounded-3xl border border-stone-200/60 shadow-sm space-y-5 flex flex-col relative group">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center shadow-inner">
              <Cloud size={28} />
            </div>
            <div>
              <h3 className="text-[1.25rem] leading-normal font-black text-slate-900">OneDrive Cloud-Synchronisation</h3>
              <p className="text-[0.8125rem] text-slate-500 font-medium">Speichern oder laden Sie eine Sicherungsdatei über ein verbundenes Microsoft-OneDrive-Konto.</p>
            </div>
          </div>
          {isOneDriveConnected && (
            <button 
              onClick={handleDisconnect}
              className="flex items-center gap-1.5 text-[0.6875rem] font-black text-rose-600 uppercase tracking-wider hover:text-rose-700 transition-colors cursor-pointer"
            >
              <LogOut size={14} />
              Trennen
            </button>
          )}
        </div>

        {isOneDriveConfigured === null ? (
          <div className="flex items-center justify-center py-6 gap-2">
            <Loader2 size={18} className="animate-spin text-slate-400" />
            <span className="text-slate-500 text-sm font-semibold">Prüfe Synchronisations-Status...</span>
          </div>
        ) : !isOneDriveConfigured ? (
          <div className="bg-sky-50/70 p-5 rounded-2xl border border-sky-200/70 space-y-4">
            <div className="flex gap-3">
              <Cloud size={20} className="text-sky-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[0.8125rem] font-black text-slate-900">Cloud-Sicherung noch nicht eingerichtet</h4>
                <p className="text-[0.75rem] text-slate-500 font-medium leading-relaxed mt-1">
                  Verwenden Sie bis dahin die lokale Sicherungsdatei oben. Die technische Einrichtung für M365 OneDrive & Intune erfolgt zentral durch die Schulinformatik / IT-Administration.
                </p>
              </div>
            </div>
            
            {/* Quick Env Variable Setup Banner */}
            <div className="bg-white p-4 rounded-2xl border border-sky-150 text-[0.75rem] space-y-2.5 text-slate-700 shadow-sm">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <span>🔑</span>
                <span>Infrastruktur-Aktivierung am Klassio-Server (Umgebungsvariablen):</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Variable 1</span>
                  <span className="font-bold text-violet-700">MICROSOFT_CLIENT_ID</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Variable 2</span>
                  <span className="font-bold text-violet-700">MICROSOFT_CLIENT_SECRET</span>
                </div>
              </div>
            </div>

            {/* IT Admin & Intune Deployment Documentation Box */}
            <div className="border border-sky-200/90 rounded-2xl bg-white overflow-hidden shadow-sm transition-all">
              <button
                type="button"
                aria-expanded={showOneDriveFaq}
                aria-controls="onedrive-datenschutz-hilfe"
                onClick={() => setShowOneDriveFaq(!showOneDriveFaq)}
                className="w-full px-4 py-3.5 bg-gradient-to-r from-sky-50 to-indigo-50/50 hover:from-sky-100 hover:to-indigo-100/50 transition-colors flex items-center justify-between text-left cursor-pointer border-b border-sky-100"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">🛠️</span>
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">IT-Administrator Anleitung: Intune, Entra ID & DSGVO</span>
                </div>
                <span className="text-xs font-bold text-sky-700 bg-sky-100 px-2.5 py-1 rounded-full">
                  {showOneDriveFaq ? 'Anleitung einklappen ▲' : 'Anleitung ausklappen ▼'}
                </span>
              </button>

              {showOneDriveFaq && (
                <div id="onedrive-datenschutz-hilfe" className="p-5 space-y-5 text-slate-600 text-xs border-t border-slate-100 leading-relaxed bg-white">

                  {/* Admin Tab Navigation */}
                  <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setActiveAdminTab('entra')}
                      className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg font-bold text-[0.6875rem] transition-all cursor-pointer ${
                        activeAdminTab === 'entra'
                          ? 'bg-white text-sky-800 shadow-sm font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      1. Microsoft Entra ID (Azure)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveAdminTab('intune')}
                      className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg font-bold text-[0.6875rem] transition-all cursor-pointer ${
                        activeAdminTab === 'intune'
                          ? 'bg-white text-sky-800 shadow-sm font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      2. Microsoft Intune (MDM)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveAdminTab('dsgvo')}
                      className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg font-bold text-[0.6875rem] transition-all cursor-pointer ${
                        activeAdminTab === 'dsgvo'
                          ? 'bg-white text-sky-800 shadow-sm font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      3. Datenschutz & DSGVO
                    </button>
                  </div>

                  {/* TAB 1: Entra ID Setup */}
                  {activeAdminTab === 'entra' && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="bg-sky-50/50 p-3.5 rounded-xl border border-sky-100 space-y-1">
                        <h5 className="font-black text-sky-900 text-[0.75rem] flex items-center gap-1.5">
                          <span>🌐</span>
                          <span>Entra ID App-Registrierung im Microsoft 365 Tenant</span>
                        </h5>
                        <p className="text-slate-600 font-medium text-[11px]">
                          Erstellen Sie eine App-Registrierung in der Microsoft Entra Admin-Konsole Ihrer Schule, damit Lehrkräfte Sicherungen in ihrem persönlichen Dienst-OneDrive ablegen können.
                        </p>
                      </div>

                      <ol className="list-decimal list-inside space-y-2.5 pl-1 text-slate-600 font-medium">
                        <li>
                          Melden Sie sich im <a href="https://entra.microsoft.com" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline font-bold">Microsoft Entra Admin Center</a> oder <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline font-bold">Azure Portal</a> mit Ihren Schul-Admin-Anmeldedaten an.
                        </li>
                        <li>
                          Navigieren Sie zu <strong>Identität → Anwendungen → App-Registrierungen</strong> und wählen Sie <strong>Neue Registrierung</strong>.
                        </li>
                        <li>
                          Geben Sie einen Anzeigenamen ein (z. B. <em>„Klassio OneDrive Sync“</em>).
                        </li>
                        <li>
                          Wählen Sie den Kontotyp:
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono text-[10px] text-slate-700 my-1 font-bold">
                            Konten in diesem Organisationsverzeichnis (nur M365 Schul-Tenant) ODER Multitenant
                          </div>
                        </li>
                        <li>
                          Wählen Sie unter <strong>Umleitungs-URI (Redirect URI)</strong> die Plattform <code className="bg-slate-100 px-1 py-0.5 rounded text-sky-700 font-bold">Web</code> und fügen Sie diese URL ein:
                          <div className="flex items-center gap-2 bg-slate-900 text-sky-300 p-2.5 rounded-xl font-mono text-[11px] my-1.5 overflow-x-auto">
                            <span className="flex-1 select-all">{window.location.origin}/api/onedrive/callback</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/api/onedrive/callback`);
                                setCopiedRedirectUri(true);
                                setTimeout(() => setCopiedRedirectUri(false), 2000);
                              }}
                              className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-[10px] font-sans font-bold cursor-pointer shrink-0"
                            >
                              {copiedRedirectUri ? '✓ Kopiert' : 'Kopieren'}
                            </button>
                          </div>
                        </li>
                        <li>
                          Gehen Sie auf <strong>API-Berechtigungen → Berechtigung hinzufügen → Microsoft Graph → Delegierte Berechtigungen</strong>:
                          <div className="flex flex-wrap gap-1.5 my-1">
                            <span className="bg-sky-100 text-sky-800 font-mono px-2 py-0.5 rounded text-[10px] font-bold border border-sky-200">Files.ReadWrite</span>
                            <span className="bg-sky-100 text-sky-800 font-mono px-2 py-0.5 rounded text-[10px] font-bold border border-sky-200">offline_access</span>
                          </div>
                        </li>
                        <li>
                          Klicken Sie anschließend auf <strong>„Administratorzustimmung für [Schul-Tenant] erteilen“</strong>, damit Lehrkräfte bei der ersten Anmeldung keine Administrator-Einwilligung anfordern müssen.
                        </li>
                        <li>
                          Erstellen Sie unter <strong>Zertifikate & Geheimnisse</strong> einen <strong>Neuen geheimen Clientschlüssel</strong> (Client Secret). Kopieren Sie den <em>Wert</em> (Value).
                        </li>
                        <li>
                          Tragen Sie die <strong>Anwendungs-ID (Client ID)</strong> als <code className="bg-slate-100 px-1 py-0.5 rounded text-violet-700 font-bold">MICROSOFT_CLIENT_ID</code> und das Secret als <code className="bg-slate-100 px-1 py-0.5 rounded text-violet-700 font-bold">MICROSOFT_CLIENT_SECRET</code> in den Server-Umgebungsvariablen ein.
                        </li>
                      </ol>
                    </div>
                  )}

                  {/* TAB 2: Intune Deployment */}
                  {activeAdminTab === 'intune' && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100 space-y-1">
                        <h5 className="font-black text-indigo-950 text-[0.75rem] flex items-center gap-1.5">
                          <span>📱</span>
                          <span>Verteilung & Steuerung über Microsoft Intune (MDM / MAM)</span>
                        </h5>
                        <p className="text-slate-600 font-medium text-[11px]">
                          Verteilen Sie die Klassio auf schulische iPads, MacBooks und Windows-Dienstgeräte Ihrer Lehrkräfte mit integrierter M365-Anmeldung.
                        </p>
                      </div>

                      <div className="space-y-3 text-slate-600 font-medium">
                        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60 space-y-1.5">
                          <h6 className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                            <span className="text-indigo-600">1.</span> Web-App Paketierung in Intune (iOS / iPadOS / Windows / macOS)
                          </h6>
                          <p className="text-[11px]">
                            Öffnen Sie <a href="https://intune.microsoft.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-bold">intune.microsoft.com</a> → <strong>Apps → Alle Apps → Hinzufügen</strong>:
                          </p>
                          <ul className="list-disc list-inside space-y-1 pl-2 text-[11px]">
                            <li><strong>iOS / iPadOS:</strong> App-Typ <em>Web-Link</em> wählen, Ziel-URL eintragen & Icon hinzufügen. Als <em>Erforderlich</em> auf Lehrkräfte-Gerätegruppen zuweisen.</li>
                            <li><strong>Windows / macOS:</strong> Microsoft Edge App / PWA Verteilungsrichtlinie oder Verknüpfung auf dem Arbeitsplatz-Desktop zuweisen.</li>
                          </ul>
                        </div>

                        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60 space-y-1.5">
                          <h6 className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                            <span className="text-indigo-600">2.</span> Single Sign-On (SSO) & Edge Enterprise Policies
                          </h6>
                          <p className="text-[11px]">
                            Konfigurieren Sie unter <strong>Geräte → Konfigurationsprofile</strong> eine Microsoft Edge Einstellungs-Richtlinie:
                          </p>
                          <ul className="list-disc list-inside space-y-1 pl-2 text-[11px]">
                            <li><code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">ConfigureOnPremisesAccountAutoImport</code> = Automatisch mit M365-Schulkonto anmelden.</li>
                            <li><code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">PopupsAllowedForUrls</code> = <span className="font-mono text-sky-700">{window.location.origin}</span> erlauben, um den OAuth-Popup-Login für OneDrive ohne Blockade auszuführen.</li>
                          </ul>
                        </div>

                        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60 space-y-1.5">
                          <h6 className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                            <span className="text-indigo-600">3.</span> App Protection Policies (MAM / Bedingter Zugriff)
                          </h6>
                          <p className="text-[11px]">
                            Aktivieren Sie Intune App Protection (MAM) für Safari/Edge, um sicherzustellen, dass OneDrive-Sicherungsdateien nur innerhalb des gesicherten M365-Unternehmenskontexts verarbeitet werden.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: DSGVO & Datenschutz */}
                  {activeAdminTab === 'dsgvo' && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100 space-y-1">
                        <h5 className="font-black text-emerald-950 text-[0.75rem] flex items-center gap-1.5">
                          <span>🛡️</span>
                          <span>Datenschutz & Schul-DSGVO Handreichung</span>
                        </h5>
                        <p className="text-slate-600 font-medium text-[11px]">
                          Informationen für den schulischen Datenschutzbeauftragten (DSB) und den Schulträger bezüglich der Sicherung von Klassen- und Notendaten.
                        </p>
                      </div>

                      <div className="space-y-2.5 text-slate-600 font-medium text-[11px]">
                        <div className="flex gap-2 items-start">
                          <span className="text-emerald-600 font-bold shrink-0">✓</span>
                          <div>
                            <strong className="text-slate-800">Clientseitige Inhaltsverschlüsselung:</strong> Klassio verschlüsselt den App-Datenbestand bereits im Browser. Der Upload enthält damit nur den verschlüsselten Backup-Inhalt. Die konkrete Microsoft-365- und Hosting-Konfiguration muss die Schule separat prüfen.
                          </div>
                        </div>

                        <div className="flex gap-2 items-start">
                          <span className="text-emerald-600 font-bold shrink-0">✓</span>
                          <div>
                            <strong className="text-slate-800">Transport & OneDrive:</strong> Der Produktivbetrieb muss per HTTPS erfolgen. TLS-Version, OneDrive-Speicherschutz und vertragliche Datenschutzbedingungen werden durch Hosting und den jeweiligen Microsoft-365-Tenant bestimmt und sind durch die Schule bzw. den Datenschutzbeauftragten zu verifizieren.
                          </div>
                        </div>

                        <div className="flex gap-2 items-start">
                          <span className="text-emerald-600 font-bold shrink-0">✓</span>
                          <div>
                            <strong className="text-slate-800">Zugriffskontrolle:</strong> Der Zugriff erfolgt über das verbundene Microsoft-Konto. MFA und Conditional Access gelten nur, wenn sie im schulischen Entra-ID-Tenant tatsächlich konfiguriert und durchgesetzt werden.
                          </div>
                        </div>

                        <div className="flex gap-2 items-start">
                          <span className="text-emerald-600 font-bold shrink-0">✓</span>
                          <div>
                            <strong className="text-slate-800">Löschkonzept:</strong> Der Klassio-Werksreset löscht ausschließlich die lokalen App-Daten dieses Browsers. Eine vorhandene Cloud-Sicherung muss separat im verbundenen OneDrive gelöscht werden.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        ) : !isOneDriveConnected ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <div className="bg-sky-50 text-sky-600 p-4 rounded-full">
              <Cloud size={32} className="animate-pulse" />
            </div>
            <div className="max-w-md space-y-1">
              <p className="font-black text-slate-900 text-sm">Kein OneDrive-Konto verbunden</p>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Verbinden Sie diese Anwendung mit Ihrem OneDrive-Konto. Anschließend können Sie den Datenbestand in OneDrive sichern oder daraus wiederherstellen.
              </p>
            </div>
            <button
              onClick={handleConnect}
              className="px-6 h-12 bg-[#0078d4] hover:bg-[#005a9e] text-white rounded-2xl font-black text-[0.6875rem] uppercase tracking-wider shadow-lg shadow-sky-500/10 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Cloud className="w-4 h-4" />
              Mit OneDrive verbinden
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* OneDrive Cloud Status Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-sky-50/50 p-4 rounded-2xl border border-sky-100 flex items-center gap-3">
                <CheckCircle2 className="text-sky-600 shrink-0" size={18} />
                <div>
                  <p className="text-[0.5625rem] font-black uppercase tracking-wider text-sky-700 leading-none">Verbindungs-Status</p>
                  <p className="text-[0.75rem] font-bold text-slate-800 mt-1">Erfolgreich autorisiert</p>
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-2xl border border-stone-150 flex items-center gap-3">
                <FileJson className="text-slate-500 shrink-0" size={18} />
                <div>
                  <p className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-500 leading-none">Datei auf OneDrive</p>
                  {cloudBackupMetadata === null ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Loader2 size={12} className="animate-spin text-slate-400" />
                      <p className="text-[0.75rem] text-slate-500 font-medium">Prüfe Cloud-Datei...</p>
                    </div>
                  ) : cloudBackupMetadata.exists ? (
                    <p className="text-[0.75rem] font-bold text-slate-800 mt-1">
                      {cloudBackupMetadata.fileName || ONEDRIVE_BACKUP_PRIMARY_NAME} · {new Date(cloudBackupMetadata.lastModifiedDateTime).toLocaleString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  ) : (
                    <p className="text-[0.75rem] font-bold text-rose-600 mt-1">Keine Cloud-Sicherung vorhanden</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sync Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleUploadToOneDrive}
                disabled={isSyncing}
                className={`flex-1 h-14 rounded-2xl font-black text-[0.6875rem] uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-lg transition-all duration-200 cursor-pointer ${
                  syncStatus === 'uploading'
                    ? 'bg-sky-100 text-sky-800 shadow-none cursor-wait'
                    : 'bg-[#0078d4] hover:bg-[#005a9e] text-white hover:shadow-sky-500/10 active:scale-95'
                }`}
              >
                {syncStatus === 'uploading' ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-sky-800" />
                    <span>In Cloud sichern...</span>
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    <span>Backup in OneDrive sichern</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadFromOneDrive}
                disabled={isSyncing || (cloudBackupMetadata && !cloudBackupMetadata.exists)}
                className={`flex-1 h-14 rounded-2xl font-black text-[0.6875rem] uppercase tracking-wider flex items-center justify-center gap-2.5 border transition-all duration-200 cursor-pointer ${
                  syncStatus === 'downloading'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200 shadow-none cursor-wait'
                    : cloudBackupMetadata && !cloudBackupMetadata.exists
                    ? 'bg-slate-50 text-slate-350 border-stone-200 cursor-not-allowed'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-stone-250 hover:border-stone-300 active:scale-95'
                }`}
              >
                {syncStatus === 'downloading' ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-emerald-800" />
                    <span>Aus Cloud laden...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>Backup von OneDrive laden</span>
                  </>
                )}
              </button>
            </div>

            {/* Sync Feedbacks (Success/Error) */}
            {syncStatus === 'success' && (
              <div className="bg-emerald-50 border border-emerald-200/60 p-3 rounded-xl flex items-center gap-2 text-emerald-800 text-[0.75rem] font-bold animate-fadeIn">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>Synchronisation erfolgreich durchgeführt!</span>
              </div>
            )}

            {syncError && (
              <div className="bg-rose-50 border border-rose-200/60 p-3 rounded-xl flex items-center gap-2 text-rose-800 text-[0.75rem] font-bold animate-fadeIn">
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                <span>Fehler: {syncError}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Visual storage-use check block */}
      <div className="order-2 bg-white p-5 rounded-3xl border border-stone-200/60 shadow-sm space-y-3 shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Database size={16} className={`${percentage > 80 ? 'text-rose-550 animate-bounce' : 'text-blue-500'}`} />
            <span className="text-[0.75rem] leading-tight font-black text-slate-705 uppercase tracking-widest leading-none">Lokale Speicherbelegung (grobe Schätzung)</span>
          </div>
          <span className="text-[0.75rem] leading-tight font-black text-slate-800 tracking-tight">
            {quotaMB !== null ? `${usedMB} MB von ca. ${quotaMB} MB (${percentage.toFixed(1)}%)` : 'Speicherquote nicht verfügbar'}
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 ">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${percentage > 85 ? 'bg-rose-500' : percentage > 60 ? 'bg-amber-500' : 'bg-blue-600'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {percentage > 85 && (
          <div className="flex items-start gap-2 text-[0.65625rem] font-bold text-rose-600 tracking-tight leading-normal">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>Die vom Browser gemeldete Speicherquote ist fast erreicht. Laden Sie vorsorglich eine Sicherung herunter und prüfen Sie nicht mehr benötigte lokale Inhalte.</span>
          </div>
        )}
      </div>

      {/* Main Action Boxes */}
      <div className="order-1 grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Export Card */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200/60 shadow-sm space-y-5 flex flex-col justify-between relative group">
          <div className="space-y-6">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-105 duration-300">
              <Download size={28} />
            </div>
            <div className="space-y-2">
              <h3 className="text-[1.25rem] leading-normal font-black text-slate-900 leading-none">Backup herunterladen</h3>
              <p className="text-[0.8125rem] text-slate-500 font-medium leading-relaxed">
                Laden Sie Schülerdaten, Noten, Sitzpläne und Einstellungen als JSON-Datensicherung herunter. Bewahren Sie die Datei geschützt auf.
              </p>
            </div>
          </div>
          
          <div className="pt-6">
            <button 
              type="button"
              onClick={handleExport}
              disabled={backupStatus === 'exporting' || importStatus === 'importing'}
              className={`w-full h-14 rounded-2xl font-black text-[0.6875rem] uppercase tracking-wider flex items-center justify-center gap-3 shadow-lg transition-all duration-200 cursor-pointer ${
                backupStatus === 'exporting' 
                  ? 'bg-blue-150 text-blue-800 shadow-none cursor-wait' 
                  : backupStatus === 'success'
                  ? 'bg-emerald-600 text-white shadow-emerald-900/10'
                  : 'bg-blue-600 hover:bg-blue-700 text-white hover:translate-y-[-1px] hover:shadow-blue-500/15 active:scale-95'
              }`}
            >
              {backupStatus === 'exporting' && (
                <>
                  <Loader2 size={16} className="animate-spin text-blue-800" />
                  <span>Sammle Daten...</span>
                </>
              )}
              {backupStatus === 'success' && (
                <>
                  <CheckCircle2 size={16} className="text-white animate-bounce" />
                  <span>Backup heruntergeladen</span>
                </>
              )}
              {backupStatus === 'idle' && (
                <>
                  <Download size={16} />
                  <span>Lokales Backup generieren</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Import Card */}
        <div 
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`bg-white p-6 rounded-3xl border transition-all duration-300 space-y-5 flex flex-col justify-between relative group ${
            isDragging 
              ? 'border-emerald-500 ring-4 ring-emerald-500/10 bg-emerald-50/10' 
              : 'border-stone-200/60 shadow-xl shadow-slate-900/[0.02]'
          }`}
        >
          {isDragging && (
            <div className="absolute inset-0 bg-emerald-50/95 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="bg-white p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce border border-emerald-100">
                 <Upload size={22} className="text-emerald-600" />
                 <span className="font-black text-[0.6875rem] uppercase tracking-wider text-emerald-800">Sicherungsdatei jetzt loslassen</span>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-105 duration-300">
              <Upload size={28} />
            </div>
            <div className="space-y-2">
              <h3 className="text-[1.25rem] leading-normal font-black text-slate-900 leading-none">Backup einspielen</h3>
              <p className="text-[0.8125rem] text-slate-500 font-medium leading-relaxed">
                Wählen Sie eine zuvor erstellte JSON-Datei aus. Vor dem vollständigen Ersetzen des aktuellen lokalen Datenbestands wird nochmals nachgefragt.
              </p>
            </div>
          </div>

          <div className="pt-6">
            <input 
              type="file" 
              aria-label="Klassio-Sicherungsdatei auswählen (.json / Legacy .lehrerapp)"
              ref={fileInputRef} 
              onChange={importData} 
              accept=".json,.js,.lehrerapp,.lehrerapp-backup,application/json,text/javascript,text/plain"
              className="hidden" 
            />
            <button 
              type="button"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                  fileInputRef.current.click();
                }
              }}
              disabled={backupStatus === 'exporting' || importStatus === 'importing'}
              className={`w-full h-14 rounded-2xl font-black text-[0.6875rem] uppercase tracking-wider flex items-center justify-center gap-3 shadow-lg transition-all duration-200 cursor-pointer ${
                importStatus === 'importing' 
                  ? 'bg-emerald-100 text-emerald-800 shadow-none cursor-wait' 
                  : importStatus === 'success'
                  ? 'bg-emerald-600 text-white shadow-emerald-500/10'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:translate-y-[-1px] hover:shadow-emerald-500/15 active:scale-95'
              }`}
            >
              {importStatus === 'importing' && (
                <>
                  <Loader2 size={16} className="animate-spin text-emerald-850" />
                  <span>Validierung läuft...</span>
                </>
              )}
              {importStatus === 'success' && (
                <>
                  <CheckCircle2 size={16} className="text-white animate-bounce" />
                  <span>Erfolgreich eingespielt!</span>
                </>
              )}
              {importStatus === 'idle' && (
                <>
                  <FileJson size={16} />
                  <span>Backup hochladen</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Class retirement & Safety Actions */}
      <h3 className="order-4 text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-2 mt-4">Schuljahres-Wechsel & Reset</h3>
      
      <div className="order-5 grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Archive Action */}
        <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-200/50 flex flex-col justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-[0.875rem] font-black text-indigo-950 flex items-center gap-1.5">
              <Archive size={16} className="text-indigo-600 shrink-0" />
              Klasse stilllegen
            </h4>
            <p className="text-[0.75rem] text-indigo-800 font-medium leading-relaxed">
              Entfernt die aktuelle Klasse aus der aktiven Klassenliste, bewahrt sie aber vollständig zur späteren Wiederherstellung. Jahresarchivstände werden separat im Bereich „Archiv“ erstellt.
            </p>
          </div>
          <button 
            onClick={handleRetireActiveClass}
            className="px-6 h-12 bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white border border-indigo-200 hover:border-indigo-600 transition-all duration-200 rounded-2xl font-black text-[0.625rem] uppercase tracking-widest flex items-center gap-2 group cursor-pointer hover:shadow-lg hover:shadow-indigo-500/15 active:scale-95"
          >
            <Archive size={16} className="group-hover:-translate-y-1 transition-transform" />
            Aktive Klasse stilllegen
          </button>
        </div>

        {/* Reset Action */}
        <div className="bg-rose-50/50 p-6 rounded-3xl border border-rose-200/50 flex flex-col justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-[0.875rem] font-black text-rose-950 flex items-center gap-1.5">
              <AlertTriangle size={16} className="text-rose-600 shrink-0" />
              Vollständiger Werksreset
            </h4>
            <p className="text-[0.75rem] text-rose-800 font-medium leading-relaxed">
              Löscht alle Schülerdaten, Notizen und Einstellungen restlos aus dem Browser.
            </p>
          </div>
          <button 
            onClick={() => {
              setDeleteConfirmText('');
              setDeleteModalOpen(true);
            }}
            className="px-6 h-12 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 transition-all duration-200 rounded-2xl font-black text-[0.625rem] uppercase tracking-widest flex items-center gap-2 group cursor-pointer hover:shadow-lg hover:shadow-rose-500/15 active:scale-95"
          >
            <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
            Alle lokalen Daten löschen
          </button>
        </div>
      </div>


      {/* Stillgelegte, wiederherstellbare Klassen */}
      {app.retiredClasses && app.retiredClasses.length > 0 && (
        <div className="order-6 mt-4 mb-4">
          <h3 className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-2 mb-4">Stillgelegte Klassen</h3>
          <div className="space-y-3">
            {app.retiredClasses.map((ac: any) => (
              <div key={ac.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/50 flex items-center justify-between">
                <div>
                  <h4 className="text-[0.875rem] font-black text-slate-900">{ac.name}</h4>
                  <p className="text-[0.75rem] font-medium text-slate-500">{(ac.schueler || []).length} Schüler • Stufe {ac.stufe}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" aria-label={`${ac.name} wiederherstellen`} onClick={() => handleRestoreRetiredClass(ac.id)} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg text-[0.6875rem] font-black uppercase tracking-wider transition-all">
                    Wiederherstellen
                  </button>
                  <button type="button" aria-label={`${ac.name} unwiderruflich löschen`} onClick={() => handleDeleteRetiredClass(ac.id)} className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg text-[0.6875rem] font-black uppercase tracking-wider transition-all">
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Boxes */}
      <div className="order-7 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-50 p-5 rounded-3xl border border-stone-200/40 flex gap-3.5">
          <div className="shrink-0 text-slate-400 mt-1"><Shield size={18} /></div>
          <div>
            <h4 className="text-[0.625rem] font-black uppercase tracking-widest text-slate-900 mb-1">Lokale Exportdatei</h4>
            <p className="text-[0.75rem] text-slate-500 font-medium leading-relaxed">Der manuelle JSON-Export wird im Browser erstellt und heruntergeladen. Cloud-Sicherungen werden dagegen über den Anwendungsdienst an den gewählten Anbieter übertragen.</p>
          </div>
        </div>
        <div className="bg-slate-50 p-5 rounded-3xl border border-stone-200/40 flex gap-3.5">
          <div className="shrink-0 text-slate-400 mt-1"><Monitor size={18} /></div>
          <div>
            <h4 className="text-[0.625rem] font-black uppercase tracking-widest text-slate-900 mb-1">Geräteübergreifend</h4>
            <p className="text-[0.75rem] text-slate-500 font-medium leading-relaxed">Übertragen Sie Sicherungsdateien nur über freigegebene, geschützte Datenträger oder Schulnetzwerke und löschen Sie unnötige Kopien.</p>
          </div>
        </div>
      </div>

      {/* Safe Warn-Modal zum Löschen von Daten - Absolute highest Z-Index and backdrop-blur-sm */}
      <AnimatePresence>
        {deleteModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Dark background with blur effect */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            
            {/* Modal Body */}
            <motion.div 
              role="dialog"
              aria-modal="true"
              aria-labelledby="reset-dialog-title"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] border border-stone-200 shadow-2xl p-8 max-w-md w-full relative z-10 space-y-6"
            >
              <div className="flex items-center gap-4 text-rose-600">
                <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center shadow-inner">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 id="reset-dialog-title" className="text-[1.125rem] leading-normal font-black text-slate-900">Achtung: Datenverlust!</h3>
                  <p className="text-[0.6875rem] text-rose-600 font-extrabold uppercase tracking-widest">Unwiderruflicher Schritt</p>
                </div>
              </div>

              <div className="space-y-2 border-t border-b border-stone-100 py-4">
                <p className="text-[0.8125rem] text-slate-600 font-medium leading-relaxed">
                  Hiermit werden alle Schülerdaten, Leistungsnotizen, Sitzpläne und Einstellungen in diesem Browser gelöscht. Dies lässt sich nicht rückgängig machen.
                </p>
                <p className="text-[0.75rem] text-slate-500 font-bold">
                  Bitte tippen Sie zur Bestätigung <strong className="text-slate-900 font-black">LÖSCHEN</strong> in das Feld:
                </p>
                <input 
                  type="text" 
                  aria-label="Bestätigungstext LÖSCHEN"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Hier Bestätigung eingeben..."
                  className="w-full h-12 px-4 rounded-xl border border-stone-250 bg-stone-50 text-[0.8125rem] font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:bg-white transition-all text-center"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="flex-1 h-12 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-[0.6875rem] uppercase tracking-wider transition-all cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  disabled={deleteConfirmText !== 'LÖSCHEN'}
                  onClick={executeAbsoluteReset}
                  className={`flex-1 h-12 rounded-xl font-black text-[0.6875rem] uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    deleteConfirmText === 'LÖSCHEN'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-900/20 active:scale-95'
                      : 'bg-stone-100 text-stone-300 cursor-not-allowed'
                  }`}
                >
                  <Trash2 size={14} />
                  Zurücksetzen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

  

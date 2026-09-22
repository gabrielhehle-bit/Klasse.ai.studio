import React from 'react';
import { 
  Download, 
  Upload, 
  History, 
  Smartphone, 
  ShieldCheck,
  Lock,
  FileCheck,
  Check
} from 'lucide-react';
import { triggerBackupDownload } from '../../utils/backupUtils';
import { getActiveVaultKey, loadVaultRecord } from '../../lib/vaultStorage';
import { prepareBackupRestore, parseBackupText } from '../../lib/backupRestore';
import { loadPreImportBackup } from '../../lib/secureStorageService';
import { useApp } from '../../context/AppContext';

interface BackupSettingsProps {
  app: any;
  setApp: React.Dispatch<React.SetStateAction<any>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  notfallDate: string | null;
  installPrompt: any;
  isStandalone: boolean;
  triggerInstall: () => void;
}

export default function BackupSettings({
  app,
  setApp,
  showToast,
  notfallDate,
  installPrompt,
  isStandalone,
  triggerInstall
}: BackupSettingsProps) {

  const { restoreAppData, accountSyncStatus, accountSyncLastAt } = useApp();
  const accountSyncHealthy = accountSyncStatus === 'synced';
  const [history, setHistory] = React.useState<Array<{ revision: number; updatedAt: string }>>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [historyError, setHistoryError] = React.useState<string | null>(null);

  const refreshHistory = async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await fetch('/api/account-sync/history', { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) throw new Error(response.status === 401 || response.status === 403
        ? 'Bitte zuerst mit deinem E-Mail-Konto anmelden.'
        : 'Frühere Kontostände konnten nicht geladen werden.');
      const data = await response.json();
      setHistory(Array.isArray(data.history) ? data.history : []);
    } catch (error: any) {
      setHistoryError(error?.message || 'Kontostände konnten nicht geladen werden.');
    } finally {
      setHistoryLoading(false);
    }
  };

  React.useEffect(() => { void refreshHistory(); }, []);

  /** Export only: no background restore and no write to the active account. */
  const downloadHistoricalRevision = async (revision: number) => {
    try {
      const response = await fetch('/api/account-sync/history/' + revision, {
        credentials: 'same-origin', cache: 'no-store',
      });
      if (!response.ok) throw new Error('Diese ältere Sicherung konnte nicht geladen werden.');
      const data = await response.json();
      const snapshot = data?.snapshot;
      const localVault = await loadVaultRecord();
      if (!snapshot?.encryptedState || !snapshot?.vaultRecord || !localVault
        || snapshot.vaultRecord.id !== localVault.id) {
        throw new Error('Dieser ältere Stand verwendet einen anderen Tresor. Bitte nicht den aktuellen Tresor ersetzen; zur Wiederherstellung ist der ursprüngliche Tresor erforderlich.');
      }
      // Standard encrypted local-state JSON, compatible with the existing
      // backup importer; teachers never download personal data as plaintext.
      const exportRecord = {
        format: 'LehrerAPP_Encrypted_Local_State',
        version: 1,
        savedAt: Date.parse(snapshot.updatedAt) || Date.now(),
        encryptedState: snapshot.encryptedState,
      };
      const url = URL.createObjectURL(new Blob([JSON.stringify(exportRecord)], { type: 'application/json' }));
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = 'klassio-konto-rettung-revision-' + revision + '.json';
        document.body.append(link);
        link.click();
        link.remove();
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
      showToast('Ältere verschlüsselte Sicherung heruntergeladen. Der aktuelle Stand wurde nicht verändert.', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Sicherung konnte nicht heruntergeladen werden.', 'error');
    }
  };

  const restoreInput = async (input: unknown) => {
    const key = getActiveVaultKey();
    if (!key) throw new Error('Bitte zuerst den lokalen Tresor entsperren.');
    const data = await prepareBackupRestore(input, key, () => prompt(
      'Bitte gib das Tresor-Passwort oder den Recovery-Code dieses Backups ein. Dein lokales Tresor-Passwort bleibt unverändert.'
    ));
    if (!data || !confirm('Diese Sicherung ersetzt den aktuellen Datenbestand. Vorher wird eine verschlüsselte Rücksicherung angelegt. Fortfahren?')) return;
    await restoreAppData(data);
    showToast('Sicherung verschlüsselt wiederhergestellt.', 'success');
  };

  const handleExportBackup = async () => {
    try {
      await triggerBackupDownload(app);
      showToast('Verschlüsselte Sicherung (.json) erfolgreich heruntergeladen!', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Fehler beim Exportieren der Sicherung.', 'error');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      fileReader.readAsText(file, "UTF-8");
      fileReader.onload = async (event) => {
        try {
          const parsedData = parseBackupText(String(event.target?.result || ''));
          await restoreInput(parsedData);
        } catch (err: any) {
          showToast(err?.message || 'Fehler beim Einlesen der Datei.', 'error');
        } finally {
          e.target.value = '';
        }
      };
    }
  };

  const handleRestoreNotfall = async () => {
    try {
      const raw = localStorage.getItem('hehle_v3_notfallkopie');
      if (raw) await restoreInput(JSON.parse(raw));
    } catch (err: any) {
      showToast(err?.message || 'Notfallkopie konnte nicht gelesen werden.', 'error');
    }
  };

  const handleUndoImport = async () => {
    try {
      const key = getActiveVaultKey();
      if (!key) throw new Error('Bitte zuerst den lokalen Tresor entsperren.');
      const data = await loadPreImportBackup(key);
      if (!data) { showToast('Keine Sicherung vor einem Import vorhanden.', 'info'); return; }
      await restoreInput(data);
    } catch (err: any) {
      showToast(err?.message || 'Rücksicherung konnte nicht gelesen werden.', 'error');
    }
  };

  const toggleBackupReminders = () => {
    setApp((prev: any) => ({
      ...prev,
      settings: {
        ...prev.settings,
        disableBackupReminders: !prev.settings?.disableBackupReminders
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Primary Export / Import */}
      <div className="bg-white rounded-[2.5rem] border border-stone-200/80 p-6 md:p-8 space-y-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-stone-150 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
            <Download size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Verschlüsselte Datensicherung</h2>
            <p className="text-xs text-slate-500 font-medium">Auch bei aktivem E-Mail-Sync regelmäßig eine zusätzliche verschlüsselte Sicherungsdatei aufbewahren. Sie hilft, falls ein Gerät oder der synchronisierte Kontostand beschädigt wird.</p>
          </div>
        </div>

        {accountSyncHealthy ? (
          <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-emerald-900 text-xs font-semibold leading-relaxed flex items-start gap-2.5">
            <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong>Automatisch synchronisiert:</strong> Dein kompletter KLASSIO-Stand wird mit deinem E-Mail-Konto Ende-zu-Ende-verschlüsselt auf dem Server aktuell gehalten.
              {accountSyncLastAt ? ' Letzte Synchronisierung: ' + new Date(accountSyncLastAt).toLocaleString('de-AT') + '.' : ''}
              {' '}Auf einem neuen PC meldest du dich mit derselben E-Mail an und entsperrst deinen Tresor. Bewahre zusätzlich regelmäßig eine verschlüsselte Sicherungsdatei auf einem getrennten, geschützten Speicherort auf.
            </span>
          </div>
        ) : (
          <div className={`p-4 rounded-2xl border text-xs font-semibold leading-relaxed flex items-start gap-2.5 ${
            accountSyncStatus === 'conflict' || accountSyncStatus === 'error'
              ? 'bg-amber-50/80 border-amber-200 text-amber-900'
              : 'bg-blue-50/80 border-blue-100 text-blue-900'
          }`}>
            <ShieldCheck size={18} className="shrink-0 mt-0.5" />
            <span>
              {accountSyncStatus === 'conflict'
                ? 'Der Konto-Sync wartet wegen unterschiedlicher Stände auf eine sichere Auflösung. Bis dahin empfehlen wir eine zusätzliche verschlüsselte Sicherungsdatei.'
                : accountSyncStatus === 'error'
                  ? 'Der Konto-Sync ist gerade nicht erreichbar. Deine Daten bleiben lokal verschlüsselt gespeichert; eine zusätzliche Sicherungsdatei ist vorübergehend sinnvoll.'
                  : 'Ohne aktiven E-Mail-Konto-Sync bleibt eine regelmäßige verschlüsselte Sicherungsdatei empfohlen.'}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Export Button */}
          <button
            type="button"
            onClick={handleExportBackup}
            className="px-6 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-md active:scale-95"
          >
            <Download size={18} />
            <span>Verschlüsselte Sicherung (.json)</span>
          </button>

          {/* Import Button */}
          <div className="relative">
            <input
              id="backup-file-input-sub"
              type="file"
              accept=".json,.js,.lehrerapp,.lehrerapp-backup,application/json,text/javascript,text/plain"
              onChange={handleImportBackup}
              className="hidden"
            />
            <label
              htmlFor="backup-file-input-sub"
              className="w-full h-full px-6 py-4 bg-white border-2 border-dashed border-stone-300 hover:border-emerald-500 text-slate-700 hover:text-emerald-700 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all cursor-pointer text-center"
            >
              <Upload size={18} />
              <span>Sicherung einlesen (.json / Legacy .lehrerapp)</span>
            </label>
          </div>
        </div>

        {/* Notfallkopie if available */}
        {notfallDate && (
          <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <History size={18} className="text-amber-600" />
              <div>
                <h3 className="text-xs font-black text-slate-900">Automatische Notfallkopie vorhanden</h3>
                <p className="text-[0.6875rem] text-slate-500 font-medium">Letzter automatischer Stand: {notfallDate}</p>
              </div>
            </div>
            <button
              onClick={handleRestoreNotfall}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
            >
              Wiederherstellen
            </button>
          </div>
        )}
      </div>

      {/* Server retains older encrypted revisions separately from the live sync slot.
          Download first; use the normal guarded backup import only if needed. */}
      <div className="bg-white rounded-[2.5rem] border border-stone-200/80 p-6 md:p-8 space-y-4 shadow-sm">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-base font-black text-slate-900">Frühere verschlüsselte Kontostände</h2>
            <p className="text-xs text-slate-600 font-medium mt-1 max-w-2xl">
              KLASSIO bewahrt bei neuen Synchronisierungen ältere verschlüsselte Versionen auf:
              die letzten acht Änderungen und bis zu 30 tägliche Wiederherstellungspunkte.
              Frühere Versionen werden nur angezeigt, soweit sie tatsächlich vorhanden sind.
              Ein Download verändert weder deine aktuelle Klasse noch den Konto-Sync.
            </p>
          </div>
          <button type="button" onClick={() => void refreshHistory()} disabled={historyLoading}
            className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold disabled:opacity-50">
            {historyLoading ? 'Lade …' : 'Sicherungen aktualisieren'}
          </button>
        </div>
        {historyError && <p role="alert" className="text-xs font-semibold text-amber-800">{historyError}</p>}
        {!historyLoading && !historyError && history.length === 0 && (
          <p className="text-xs text-slate-600">Noch keine früheren Kontostände vorhanden. Erstelle vorsorglich eine verschlüsselte Sicherungsdatei.</p>
        )}
        {history.length > 0 && (
          <div className="max-h-72 overflow-y-auto space-y-2">
            {history.map(item => (
              <div key={item.revision} className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 px-4 py-3">
                <div className="text-xs text-slate-700">
                  <strong>Revision {item.revision}</strong>
                  <span className="block text-slate-500">
                    {new Date(item.updatedAt).toLocaleString('de-AT')}
                  </span>
                </div>
                <button type="button" onClick={() => void downloadHistoricalRevision(item.revision)}
                  className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">
                  Verschlüsselt herunterladen
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-amber-800 font-medium">
          Wichtig: Zum Wiederherstellen zuerst auch den aktuellen Stand sichern. Eine ältere
          Version kann neuere Einträge nicht enthalten. Die Wahl einer früheren Sicherung
          erfolgt ausschließlich bewusst über „Sicherung einlesen“.
        </p>
      </div>

      <button onClick={handleUndoImport} className="px-4 py-3 rounded-xl border border-stone-300 text-sm font-bold">
        Stand vor dem letzten Import wiederherstellen
      </button>

      {/* Backup Reminders */}
      <div className="bg-white rounded-[2.5rem] border border-stone-200/80 p-6 md:p-8 space-y-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-black text-slate-900">Erinnerung an zusätzliche Datensicherung</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {accountSyncHealthy
                ? 'Auch bei funktionierendem E-Mail-Sync empfehlen wir regelmäßige zusätzliche verschlüsselte Sicherungsdateien auf einem getrennten Speicherort.'
                : 'Ohne gesunden Konto-Sync kann KLASSIO dich alle 7 Tage dezent an eine zusätzliche Sicherungsdatei erinnern.'}
            </p>
          </div>

          {(
            <button
              type="button"
              role="switch"
              aria-checked={!app.settings?.disableBackupReminders}
              aria-label="Backup-Erinnerungen"
              onClick={toggleBackupReminders}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer shrink-0 ${
                !app.settings?.disableBackupReminders ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                !app.settings?.disableBackupReminders ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          )}
        </div>
      </div>

      {/* PWA App Installation */}
      <div className="bg-white rounded-[2.5rem] border border-stone-200/80 p-6 md:p-8 space-y-4 shadow-sm">
        <div className="flex items-center gap-3 border-b border-stone-150 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
            <Smartphone size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Klassio auf dem Gerät installieren (PWA)</h2>
            <p className="text-xs text-slate-500 font-medium">Nutze die App wie eine native Anwendung ohne Browser-Leiste.</p>
          </div>
        </div>

        {isStandalone ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
            <Check size={16} className="text-emerald-600" />
            <span>✓ Klassio ist bereits als eigenständige App auf diesem Gerät installiert.</span>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Verwende die App auch im Klassenzimmer ohne störende Browser-Bedienelemente im Vollbildmodus.
            </p>

            {installPrompt || (window as any).deferredPrompt ? (
              <button
                type="button"
                onClick={triggerInstall}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
              >
                📲 Jetzt als App auf dem Startbildschirm installieren
              </button>
            ) : (
              <div className="p-4 bg-slate-50 rounded-2xl border border-stone-200 text-xs text-slate-600 space-y-1.5 font-medium">
                <div><strong>iPhone / iPad (Safari):</strong> Tippe unten auf das Teilen-Symbol <span className="font-bold">⎋</span> und dann auf <span className="font-bold">„Zum Home-Bildschirm“</span>.</div>
                <div><strong>Android / Chrome:</strong> Tippe oben rechts auf die drei Punkte <span className="font-bold">⋮</span> und wähle <span className="font-bold">„App installieren“</span>.</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

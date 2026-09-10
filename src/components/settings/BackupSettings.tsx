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
import { getActiveVaultKey } from '../../lib/vaultStorage';
import { prepareBackupRestore } from '../../lib/backupRestore';
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

  const { restoreAppData } = useApp();

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
      showToast('Verschlüsselte Sicherung (.lehrerapp) erfolgreich heruntergeladen!', 'success');
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
          const raw = event.target?.result as string;
          const parsedData = JSON.parse(raw);

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
            <h2 className="text-base font-black text-slate-900">Sicherung erstellen & einlesen</h2>
            <p className="text-xs text-slate-500 font-medium">Lade deinen gesamten App-Stand als Datei herunter oder spiele ein Backup ein.</p>
          </div>
        </div>

        <div className="p-4 bg-blue-50/80 rounded-2xl border border-blue-100 text-blue-900 text-xs font-semibold leading-relaxed flex items-start gap-2.5">
          <ShieldCheck size={18} className="text-blue-600 shrink-0 mt-0.5" />
          <span>
            <strong>Empfehlung für Lehrkräfte:</strong> Lade am Ende jeder Schulwoche eine Sicherungsdatei auf deinen Schul-Computer herunter. So hast du im Notfall immer ein vollständiges Backup parat.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Export Button */}
          <button
            type="button"
            onClick={handleExportBackup}
            className="px-6 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-md active:scale-95"
          >
            <Download size={18} />
            <span>Verschlüsselte Sicherung (.lehrerapp)</span>
          </button>

          {/* Import Button */}
          <div className="relative">
            <input
              id="backup-file-input-sub"
              type="file"
              accept=".lehrerapp,.lehrerapp-backup,.json"
              onChange={handleImportBackup}
              className="hidden"
            />
            <label
              htmlFor="backup-file-input-sub"
              className="w-full h-full px-6 py-4 bg-white border-2 border-dashed border-stone-300 hover:border-emerald-500 text-slate-700 hover:text-emerald-700 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all cursor-pointer text-center"
            >
              <Upload size={18} />
              <span>Sicherung einlesen (.lehrerapp / .json)</span>
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

      <button onClick={handleUndoImport} className="px-4 py-3 rounded-xl border border-stone-300 text-sm font-bold">
        Stand vor dem letzten Import wiederherstellen
      </button>

      {/* Backup Reminders */}
      <div className="bg-white rounded-[2.5rem] border border-stone-200/80 p-6 md:p-8 space-y-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-black text-slate-900">Automatische Backup-Erinnerungen</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Erinnert dich alle 7 Tage dezent daran, eine Sicherungsdatei herunterzuladen.
            </p>
          </div>

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
        </div>
      </div>

      {/* PWA App Installation */}
      <div className="bg-white rounded-[2.5rem] border border-stone-200/80 p-6 md:p-8 space-y-4 shadow-sm">
        <div className="flex items-center gap-3 border-b border-stone-150 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
            <Smartphone size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">LehrerAPP auf dem Gerät installieren (PWA)</h2>
            <p className="text-xs text-slate-500 font-medium">Nutze die App wie eine native Anwendung ohne Browser-Leiste.</p>
          </div>
        </div>

        {isStandalone ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
            <Check size={16} className="text-emerald-600" />
            <span>✓ Die LehrerAPP ist bereits als eigenständige App auf diesem Gerät installiert.</span>
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

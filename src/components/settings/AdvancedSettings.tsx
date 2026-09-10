import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Shield, 
  ShieldCheck,
  Clock,
  Cpu, 
  Trash2, 
  AlertTriangle, 
  History, 
  RefreshCw, 
  Check, 
  X, 
  Database,
  Lock,
  LogOut,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdvancedSettingsProps {
  app: any;
  setApp: React.Dispatch<React.SetStateAction<any>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  einfachModus: boolean;
  speicherInfo: any;
  refreshSpeicher: () => void;
  hatBeispieldaten: boolean;
  removeDemoDataAction: () => void;
  openDeleteModal: (type: 'all' | 'history') => void;
  onOpenDeleteClassModal?: () => void;
}

export default function AdvancedSettings({
  app,
  setApp,
  showToast,
  einfachModus,
  speicherInfo,
  refreshSpeicher,
  hatBeispieldaten,
  removeDemoDataAction,
  openDeleteModal,
  onOpenDeleteClassModal
}: AdvancedSettingsProps) {
  const { isVaultUnlocked, lockAppVault } = useApp();
  const [isChecking, setIsChecking] = useState(false);
  const [checkResults, setCheckResults] = useState<{ id: string; label: string; status: 'ok' | 'warn' | 'error'; info: string }[] | null>(null);

  const runSystemCheck = async () => {
    setIsChecking(true);
    const results: { id: string; label: string; status: 'ok' | 'warn' | 'error'; info: string }[] = [];

    // 1. Storage Check
    try {
      if (speicherInfo) {
        if (speicherInfo.localStorageBytes > 4 * 1024 * 1024) {
          results.push({ id: 'storage', label: 'Schnellspeicher (localStorage)', status: 'warn', info: 'Fast voll (> 4 MB)' });
        } else {
          results.push({ id: 'storage', label: 'Schnellspeicher (localStorage)', status: 'ok', info: `${(speicherInfo.localStorageBytes / 1024).toFixed(0)} KB belegt` });
        }
      }
    } catch (e) {
      results.push({ id: 'storage', label: 'Schnellspeicher', status: 'error', info: 'Fehler beim Lesen' });
    }

    // 2. Data Integrity Check
    const schuelerAnzahl = app.schueler?.length || 0;
    results.push({ id: 'schueler', label: 'Schülerdatenbank', status: 'ok', info: `${schuelerAnzahl} Schüler:innen geladen` });

    // 3. Network Check
    if (navigator.onLine) {
      results.push({ id: 'network', label: 'Netzwerk-Status', status: 'ok', info: 'Online' });
    } else {
      results.push({ id: 'network', label: 'Netzwerk-Status', status: 'warn', info: 'Offline (Lokal voll einsatzbereit)' });
    }

    setCheckResults(results);
    setIsChecking(false);
    showToast('System-Check erfolgreich ausgeführt.', 'success');
  };

  const handleClearAICache = () => {
    setApp((prev: any) => {
      const newState = { ...prev };
      Object.keys(newState).forEach(key => {
        if (key.startsWith('ki_portfolio_summary_') || key.startsWith('ai_parent_report_') || key.startsWith('dashboard_insight')) {
          delete (newState as any)[key];
        }
      });
      return newState;
    });
    showToast('KI-Zwischenspeicher wurde erfolgreich geleert.', 'success');
  };

  return (
    <div className="space-y-8">
      {/* Datenschutz & Pseudonymisierung */}
      <div className="bg-white rounded-[2.5rem] border border-stone-200/80 p-6 md:p-8 space-y-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-stone-150 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
            <Lock size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Datenschutz & Anonymisierung</h2>
            <p className="text-xs text-slate-500 font-medium">Automatische Pseudonymisierung von Schülernamen bei KI-Anfragen.</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 p-4 bg-purple-50/50 border border-purple-100 rounded-2xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black text-slate-900">Schülernamen-Anonymisierung</h3>
              {app.pseudonymisierungAktiv !== false ? (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[0.625rem] font-bold rounded-md">Aktiv (Empfohlen)</span>
              ) : (
                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[0.625rem] font-bold rounded-md">Inaktiv</span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Ersetzt echte Namen durch Platzhalter (z.B. „Schüler A“), bevor Texte an den KI-Assistenten übermittelt werden.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={app.pseudonymisierungAktiv !== false}
            aria-label="Pseudonymisierung für KI-Anfragen"
            onClick={() => setApp((prev: any) => ({
              ...prev,
              pseudonymisierungAktiv: prev.pseudonymisierungAktiv === false ? true : false
            }))}
            className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer shrink-0 ${
              app.pseudonymisierungAktiv !== false ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
              app.pseudonymisierungAktiv !== false ? 'translate-x-6' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Datentresor-Sitzung & Inaktivitätssperre */}
        <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black text-slate-900">Datentresor-Sitzung & Inaktivitätssperre</h3>
                {isVaultUnlocked ? (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[0.625rem] font-bold rounded-md flex items-center gap-1">
                    <ShieldCheck size={11} /> Entsperrt (RAM aktiv)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[0.625rem] font-bold rounded-md">
                    Gesperrt
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Der Tresor wird einmal pro Sitzung entsperrt. Der Schlüssel verbleibt ausschließlich im flüchtigen RAM und wird niemals im Klartext gespeichert.
              </p>
            </div>

            {isVaultUnlocked && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Möchtest du den Datentresor jetzt sofort sperren? Der Schlüssel wird rückstandslos aus dem RAM entfernt.")) {
                    lockAppVault();
                    showToast("Datentresor gesperrt (RAM geleert).", "info");
                  }
                }}
                className="px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white font-black text-xs rounded-xl transition-all cursor-pointer shadow-sm shrink-0 flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Lock size={13} />
                <span>Tresor jetzt sperren</span>
              </button>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Clock size={14} className="text-indigo-600 shrink-0" />
              <span>Tresor automatisch sperren nach:</span>
            </div>
            <select
              value={app.settings?.vaultAutoLockMinutes ?? 60}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setApp((prev: any) => ({
                  ...prev,
                  settings: {
                    ...(prev.settings || {}),
                    vaultAutoLockMinutes: val
                  }
                }));
                showToast(`Automatische Sperre auf ${val === 0 ? 'Erst beim Schließen der App' : val + ' Minuten'} gesetzt.`, 'success');
              }}
              className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer"
            >
              <option value={15}>15 Minuten Inaktivität</option>
              <option value={30}>30 Minuten Inaktivität</option>
              <option value={60}>60 Minuten Inaktivität (Standard)</option>
              <option value={120}>120 Minuten Inaktivität</option>
              <option value={0}>Erst beim Schließen der App</option>
            </select>
          </div>
        </div>

        {/* Zugangssitzung entfernen */}
        <div className="flex items-center justify-between gap-4 p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl">
          <div className="space-y-1">
            <h3 className="text-xs font-black text-slate-900">Zugangs-Sitzung</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Meldet dieses Gerät ab und erfordert zur erneuten Nutzung die Eingabe des Zugangscodes. Deine lokalen Schülerdaten bleiben dabei unverändert erhalten.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (window.confirm("Möchtest du den Zugang auf diesem Gerät wirklich entfernen? Deine lokalen Daten bleiben vollständig erhalten.")) {
                window.dispatchEvent(new CustomEvent('lehrerapp-logout'));
              }
            }}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm shrink-0 flex items-center gap-2"
          >
            <LogOut size={15} />
            <span>Zugang auf diesem Gerät entfernen</span>
          </button>
        </div>
      </div>

      {/* Systempflege & Check */}
      <div className="bg-white rounded-[2.5rem] border border-stone-200/80 p-6 md:p-8 space-y-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-stone-150 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
            <Cpu size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Systempflege & Diagnose</h2>
            <p className="text-xs text-slate-500 font-medium">Prüfe die Funktionsfähigkeit und bereinige den Speicher.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            onClick={runSystemCheck}
            disabled={isChecking}
            className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
          >
            {isChecking ? <RefreshCw size={16} className="animate-spin" /> : <Cpu size={16} />}
            <span>System-Check ausführen</span>
          </button>

          <button
            type="button"
            onClick={handleClearAICache}
            className="flex-1 h-12 bg-white border border-stone-200 hover:border-indigo-300 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Trash2 size={16} />
            <span>KI-Cache leeren</span>
          </button>
        </div>

        {/* System Check Results */}
        {checkResults && (
          <div className="space-y-3 pt-4 border-t border-stone-150">
            <h3 className="text-xs font-black uppercase text-slate-700">Testergebnisse</h3>
            <div className="grid grid-cols-1 gap-2">
              {checkResults.map(res => (
                <div key={res.id} className="p-3 rounded-xl bg-slate-50 border border-stone-200/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white ${
                      res.status === 'ok' ? 'bg-emerald-500' : res.status === 'warn' ? 'bg-amber-500' : 'bg-rose-500'
                    }`}>
                      {res.status === 'ok' ? <Check size={12} /> : <AlertTriangle size={12} />}
                    </div>
                    <span className="text-xs font-bold text-slate-800">{res.label}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-600">{res.info}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Technical Storage Breakdown (Only if Einfachmodus is OFF) */}
        {!einfachModus && speicherInfo && (
          <div className="pt-4 border-t border-stone-150 space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-700">Speicherbelegung (Technisch)</h3>
            <div className="p-4 bg-slate-50 rounded-2xl border border-stone-200 space-y-2 text-xs">
              <div className="flex justify-between font-bold text-slate-700">
                <span>localStorage Belegung:</span>
                <span>{(speicherInfo.localStorageBytes / (1024 * 1024)).toFixed(2)} MB / 5.0 MB</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full transition-all" 
                  style={{ width: `${Math.min(100, (speicherInfo.localStorageBytes / (5 * 1024 * 1024)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Gefahrenbereich (DANGER ZONE) */}
      <div className="bg-white rounded-[2.5rem] border-2 border-rose-200/80 p-6 md:p-8 space-y-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-rose-150 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-rose-950">Gefahrenbereich</h2>
            <p className="text-xs text-rose-700 font-medium">Aktionen mit starker Auswirkung oder Datenlöschung.</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Aktuelle Klasse löschen */}
          <div id="advanced-settings-delete-class" className="p-4 bg-rose-50/50 rounded-2xl border border-rose-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black text-rose-950">
                  Aktuelle Klasse löschen ({app.stufe ? `${app.stufe}. Klasse ` : ''}{app.klassenbezeichnung || 'Ohne Namen'})
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-white border border-rose-200 text-rose-800 text-[0.625rem] font-bold">
                  {app.schueler?.length || 0} Kinder
                </span>
              </div>
              <p className="text-[0.6875rem] text-rose-700 font-medium">
                Entfernt ausschließlich die aktuell ausgewählte Klasse mit allen zugeordneten Schüler:innen, Noten, Plänen und Notizen.
              </p>
            </div>
            <button
              id="btn-delete-class-advanced"
              type="button"
              onClick={onOpenDeleteClassModal}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm shrink-0 flex items-center gap-2"
            >
              <Trash2 size={13} />
              <span>Klasse löschen</span>
            </button>
          </div>

          {/* Beispieldaten entfernen if present */}
          {hatBeispieldaten && (
            <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-200/80 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-black text-rose-950">Beispieldaten entfernen</h3>
                <p className="text-[0.6875rem] text-rose-700 font-medium">Löscht alle vorbereiteten Test-Schüler und Demo-Einträge.</p>
              </div>
              <button
                type="button"
                onClick={removeDemoDataAction}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Beispieldaten löschen
              </button>
            </div>
          )}

          {/* Verlauf leeren */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-black text-slate-900">Icon- & Verhaltensverlauf leeren</h3>
              <p className="text-[0.6875rem] text-slate-500 font-medium">Löscht gesammelte Symbole & Tageshistorien, Schüler bleiben erhalten.</p>
            </div>
            <button
              type="button"
              onClick={() => openDeleteModal('history')}
              className="px-4 py-2 bg-white border border-stone-300 hover:bg-slate-900 hover:text-white text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs"
            >
              Verlauf leeren
            </button>
          </div>

          {/* Rest database */}
          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-black text-rose-950">Alle Daten löschen (Werkseinstellung)</h3>
              <p className="text-[0.6875rem] text-rose-700 font-medium">Setzt die gesamte App vollständig zurück. Alle Daten werden gelöscht.</p>
            </div>
            <button
              type="button"
              onClick={() => openDeleteModal('all')}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
            >
              App zurücksetzen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
